(function () {
  const SUPABASE_URL = 'https://axampuprcnauxbbijmmt.supabase.co';
  const GITHUB_IMAGES_FUNCTION = `${SUPABASE_URL}/functions/v1/github-images`;

  let files = [];
  let session = null;
  let onSelect = null;
  let onRefresh = null;
  let pendingUploads = [];
  let previewRun = 0;

  function ensureModal() {
    if (document.getElementById('admin-image-library-modal')) return;

    const style = document.createElement('style');
    style.textContent = `
      .admin-image-library-modal{display:none;position:fixed;inset:0;z-index:10000;align-items:center;justify-content:center;background:rgba(12,22,40,.72)}
      .admin-image-library-modal.open{display:flex}
      .admin-image-library-panel{width:min(1120px,94vw);max-height:88vh;overflow:auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.3);box-sizing:border-box}
      .admin-image-library-head{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:16px}
      .admin-image-library-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .admin-image-library-actions input[type=file]{display:none}
      .admin-image-library-search{min-width:260px;padding:10px;border:1px solid #d1d5db;border-radius:6px;font:inherit}
      .admin-image-library-status{min-height:22px;color:#667085;margin:10px 0;font-size:14px}
      .admin-image-library-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;margin-top:12px}
      .admin-image-library-choice{border:1px solid #e5e7eb;border-radius:8px;background:#fff;padding:8px;text-align:left;cursor:pointer}
      .admin-image-library-choice:hover{border-color:#004a99;box-shadow:0 6px 18px rgba(0,74,153,.12)}
      .admin-image-library-choice img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:6px;background:#f3f4f6}
      .admin-image-library-choice span{display:block;margin-top:6px;font-size:12px;color:#444;word-break:break-word}
      .admin-image-library-upload{display:none;margin:16px 0;padding:14px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb}
      .admin-image-library-upload.open{display:block}
      .admin-image-library-settings{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin:12px 0}
      .admin-image-library-settings label{display:flex;flex-direction:column;gap:6px;min-width:150px;color:#004a99;font-size:13px;font-weight:700}
      .admin-image-library-settings select,.admin-image-library-settings input{padding:9px;border:1px solid #d1d5db;border-radius:6px;font:inherit}
      .admin-image-library-preview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin-top:12px}
      .admin-image-library-preview{border:1px solid #e5e7eb;border-radius:8px;background:#fff;padding:10px}
      .admin-image-library-preview img{width:100%;aspect-ratio:4/3;object-fit:contain;background:#eef2f7;border-radius:6px}
      .admin-image-library-preview strong{display:block;margin-top:8px;font-size:13px;word-break:break-word}
      .admin-image-library-preview small{display:block;color:#667085;margin-top:4px}
      .admin-image-library-preview input{width:100%;box-sizing:border-box;margin-top:8px;padding:8px;border:1px solid #d1d5db;border-radius:6px;font:inherit;font-size:13px}
      .admin-image-library-preview .warning{color:#9a3412}
      @media(max-width:700px){.admin-image-library-panel{padding:16px}.admin-image-library-actions,.admin-image-library-search{width:100%}}
    `;
    document.head.appendChild(style);

    const modal = document.createElement('div');
    modal.id = 'admin-image-library-modal';
    modal.className = 'admin-image-library-modal';
    modal.innerHTML = `
      <div class="admin-image-library-panel" role="dialog" aria-modal="true" aria-labelledby="admin-image-library-title">
        <div class="admin-image-library-head">
          <h2 id="admin-image-library-title" style="margin:0;color:#004a99">Choose Website Image</h2>
          <div class="admin-image-library-actions">
            <input id="admin-image-library-search" class="admin-image-library-search" type="search" placeholder="Search images...">
            <label class="btn-accent" for="admin-image-library-files">Add Images</label>
            <input id="admin-image-library-files" type="file" accept="image/*" multiple>
            <button class="btn-outline" type="button" id="admin-image-library-refresh">Refresh</button>
            <button class="btn-outline" type="button" id="admin-image-library-close">Close</button>
          </div>
        </div>
        <section id="admin-image-library-upload" class="admin-image-library-upload">
          <h3 style="margin:0 0 8px;color:#004a99">Prepare Upload</h3>
          <p style="margin:0;color:#667085">Choose the compression settings, check the preview, then upload.</p>
          <div class="admin-image-library-settings">
            <label>Photo quality
              <select id="admin-image-library-quality">
                <option value="0.78">Balanced</option>
                <option value="0.9">High</option>
                <option value="0.62">Small file</option>
              </select>
            </label>
            <label>Max width
              <select id="admin-image-library-max-width">
                <option value="1600">1600px</option>
                <option value="2000">2000px</option>
                <option value="1200">1200px</option>
                <option value="0">Original width</option>
              </select>
            </label>
            <label>Target max KB
              <input id="admin-image-library-target-kb" type="number" min="100" step="50" value="700">
            </label>
            <button class="btn-primary" type="button" id="admin-image-library-upload-btn">Upload Prepared Images</button>
          </div>
          <div id="admin-image-library-upload-preview" class="admin-image-library-preview-grid"></div>
        </section>
        <div id="admin-image-library-status" class="admin-image-library-status">Loading GitHub images...</div>
        <div id="admin-image-library-grid" class="admin-image-library-grid"></div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', event => {
      if (event.target === modal) close();
    });
    document.getElementById('admin-image-library-close').addEventListener('click', close);
    document.getElementById('admin-image-library-refresh').addEventListener('click', refresh);
    document.getElementById('admin-image-library-search').addEventListener('input', render);
    document.getElementById('admin-image-library-files').addEventListener('change', event => preload(event.target.files));
    for (const id of ['admin-image-library-quality', 'admin-image-library-max-width', 'admin-image-library-target-kb']) {
      document.getElementById(id).addEventListener('change', renderUploadPreview);
      document.getElementById(id).addEventListener('input', renderUploadPreview);
    }
    document.getElementById('admin-image-library-upload-btn').addEventListener('click', uploadPrepared);
  }

  async function open(options = {}) {
    ensureModal();
    session = options.session || window.currentSession || session;
    onSelect = typeof options.onSelect === 'function' ? options.onSelect : null;
    onRefresh = typeof options.onRefresh === 'function' ? options.onRefresh : null;
    document.getElementById('admin-image-library-modal').classList.add('open');
    await refresh();
  }

  function close() {
    const modal = document.getElementById('admin-image-library-modal');
    if (modal) modal.classList.remove('open');
    pendingUploads = [];
    const input = document.getElementById('admin-image-library-files');
    if (input) input.value = '';
    const uploadPanel = document.getElementById('admin-image-library-upload');
    if (uploadPanel) uploadPanel.classList.remove('open');
  }

  async function refresh() {
    try {
      setStatus('Loading GitHub images...');
      const data = await callImageFunction('list');
      files = (data.files || []).sort((a, b) => a.name.localeCompare(b.name));
      render();
      if (onRefresh) onRefresh(files);
    } catch (err) {
      files = [];
      render();
      setStatus(`Unable to load GitHub images: ${err.message}`);
    }
  }

  function render() {
    const query = document.getElementById('admin-image-library-search')?.value.trim().toLowerCase() || '';
    const visible = files.filter(file => file.name.toLowerCase().includes(query));
    setStatus(`${visible.length} image file${visible.length === 1 ? '' : 's'} available.`);
    document.getElementById('admin-image-library-grid').innerHTML = visible.map(file => {
      const webPath = file.webPath || `assets/images/${file.name}`;
      return `
        <button type="button" class="admin-image-library-choice" data-path="${escapeAttr(webPath)}">
          <img src="${escapeAttr(file.downloadUrl || imageSrcForAdmin(webPath))}" alt="${escapeAttr(file.name)}">
          <span>${escapeHtml(file.name)}</span>
        </button>
      `;
    }).join('');
    document.querySelectorAll('.admin-image-library-choice').forEach(button => {
      button.addEventListener('click', () => select(button.dataset.path));
    });
  }

  function select(path) {
    if (onSelect) onSelect(path);
    close();
  }

  function preload(fileList) {
    pendingUploads.forEach(item => URL.revokeObjectURL(item.url));
    pendingUploads = Array.from(fileList || [])
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({ file, url: URL.createObjectURL(file), name: defaultOutputName(file) }));
    document.getElementById('admin-image-library-upload').classList.toggle('open', pendingUploads.length > 0);
    renderUploadPreview();
  }

  async function renderUploadPreview() {
    const run = ++previewRun;
    const grid = document.getElementById('admin-image-library-upload-preview');
    if (!grid) return;
    if (!pendingUploads.length) {
      grid.innerHTML = '';
      return;
    }
    grid.innerHTML = pendingUploads.map((item, index) => `
      <article class="admin-image-library-preview">
        <img src="${escapeAttr(item.url)}" alt="${escapeAttr(item.file.name)}">
        <strong>${escapeHtml(item.file.name)}</strong>
        <input type="text" value="${escapeAttr(item.name)}" aria-label="Upload file name" data-upload-index="${index}">
        <small>Checking prepared size...</small>
      </article>
    `).join('');

    grid.querySelectorAll('input[data-upload-index]').forEach(input => {
      input.addEventListener('input', () => {
        const item = pendingUploads[Number(input.dataset.uploadIndex)];
        if (item) item.name = input.value;
      });
    });

    const cards = Array.from(grid.querySelectorAll('.admin-image-library-preview'));
    await Promise.all(pendingUploads.map(async (item, index) => {
      try {
        const prepared = await prepareImageForUpload(item.file);
        if (run !== previewRun) return;
        const card = cards[index];
        if (!card) return;
        const input = card.querySelector('input');
        if (input && !input.matches(':focus') && !input.value.trim()) input.value = prepared.name;
        if (!item.name || item.name === item.file.name || item.name === defaultOutputName(item.file)) item.name = prepared.name;
        const sizeText = prepared.wasCompressed
          ? `${formatBytes(item.file.size)} original -> ${formatBytes(prepared.file.size)} prepared`
          : `${formatBytes(item.file.size)} kept original`;
        card.querySelector('small').textContent = prepared.targetMissed
          ? `${sizeText}. Minimum with these settings is ${formatBytes(prepared.file.size)}.`
          : sizeText;
        card.querySelector('small').classList.toggle('warning', Boolean(prepared.targetMissed));
      } catch (err) {
        if (run !== previewRun) return;
        const card = cards[index];
        if (card) card.querySelector('small').textContent = `Preview failed: ${err.message}`;
      }
    }));
  }

  async function uploadPrepared() {
    if (!pendingUploads.length) return;
    const uploaded = [];
    const uploadButton = document.getElementById('admin-image-library-upload-btn');
    uploadButton.disabled = true;
    uploadButton.textContent = 'Uploading...';
    try {
      for (const item of pendingUploads) {
        const prepared = await prepareImageForUpload(item.file);
        const uploadName = makeSafeFileName(normalizeUploadName(item.name, prepared.name));
        const data = await callImageFunction('upload', {
          name: uploadName,
          contentBase64: await fileToBase64(prepared.file),
          message: prepared.wasCompressed
            ? `Upload compressed image ${uploadName} (${formatBytes(item.file.size)} to ${formatBytes(prepared.file.size)})`
            : `Upload image ${uploadName}`,
        }, 'POST');
        uploaded.push(data.file?.path || `assets/images/${uploadName}`);
        const targetNote = prepared.targetMissed ? ` Minimum possible was ${formatBytes(prepared.file.size)}.` : '';
        setStatus(`${uploadName}: ${formatBytes(item.file.size)}${prepared.wasCompressed ? ` compressed to ${formatBytes(prepared.file.size)}` : ' kept original'}.${targetNote}`);
      }
      await refresh();
      pendingUploads.forEach(item => URL.revokeObjectURL(item.url));
      pendingUploads = [];
      document.getElementById('admin-image-library-files').value = '';
      document.getElementById('admin-image-library-upload').classList.remove('open');
      if (uploaded[0] && onSelect) {
        setStatus('Image uploaded and selected. It may take a short moment for GitHub Pages to serve the new file on the live site.');
        select(uploaded[0]);
      }
    } catch (err) {
      setStatus(`Upload failed: ${err.message}`);
    } finally {
      uploadButton.disabled = false;
      uploadButton.textContent = 'Upload Prepared Images';
    }
  }

  async function callImageFunction(action, body = null, method = 'GET') {
    if (!session?.access_token) throw new Error('Your admin session has expired. Please sign in again.');
    const response = await fetch(`${GITHUB_IMAGES_FUNCTION}?action=${encodeURIComponent(action)}`, {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || `Request failed with ${response.status}`);
    return data;
  }

  function imageSrcForAdmin(path) {
    if (!path) return '../assets/images/no-image.jpg';
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    const cleanPath = String(path || '').replace(/^(\.\/|\.\.\/|\/)+/, '');
    return cleanPath.startsWith('assets/images/')
      ? `https://raw.githubusercontent.com/s-george-dev/Warm-Right-Website/master/${cleanPath.split('/').map(encodeURIComponent).join('/')}`
      : `../${cleanPath}`;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function prepareImageForUpload(file) {
    if (!shouldCompressImage(file)) return { file, name: file.name, wasCompressed: false, targetMissed: false };
    const quality = Number(document.getElementById('admin-image-library-quality').value || 0.78);
    const maxWidth = Number(document.getElementById('admin-image-library-max-width').value || 1600);
    const targetBytes = Math.max(0, Number(document.getElementById('admin-image-library-target-kb').value || 0)) * 1024;
    const image = await loadImage(file);
    const scale = maxWidth > 0 ? Math.min(1, maxWidth / image.width) : 1;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    let targetMissed = false;
    if (targetBytes && blob.size > targetBytes) {
      const result = await compressTowardTarget(canvas, targetBytes, quality);
      blob = result.blob;
      targetMissed = result.targetMissed;
    }
    if (blob.size >= file.size && scale === 1) return { file, name: file.name, wasCompressed: false, targetMissed };
    const name = `${file.name.replace(/\.[^.]+$/, '') || 'image'}.jpg`;
    return { file: new File([blob], name, { type: 'image/jpeg' }), name, wasCompressed: true, targetMissed };
  }

  function shouldCompressImage(file) {
    const type = file.type.toLowerCase();
    if (!type.startsWith('image/')) return false;
    if (type.includes('svg') || type.includes('gif')) return false;
    if (type.includes('png')) return !/logo|icon|transparent|favicon/i.test(file.name);
    return type.includes('jpeg') || type.includes('jpg') || type.includes('webp') || file.size > 700 * 1024;
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not read ${file.name}`)); };
      image.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image compression failed.')), type, quality);
    });
  }

  async function compressTowardTarget(canvas, targetBytes, startingQuality) {
    let quality = Math.min(startingQuality, 0.86);
    let best = await canvasToBlob(canvas, 'image/jpeg', quality);
    while (best.size > targetBytes && quality > 0.45) {
      quality -= 0.08;
      best = await canvasToBlob(canvas, 'image/jpeg', quality);
    }
    return { blob: best, targetMissed: best.size > targetBytes };
  }

  function defaultOutputName(file) {
    if (!shouldCompressImage(file)) return file.name;
    return `${file.name.replace(/\.[^.]+$/, '') || 'image'}.jpg`;
  }

  function makeSafeFileName(name) {
    const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
    return cleaned.replace(/(^-|-$)/g, '') || `image-${Date.now()}.png`;
  }

  function normalizeUploadName(name, fallbackName) {
    const trimmed = String(name || '').trim();
    const fallback = String(fallbackName || `image-${Date.now()}.jpg`);
    if (!trimmed) return fallback;
    if (/\.[a-z0-9]{2,5}$/i.test(trimmed)) return trimmed;
    const fallbackExt = fallback.match(/(\.[a-z0-9]{2,5})$/i)?.[1] || '.jpg';
    return `${trimmed}${fallbackExt}`;
  }

  function setStatus(message) {
    const status = document.getElementById('admin-image-library-status');
    if (status) status.textContent = message;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  window.adminImageLibrary = { open, close, refresh, getFiles: () => files.slice(), imageSrcForAdmin };
})();
