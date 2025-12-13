# Adobe Stock CSV Generator

A production-ready, client-side web application for generating Adobe Stock-compliant metadata (Title, Description, and Keywords) from images using Google's Gemini AI. Export your results directly to CSV format for seamless integration with Adobe Stock submissions.

## 🚀 Features

- **AI-Powered Metadata Generation**: Leverages Google Gemini AI to automatically generate stock-ready titles, descriptions, and keywords from images
- **Batch Processing**: Upload and process multiple images simultaneously with intelligent concurrency control
- **Adobe Stock Compliance**: Automatically validates and formats metadata according to Adobe Stock requirements
- **CSV Export**: One-click export to properly formatted CSV files ready for Adobe Stock submission
- **Smart Storage Management**: Efficient localStorage usage - only stores successful results with previews, automatically clears when new files are uploaded
- **Modern UI/UX**: Clean, responsive interface with dark/light/system theme support
- **Comprehensive Error Handling**: Detailed error messages including quota limit detection and retry information
- **Result Management**: View, filter, and manage generated results with dedicated results pages
- **Dynamic Model Resolution**: Automatically discovers available Gemini models for your API key (free-tier compatible)
- **Client-Side Only**: All processing happens in your browser - no server required

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **State Management**: React Context API
- **File Upload**: react-dropzone
- **Notifications**: Sonner (Toast notifications)
- **Theme**: next-themes (Dark/Light/System mode)

## 📋 Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))
- Modern web browser with localStorage support

## 🏃 Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd csv_generator
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## 🔑 API Key Configuration

1. Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click the "Configure API Key" button in the application header
3. Enter your API key and click "Test" to verify it works
4. Click "Save" to store it securely (stored locally in your browser's localStorage)

**Note**: The API key is stored in your browser's localStorage and never sent to any server except Google's Gemini API. It persists across browser sessions.

## 📖 Usage

### Step 1: Configure API Key
- Click "Configure API Key" in the header
- Enter your Gemini API key
- Test and save the key

### Step 2: Upload Images
- Drag and drop images onto the upload area, or click "Select Images"
- Supported formats: JPG, PNG, WebP
- Maximum file size: 10MB per image
- Maximum batch size: 20 images

### Step 3: Generate Metadata
- Select specific images (optional) or generate for all pending images
- Click "Generate" to start processing
- Monitor progress in real-time
- Successful results are automatically saved with previews

### Step 4: View Results
- Click "View Results" to see all successful generations
- View individual result details by clicking on any result
- Results are automatically saved to your browser's local storage

### Step 5: Export CSV
- From the results page, click "Export CSV"
- The CSV file will be downloaded with the format: `Filename,Title,Description,Keywords`
- Only successful results with complete metadata are included

### Step 6: Upload New Files
- When you upload new files, all previously processed results (success, error, generating) are automatically cleared
- Only pending files remain in storage
- This keeps localStorage usage efficient

## 📁 Project Structure

```
csv_generator/
├── app/
│   ├── components/          # React components
│   │   ├── ApiKeyModal.tsx  # API key management modal
│   │   ├── BatchToolbarCompact.tsx  # Batch generation controls
│   │   ├── ThemeToggle.tsx  # Theme switcher
│   │   └── UploadDropzone.tsx  # File upload component
│   ├── constants/           # Configuration constants
│   │   ├── adobe-stock.ts   # Adobe Stock validation rules
│   │   ├── gemini.ts        # Gemini API configuration
│   │   ├── upload.ts        # Upload constraints
│   │   └── ui.ts            # UI defaults
│   ├── context/             # React Context providers
│   │   ├── ApiKeyContext.tsx  # API key state management
│   │   ├── ResultsContext.tsx  # Results state management
│   │   └── ThemeProvider.tsx   # Theme management
│   ├── lib/                  # Utility functions
│   │   ├── api-key.ts        # API key storage/validation
│   │   ├── csv-utils.ts      # CSV generation/export
│   │   ├── gemini.ts         # Gemini API client
│   │   ├── image-utils.ts    # Image processing utilities
│   │   ├── keyword-normalizer.ts  # Keyword processing
│   │   └── model-resolver.ts # Dynamic model discovery
│   ├── prompts/              # AI prompt templates
│   │   └── adobe-stock-prompt.ts
│   ├── results/              # Results pages
│   │   ├── page.tsx          # Results list page
│   │   └── [id]/page.tsx     # Individual result detail
│   ├── types/                # TypeScript type definitions
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main upload page
├── components/ui/            # shadcn/ui components
├── public/                   # Static assets
└── package.json
```

## ⚙️ Configuration

All tunable values are centralized in the `app/constants/` directory:

### Gemini API (`app/constants/gemini.ts`)
- `DEFAULT_MODEL`: Default Gemini model (default: `gemini-1.5-flash`)
- `ALTERNATIVE_MODEL`: Alternative model option (default: `gemini-1.5-pro`)
- `CONCURRENCY_LIMIT`: Max concurrent API requests (default: `3`)
- `REQUEST_TIMEOUT_MS`: Request timeout (default: `30000ms`)

### Upload Constraints (`app/constants/upload.ts`)
- `MAX_FILE_SIZE_MB`: Maximum file size (default: `10MB`)
- `MAX_FILES_PER_BATCH`: Maximum files per batch (default: `20`)

### Adobe Stock Rules (`app/constants/adobe-stock.ts`)
- Title length: 10-70 characters
- Description length: 120-200 characters
- Keywords: 25-49 keywords required

## 🔒 Security & Privacy

- **Client-Side Only**: All processing happens in your browser
- **No Server Storage**: API keys and images are never sent to our servers
- **Local Storage**: Data is stored only in your browser's localStorage
- **Direct API Calls**: Images are sent directly to Google's Gemini API
- **No Analytics**: No tracking or analytics are implemented

## 💾 Storage Management

The application uses intelligent storage management to optimize localStorage usage:

- **Pending Files**: Only filename and status stored (no metadata, no preview)
- **Successful Results**: Metadata (title, description, keywords) AND preview stored
- **Automatic Cleanup**: When new files are uploaded, all processed results (success, error, generating) are automatically cleared
- **Space Efficient**: Only stores what's necessary, preventing quota exceeded errors

## 🐛 Error Handling

The application handles various error scenarios:

- **API Errors**: Network failures, invalid responses, timeouts
- **Quota Exceeded**: Detects and displays detailed 429 (Quota Exceeded) errors with retry information
- **File Errors**: Missing files, invalid formats, size limits
- **Validation Errors**: Adobe Stock compliance validation
- **Storage Errors**: Handles localStorage quota exceeded gracefully

## 🎨 Theming

The application supports three theme modes:
- **Light Mode**: Default light theme
- **Dark Mode**: Dark theme for low-light environments
- **System**: Automatically matches your system preference

Toggle themes using the theme switcher in the header. Theme preference is persisted across sessions.

## 📊 CSV Export Format

The exported CSV follows this exact format:

```csv
Filename,Title,Description,Keywords
image1.jpg,"Professional Business Meeting","A group of professionals collaborating in a modern office setting","business,meeting,office,teamwork,collaboration"
```

- Properly escaped fields (RFC 4180 compliant)
- Only includes successful results with complete metadata
- Ready for direct import to Adobe Stock

## 🚨 Known Limitations

- **Free Tier Limits**: Free tier Gemini API keys have daily request limits (typically 20 requests/day)
- **Browser Storage**: Results are stored in localStorage (limited to ~5-10MB depending on browser)
- **File Persistence**: File objects are not persisted; only metadata and previews for successful results
- **Concurrent Requests**: Limited to 3 concurrent API calls to respect rate limits
- **Preview Availability**: Previews are only available for successful results stored in localStorage

## 🔄 State Management

The application uses React Context API for state management:

- **ApiKeyContext**: Manages API key storage, validation, and testing
- **ResultsContext**: Manages image rows, generation status, and persistence
- **ThemeProvider**: Manages theme state and persistence

## 🧪 Development

### Running Tests
```bash
npm run lint
```

### Building for Production
```bash
npm run build
```

### Project Scripts
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For issues or feature requests, please contact us.

## 📞 Support

For issues related to:
- **Gemini API**: Visit [Google AI Studio Documentation](https://ai.google.dev/docs)
- **Adobe Stock**: Visit [Adobe Stock Contributor Portal](https://stock.adobe.com/contributor)
- **Application Issues**: Check the browser console for error messages

## 🙏 Acknowledgments

- [Google Gemini AI](https://ai.google.dev/) for the AI capabilities
- [Next.js](https://nextjs.org/) for the amazing framework
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Lucide](https://lucide.dev/) for the icon library

---

**Built with ❤️ for content creators and stock photographers**
