# PNG to ICO Converter

A simple, modern, browser-based tool for converting PNG files into ICO files in bulk.

The app runs entirely in the browser. Files are not uploaded to a server, and no build step is required.

## Features

- Convert one or many `.png` files to `.ico`
- Handles large batches, such as 100 files at once
- Generates real ICO files with multiple embedded sizes
- Supports 16, 32, 48, 64, 128, and 256 px icon sizes
- Downloads a single `.ico` for one file
- Downloads a `.zip` when converting multiple files
- Works as a static site with plain HTML, CSS, and JavaScript

## Usage

Open `index.html` in a browser.

Then:

1. Drag PNG files into the upload area, or click it to select files.
2. Choose the icon sizes to include inside each ICO.
3. Click **Convert and download**.

For multiple files, the app downloads a ZIP containing all converted ICO files.

## Project Structure

```text
.
├── index.html
├── styles.css
└── app.js
```

## Local Development

No dependencies are required.

You can open the file directly:

```text
index.html
```

Or serve the folder with any static server, for example:

```bash
npx serve .
```

## Deployment

This project can be deployed to any static hosting provider, such as GitHub Pages, Netlify, Vercel, or Cloudflare Pages.

No build command is needed. Use the repository root as the publish directory.

## Privacy

All conversion work happens locally in the user's browser using Canvas and Blob APIs. PNG files are not sent anywhere.

## License

Add a license file if you plan to publish or share this project publicly.
