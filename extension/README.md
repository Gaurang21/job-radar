# JobRadar Browser Extension

A lightweight Chrome/Firefox extension that lets you save job listings directly to your JobRadar pipeline with one click.

## Installing in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer Mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select this `/extension` folder
5. The JobRadar icon will appear in your toolbar

## Installing in Firefox

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select the `manifest.json` file inside this folder

## Usage

1. Navigate to a job listing on LinkedIn, Indeed, Greenhouse, Lever, or Glassdoor
2. Click the **JobRadar** extension icon in your toolbar
3. Click **Save to Pipeline** — the job is added to your Saved stage
4. Alternatively, use the floating **"Save to JobRadar"** button that appears on job pages

## Configuration

By default, the extension connects to `http://localhost:3000`. You can change the server URL in the extension popup if you've deployed JobRadar to a different URL.

## Notes

- JobRadar must be running locally (`npm run dev`) for the extension to work
- The extension uses Manifest V3 (Chrome's latest standard)
- Icons are placeholder SVG — replace `icons/` with actual PNG icons for production
