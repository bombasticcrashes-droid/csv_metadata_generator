/**
 * Gemini API client
 * Handles communication with Google's Gemini API for image analysis
 */
import { GEMINI_CONFIG } from '@/app/constants';
import type { GeminiResponse } from '@/app/types';
import { generateAdobeStockPrompt, generateUserPrompt } from '@/app/prompts/adobe-stock-prompt';
import { getMimeTypeFromDataUrl } from './image-utils';

export interface GeminiApiError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Call Gemini API to generate metadata for an image
 * @param apiKey - Gemini API key
 * @param imageBase64 - Base64-encoded image (with or without data URL prefix)
 * @param model - Optional model name (if not provided, will be resolved dynamically)
 * @returns Promise that resolves to GeminiResponse
 */
export async function generateMetadata(
  apiKey: string,
  imageBase64: string,
  model?: string
): Promise<GeminiResponse> {
  // Extract base64 string if it's a data URL
  const base64String = imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64;

  // Get MIME type from data URL or default to jpeg
  const mimeType = imageBase64.includes('data:')
    ? getMimeTypeFromDataUrl(imageBase64)
    : 'image/jpeg';

  // Resolve model if not provided
  let modelName = model;
  let apiVersion: 'v1' | 'v1beta' = 'v1beta';

  if (!modelName) {
    const { getOrResolveModel } = await import('./model-resolver');
    const modelResult = await getOrResolveModel(apiKey.trim());
    modelName = modelResult.modelName;
    apiVersion = modelResult.apiVersion;
  }

  // Build the API URL with resolved model and API version
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

  // Prepare the request payload
  const systemPrompt = generateAdobeStockPrompt();
  const userPrompt = generateUserPrompt(mimeType);

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `${systemPrompt}\n\n${userPrompt}`,
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64String,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  };

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      GEMINI_CONFIG.REQUEST_TIMEOUT_MS
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle 429 (Rate Limit / Quota Exceeded) errors specifically
      if (response.status === 429) {
        const errorMessage = errorData.error?.message || 'Rate limit exceeded';
        const retryDelay = errorData.error?.details?.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo')?.retryDelay;
        const quotaInfo = errorData.error?.details?.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure');

        let detailedMessage = errorMessage;

        if (quotaInfo?.violations?.[0]) {
          const violation = quotaInfo.violations[0];
          const limit = violation.quotaValue;
          const metric = violation.quotaMetric?.includes('free_tier') ? 'Free tier daily limit' : 'Quota limit';
          detailedMessage = `${errorMessage}\n\n${metric}: ${limit} requests per day. Please check your plan and billing details at https://ai.dev/usage?tab=rate-limit`;
        }

        if (retryDelay) {
          const seconds = Math.ceil(parseInt(retryDelay) / 1000) || 45;
          detailedMessage += `\n\nPlease retry in ${seconds} seconds.`;
        }

        const quotaError: GeminiApiError = {
          message: detailedMessage,
          code: 'QUOTA_EXCEEDED',
          status: 429,
        };
        throw quotaError;
      }

      const errorMessage = errorData.error?.message || `API request failed with status ${response.status}`;
      const apiError: GeminiApiError = {
        message: errorMessage,
        code: errorData.error?.code,
        status: response.status,
      };
      throw apiError;
    }

    const data = await response.json();

    // Extract the JSON response from Gemini
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini API');
    }

    const content = data.candidates[0].content.parts[0].text;

    if (!content) {
      throw new Error('No content in Gemini API response');
    }

    // Parse the JSON response
    // Remove any markdown code fences if present
    const cleanedContent = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsedResponse: GeminiResponse;

    try {
      parsedResponse = JSON.parse(cleanedContent);
    } catch (parseError) {
      throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate response structure
    if (!parsedResponse.title || !parsedResponse.description || !Array.isArray(parsedResponse.keywords)) {
      throw new Error('Invalid response structure: missing title, description, or keywords array');
    }

    return parsedResponse;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${GEMINI_CONFIG.REQUEST_TIMEOUT_MS}ms`);
      }
      throw error;
    }
    throw new Error('Unknown error occurred while calling Gemini API');
  }
}

/**
 * Test if an API key is valid by discovering available models
 * @param apiKey - Gemini API key to test
 * @returns Promise that resolves to true if key is valid
 */
export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const { getOrResolveModel } = await import('./model-resolver');
    const modelResult = await getOrResolveModel(apiKey.trim());

    const apiVersion = modelResult.apiVersion;
    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelResult.modelName}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Say "test"',
          }],
        }],
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

