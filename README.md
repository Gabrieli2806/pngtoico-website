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

No dependencies are required for the static website.

You can open the file directly:

```text
index.html
```

Or serve the folder with any static server, for example:

```bash
npx serve .
```

## Windows Portable App

The project also includes an Electron wrapper that builds a portable Windows executable.

Install dependencies:

```bash
npm install
```

Run the desktop app locally:

```bash
npm start
```

Build the portable `.exe`:

```bash
npm run build:win
```

The generated executable is written to `dist/` as `PNG-to-ICO-Portable-<version>.exe`.

## Deployment

This project can be deployed to any static hosting provider, such as GitHub Pages, Netlify, Vercel, or Cloudflare Pages.

No build command is needed. Use the repository root as the publish directory.

## Privacy

All conversion work happens locally in the user's browser using Canvas and Blob APIs. PNG files are not sent anywhere.

## License

Add a license file if you plan to publish or share this project publicly.

## Current release

Version 1.1.0 combines the refreshed web interface, bilingual legacy notice, and interactive icon-size preview in both the website and Windows portable app. Visit https://g2806.net for newer applications.
