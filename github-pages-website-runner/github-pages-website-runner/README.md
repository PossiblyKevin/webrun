# Web Runner — GitHub Pages

A static, browser-based playground for:
- Pasting HTML, plus optional separate CSS and JavaScript.
- Uploading individual website files or a ZIP of a static site.
- Trying to preview an `http`/`https` URL in an iframe.
- Downloading the current pasted-code preview as one HTML file.

## Deploy to GitHub Pages

1. Sign in to GitHub and create a **new public repository** (for example, `web-runner`).
2. Add these three files to the repository root: `index.html`, `style.css`, and `app.js`. Keep the names and capitalization exact.
   - Easiest: open the repository, click **Add file → Create new file**, enter each filename, paste its matching content, and commit.
   - Or upload the three files from this folder with **Add file → Upload files**.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose branch `main` and folder `/(root)`, then click **Save**.
6. Wait for the Pages deployment to finish. The site URL will appear in Settings → Pages, usually `https://YOUR-USERNAME.github.io/REPOSITORY/`.
7. If you change the files later, commit the changes. Pages will redeploy automatically.

## How to use

- **Paste code:** paste a complete HTML document into HTML. CSS and JS are optional and are injected into the page when you run it.
- **Upload files:** select or drag files into the upload area. ZIP archives are expanded in the browser. The runner looks for `index.html` first, then the first HTML file it finds.
- **URL:** enter an `https://` or `http://` URL and try to embed it. If it refuses to load, use “Open URL in a new tab.”
- **Download HTML:** downloads the current code-editor version as one HTML file. It does not package imported assets.

## Honest limitations

This is a client-side static tool, not a remote server or a full IDE.

- **URL import is not implemented.** The URL feature only tries to display the website in an iframe. Browsers do not let this page read arbitrary cross-origin source files unless the target server explicitly allows it with CORS. Sites may also block iframe embedding using `X-Frame-Options` or Content Security Policy.
- **Not every uploaded website can run as-is.** This is intended for static HTML/CSS/JS. Projects requiring `npm install`, a build step, a backend, server-side rendering, databases, environment variables, or server routes will not run directly.
- **ZIP asset paths:** the runner rewrites common quoted `src`, `href`, and `poster` references to local Blob URLs. Complex paths, CSS `url(...)`, module imports, dynamically generated paths, service workers, and bundler-specific aliases may need manual fixes. For reliable asset handling, a more complete local development server is needed.
- **External resources:** remote fonts, scripts, APIs, images, and modules still depend on their host, network access, and CORS policy.
- **Safety:** pasted or uploaded JavaScript is untrusted code. It runs in a sandboxed iframe, but browser sandboxing is not a guarantee against every possible browser bug. Only run code you trust. Do not use this runner to handle secrets or sensitive files.
- **Browser storage and permissions:** the sandbox may restrict cookies, popups, downloads, storage, navigation, and other browser features.
- **CDN dependency:** ZIP extraction loads JSZip from jsDelivr. If the CDN is unavailable or blocked, ZIP import will fail; individual file uploads still work.
- **Download output:** the download button exports the current editor contents. It does not include uploaded images, stylesheets, scripts, or other assets as a portable project.
- **Large files:** very large ZIPs or sites may use significant browser memory.

## Privacy

The app has no custom backend and does not upload selected files to a server. Files are processed in your browser. The page loads JSZip from jsDelivr and fonts from Google Fonts; those services may receive normal connection metadata. Your imported source may itself make network requests when run.

## Files

- `index.html` — app layout and controls.
- `style.css` — visual styling.
- `app.js` — editor, upload, ZIP parsing, and preview logic.
