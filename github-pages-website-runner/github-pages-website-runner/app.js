(() => {
  const $ = (id) => document.getElementById(id);
  const htmlCode = $("htmlCode"), cssCode = $("cssCode"), jsCode = $("jsCode");
  const preview = $("preview"), status = $("status"), previewMessage = $("previewMessage");
  const urlInput = $("urlInput"), fileInput = $("fileInput"), fileList = $("fileList");
  let importedFiles = new Map();
  let previewBlobUrl = null;

  function setStatus(message, good = true) {
    status.textContent = message;
    status.style.color = good ? "#9fe3c0" : "#f4ce81";
    previewMessage.textContent = message;
  }
  function escapeAttr(value) { return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;"); }

  function buildDocument() {
    let html = htmlCode.value.trim();
    if (!html) html = "<!doctype html><html><head><meta charset='utf-8'></head><body></body></html>";
    const css = cssCode.value.trim();
    const js = jsCode.value.trim();
    const cssTag = css ? `<style>\n${css}\n</style>` : "";
    // Appending JS at the end means common DOM operations can find page elements.
    const jsTag = js ? `<script>\n${js.replace(/<\/script/gi, "<\\/script")}\n<\/script>` : "";
    if (/<\/head\s*>/i.test(html)) html = html.replace(/<\/head\s*>/i, `${cssTag}</head>`);
    else html = `${cssTag}${html}`;
    if (/<\/body\s*>/i.test(html)) html = html.replace(/<\/body\s*>/i, `${jsTag}</body>`);
    else html += jsTag;
    return html;
  }
  function runPreview() {
    preview.removeAttribute("src");
    preview.srcdoc = buildDocument();
    $("previewAddress").textContent = "runner://preview";
    setStatus("Preview updated");
  }
  $("runBtn").addEventListener("click", runPreview);
  $("refreshBtn").addEventListener("click", runPreview);
  $("downloadBtn").addEventListener("click", () => {
    const blob = new Blob([buildDocument()], {type:"text/html;charset=utf-8"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = "website-preview.html"; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });
  $("popoutBtn").addEventListener("click", () => {
    const blob = new Blob([buildDocument()], {type:"text/html;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });

  document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b === button));
    document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.id === `tab-${button.dataset.tab}`));
  }));

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/(1024*1024)).toFixed(1)} MB`;
  }
  function renderFileList() {
    if (!importedFiles.size) { fileList.innerHTML = '<p class="muted">No files imported yet.</p>'; $("loadFilesBtn").disabled = true; return; }
    fileList.replaceChildren();
    [...importedFiles.entries()].forEach(([name, item]) => {
      const row = document.createElement("div"); row.className = "file-item";
      const left = document.createElement("span"); left.textContent = name;
      const right = document.createElement("span"); right.textContent = formatSize(item.size);
      row.append(left, right); fileList.append(row);
    });
    $("loadFilesBtn").disabled = false;
  }
  async function ingestFiles(files) {
    for (const file of files) {
      if (file.name.toLowerCase().endsWith(".zip")) {
        if (!window.JSZip) { setStatus("ZIP library failed to load; try individual files.", false); continue; }
        try {
          const zip = await JSZip.loadAsync(file);
          for (const [path, entry] of Object.entries(zip.files)) {
            if (entry.dir || path.split("/").some(part => part.startsWith("."))) continue;
            const blob = await entry.async("blob");
            importedFiles.set(path, {blob, size: blob.size, type: blob.type || guessMime(path)});
          }
        } catch (err) { setStatus(`Could not read ZIP: ${err.message}`, false); }
      } else {
        importedFiles.set(file.name, {blob:file, size:file.size, type:file.type || guessMime(file.name)});
      }
    }
    renderFileList();
    setStatus(`${importedFiles.size} file(s) imported`);
  }
  function guessMime(path) {
    const ext = path.split(".").pop().toLowerCase();
    return ({html:"text/html",htm:"text/html",css:"text/css",js:"text/javascript",mjs:"text/javascript",json:"application/json",txt:"text/plain",svg:"image/svg+xml",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp",ico:"image/x-icon",woff:"font/woff",woff2:"font/woff2",ttf:"font/ttf"})[ext] || "application/octet-stream";
  }
  fileInput.addEventListener("change", e => ingestFiles(e.target.files));
  const dropzone = $("dropzone");
  ["dragenter","dragover"].forEach(type => dropzone.addEventListener(type, e => {e.preventDefault(); dropzone.style.borderColor="#7c9cff";}));
  ["dragleave","drop"].forEach(type => dropzone.addEventListener(type, e => {e.preventDefault(); dropzone.style.borderColor="";}));
  dropzone.addEventListener("drop", e => ingestFiles(e.dataTransfer.files));
  $("clearFilesBtn").addEventListener("click", () => { importedFiles.clear(); renderFileList(); setStatus("Imported files cleared"); });

  $("loadFilesBtn").addEventListener("click", async () => {
    const entries = [...importedFiles.entries()];
    // Find an HTML entry, preferring index.html at any folder depth.
    const htmlEntry = entries.find(([name]) => /(^|\/)index\.html?$/i.test(name)) ||
                      entries.find(([name]) => /\.html?$/i.test(name));
    if (!htmlEntry) { setStatus("No HTML file found. Upload an .html file or a static-site ZIP.", false); return; }
    const [htmlPath, htmlItem] = htmlEntry;
    let html = await htmlItem.blob.text();
    const base = htmlPath.includes("/") ? htmlPath.slice(0, htmlPath.lastIndexOf("/") + 1) : "";
    const assetUrls = new Map();
    for (const [path, item] of entries) {
      if (path === htmlPath) continue;
      // Browser Blob URLs make assets available inside the isolated preview.
      assetUrls.set(path, URL.createObjectURL(item.blob));
    }
    function resolvePath(raw) {
      let clean = raw.split(/[?#]/)[0].replace(/^\.\//, "");
      if (!clean || /^(?:[a-z]+:|\/\/|#|data:|blob:)/i.test(raw)) return raw;
      let path = clean.startsWith("/") ? clean.slice(1) : base + clean;
      const parts = [];
      for (const part of path.split("/")) { if (part === "..") parts.pop(); else if (part && part !== ".") parts.push(part); }
      const normalized = parts.join("/");
      return assetUrls.get(normalized) || assetUrls.get(clean) || raw;
    }
    // Rewrite common relative resource references; complex bundler aliases aren't supported.
    html = html.replace(/\b(src|href|poster)\s*=\s*(["'])([^"']+)\2/gi, (match, attr, quote, value) => {
      const resolved = resolvePath(value);
      return `${attr}=${quote}${escapeAttr(resolved)}${quote}`;
    });
    htmlCode.value = html;
    cssCode.value = "";
    jsCode.value = "";
    document.querySelector('[data-tab="code"]').click();
    preview.srcdoc = html;
    $("previewAddress").textContent = `file-import://${htmlPath}`;
    setStatus(`Loaded ${htmlPath}`);
  });

  function openUrl() {
    const raw = urlInput.value.trim();
    try {
      const url = new URL(raw);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Use an http or https URL.");
      preview.srcdoc = "";
      preview.src = url.href;
      $("previewAddress").textContent = url.hostname;
      setStatus("Attempting URL preview — embedding may be blocked", false);
    } catch (err) { setStatus(err.message || "Enter a valid website URL.", false); }
  }
  $("openUrlBtn").addEventListener("click", openUrl);
  $("newTabBtn").addEventListener("click", () => {
    try {
      const url = new URL(urlInput.value.trim());
      if (["http:","https:"].includes(url.protocol)) window.open(url.href, "_blank", "noopener,noreferrer");
      else setStatus("Use an http or https URL.", false);
    } catch { setStatus("Enter a valid website URL.", false); }
  });
  urlInput.addEventListener("keydown", e => { if (e.key === "Enter") openUrl(); });
  runPreview();
})();