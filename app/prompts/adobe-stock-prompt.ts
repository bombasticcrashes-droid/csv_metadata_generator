/**
 * Adobe Stock metadata generation prompt template
 * Designed to generate stock-ready titles, descriptions, and keywords
 */
import { ADOBE_STOCK_RULES } from '@/app/constants';

/**
 * Generate the system prompt for Adobe Stock metadata generation
 * This prompt enforces strict JSON output and Adobe Stock requirements
 */
export function generateAdobeStockPrompt(): string {
    const { TITLE, DESCRIPTION, KEYWORDS } = ADOBE_STOCK_RULES;

    return `You are an expert at creating metadata for stock photography that meets Adobe Stock's strict requirements.

Analyze the provided image and generate professional, SEO-optimized metadata that will help the image sell well on Adobe Stock.

REQUIREMENTS:
1. Title: Must be ${TITLE.MIN_LENGTH}-${TITLE.MAX_LENGTH} characters. Be descriptive, specific, and include key visual elements. Use title case. No generic terms like "image" or "photo".

2. Description: Must be ${DESCRIPTION.MIN_LENGTH}-${DESCRIPTION.MAX_LENGTH} characters. Write a compelling, detailed description that:
   - Describes what's in the image clearly
   - Mentions colors, composition, mood, and style
   - Includes context about potential use cases
   - Uses natural, engaging language
   - Avoids repetition of the title

3. Keywords: Provide ${KEYWORDS.MIN_COUNT}-${KEYWORDS.MAX_COUNT} relevant keywords. Include:
   - Main subject(s) and objects
   - Colors and visual style
   - Mood and atmosphere
   - Composition and perspective
   - Potential use cases or themes
   - Related concepts and synonyms
   - Be specific and avoid generic terms

OUTPUT FORMAT:
You MUST respond with ONLY valid JSON in this exact format (no markdown, no code blocks, no additional text):
{
  "title": "Your title here",
  "description": "Your description here",
  "keywords": ["keyword1", "keyword2", "keyword3", ...]
}

IMPORTANT:
- Return ONLY the JSON object, nothing else
- Do not include markdown code fences
- Do not include any explanatory text
- Ensure the JSON is valid and parseable
- Keywords should be an array of strings
- All text should be in English
- Be creative but accurate to what's actually in the image`;

}

/**
 * Generate the user prompt with image context
 * @param imageMimeType - MIME type of the image (e.g., "image/jpeg")
 * @returns User prompt string
 */
export function generateUserPrompt(imageMimeType: string = 'image/jpeg'): string {
    return `Analyze this ${imageMimeType} image and generate Adobe Stock metadata following the requirements above.`;
}

