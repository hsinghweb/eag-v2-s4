# Math Agent

A powerful AI-powered mathematical problem solver with a Chrome extension interface.

## Setup Instructions

### 1. Server Setup

1. Install the required Python packages:
   ```bash
   pip install flask flask-cors
   ```

2. Start the server:
   ```bash
   python server.py
   ```
   The server will start on `http://localhost:5000`

### 2. Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top-right corner)
3. Click "Load unpacked" and select the `chrome-extension` directory
4. The Math Agent extension should now appear in your extensions bar

### 3. Using the Extension

1. Click on the Math Agent extension icon in your browser
2. Enter your math query in the input field
3. Click "Ask" or press Enter
4. The result will be displayed in the result area

## Features

- Solve complex mathematical problems
- Natural language processing for queries
- Clean and simple interface
- Real-time responses

## Development

- Server: Python with Flask
- Frontend: Vanilla JavaScript
- AI: Google's Gemini API

## Troubleshooting

- Make sure the server is running before using the extension
- Check the browser's console for any errors (Right-click > Inspect > Console)
- Ensure CORS is properly configured if accessing from different domains
