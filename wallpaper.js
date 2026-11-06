(() => {
  'use strict';
  const section = document.getElementById('custom-wallpaper-library');
  const gallery = document.getElementById('custom-wallpaper-gallery');
  const empty = document.getElementById('custom-wallpaper-empty');
  const upload = document.getElementById('custom-wallpaper-upload');
  const input = document.getElementById('custom-bg-input');
  const status = document.getElementById('custom-wallpaper-status');
  const activeKey = 'zz-nav-custom-bg-active';
  const legacyKey = 'zz-nav-custom-bg';
  const limit = 6;
  const t = key => LangManager.t('wallpapers.' + key);
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const remove = key => { try { localStorage.removeItem(key); } catch {} };
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const icon = name => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('svg-icon'); svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#icon-' + name); svg.append(use); return svg;
  };
  let records = [], currentId = read(activeKey), currentUrl = null, busy = false, available = true, selection = 0, ready;
  const thumbnails = new Map();
  const database = new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('Storage unavailable')); return; }
    let settled = false;
    const request = indexedDB.open('zz-nav-wallpapers', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('images', { keyPath: 'id' });
    request.onsuccess = () => { if (settled) request.result.close(); else { settled = true; resolve(request.result); } };
    request.onerror = request.onblocked = () => { settled = true; reject(request.error || new Error('Storage unavailable')); };
  });
  async function loadRecords() {
    const db = await database;
    return new Promise((resolve, reject) => {
      const request = db.transaction('images', 'readonly').objectStore('images').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function persist(items, deleted = []) {
    if (!available) return false;
    try {
      const db = await database;
      await new Promise((resolve, reject) => {
        const transaction = db.transaction('images', 'readwrite'), store = transaction.objectStore('images');
        deleted.forEach(id => store.delete(id));
        items.forEach(item => store.put(item));
        transaction.oncomplete = resolve;
        transaction.onerror = transaction.onabort = () => reject(transaction.error);
      });
      return true;
    } catch { available = false; return false; }
  }
  function setStatus(text) { status.textContent = text; }
  function setBusy(value) {
    busy = value; section.setAttribute('aria-busy', String(value)); upload.disabled = value;
    upload.querySelector('span').textContent = t(value ? 'uploading' : 'upload');
    gallery.querySelectorAll('button').forEach(button => { button.disabled = value; });
  }
  function syncActive() {
    const usingCustom = document.documentElement.dataset.bg === 'custom';
    gallery.querySelectorAll('[data-wallpaper-id]').forEach(button => {
      button.setAttribute('aria-pressed', String(usingCustom && button.dataset.wallpaperId === currentId));
    });
  }
  function render() {
    const retained = new Set(records.map(record => record.id));
    thumbnails.forEach((url, id) => { if (!retained.has(id)) { URL.revokeObjectURL(url); thumbnails.delete(id); } });
    gallery.replaceChildren(); empty.hidden = records.length > 0;
    records.forEach(record => {
      if (!thumbnails.has(record.id)) thumbnails.set(record.id, URL.createObjectURL(record.thumb));
      const item = node('div', 'custom-wallpaper-item'), choose = node('button', 'custom-wallpaper-pick');
      choose.type = 'button'; choose.dataset.wallpaperId = record.id; choose.disabled = busy;
      choose.setAttribute('aria-label', t('use') + '：' + record.name);
      const image = node('img', 'custom-wallpaper-thumb');
      image.src = thumbnails.get(record.id); image.alt = ''; image.loading = 'lazy'; image.decoding = 'async';
      const badge = node('span', 'custom-wallpaper-active'); badge.append(icon('check'), node('span', '', t('active')));
      choose.append(image, badge); choose.addEventListener('click', () => chooseRecord(record));
      const deletion = node('button', 'custom-wallpaper-delete');
      deletion.type = 'button'; deletion.disabled = busy; deletion.title = t('remove') + '：' + record.name;
      deletion.setAttribute('aria-label', deletion.title); deletion.append(icon('x'));
      deletion.addEventListener('click', () => deleteRecord(record));
      const name = node('span', 'custom-wallpaper-name', record.name.replace(/\.[a-z\d]{1,5}$/i, ''));
      name.title = record.name;
      item.append(choose, deletion, name); gallery.append(item);
    });
    syncActive();
  }
  function canvasBlob(canvas, quality) {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image encoding failed')), 'image/jpeg', quality));
  }
  async function prepareImage(blob, name, signature) {
    let source, sourceUrl;
    try {
      if (window.createImageBitmap) {
        try { source = await createImageBitmap(blob); } catch {}
      }
      if (!source) {
        sourceUrl = URL.createObjectURL(blob);
        source = new Image(); source.src = sourceUrl; await source.decode();
      }
      const width = source.width || source.naturalWidth, height = source.height || source.naturalHeight;
      if (!width || !height) throw new Error('Invalid image');
      const draw = edge => {
        const scale = Math.min(1, edge / Math.max(width, height));
        const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d'); context.fillStyle = '#f4f5f7'; context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(source, 0, 0, canvas.width, canvas.height); return canvas;
      };
      const full = draw(2560), preview = draw(360);
      try {
        const [image, thumb] = await Promise.all([canvasBlob(full, .88), canvasBlob(preview, .8)]);
        return { id: window.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2), name, image, thumb, signature, createdAt: Date.now() };
      } finally { full.width = full.height = preview.width = preview.height = 0; }
    } finally { source?.close?.(); if (sourceUrl) URL.revokeObjectURL(sourceUrl); }
  }
  async function applyRecord(record, activate) {
    const token = ++selection, url = URL.createObjectURL(record.image);
    try {
      const shouldActivate = activate || document.documentElement.dataset.bg === 'custom';
      if (shouldActivate) { const image = new Image(); image.src = url; await image.decode(); }
      if (token !== selection) { URL.revokeObjectURL(url); return; }
      const previous = currentUrl;
      currentId = record.id; currentUrl = url; write(activeKey, currentId);
      window.DirectoryTools.setCustomBackground(url);
      if (shouldActivate) window.DirectoryTools.applyBackground('custom', activate);
      if (previous) URL.revokeObjectURL(previous);
      syncActive();
    } catch (error) { URL.revokeObjectURL(url); throw error; }
  }
  async function chooseRecord(record) {
    if (busy) return;
    try {
      const rotate = document.getElementById('bg-rotate-mode');
      rotate.value = 'fixed'; rotate.dispatchEvent(new Event('change', { bubbles: true }));
      await applyRecord(record, true); setStatus('');
    } catch { setStatus(t('invalid')); }
  }
  async function addImage(file) {
    await ready;
    if (!file || busy) return;
    if (!file.type.startsWith('image/')) { setStatus(t('invalid')); return; }
    if (file.size > 20 * 1024 * 1024) { setStatus(t('tooLarge')); return; }
    setBusy(true); setStatus('');
    try {
      const signature = [file.name, file.size, file.lastModified].join(':');
      const existing = records.find(record => record.signature === signature);
      const record = existing || await prepareImage(file, file.name, signature);
      record.createdAt = Date.now();
      const next = [record, ...records.filter(item => item.id !== record.id)];
      const expired = next.slice(limit).map(item => item.id);
      const saved = await persist([record], expired);
      records = next.slice(0, limit); render();
      const rotate = document.getElementById('bg-rotate-mode');
      rotate.value = 'fixed'; rotate.dispatchEvent(new Event('change', { bubbles: true }));
      await applyRecord(record, true);
      setStatus(t(saved ? 'uploaded' : 'temporary'));
    } catch { setStatus(t('invalid')); }
    finally { setBusy(false); }
  }
  async function deleteRecord(record) {
    if (busy) return;
    setBusy(true);
    let focusTarget;
    try {
      if (available && !await persist([], [record.id])) { setStatus(t('deleteError')); return; }
      records = records.filter(item => item.id !== record.id);
      if (record.id === currentId) {
        if (records.length) await applyRecord(records[0], false);
        else {
          currentId = null; remove(activeKey); remove(legacyKey); ++selection;
          window.DirectoryTools.setCustomBackground(null);
          if (currentUrl) URL.revokeObjectURL(currentUrl); currentUrl = null;
          if (document.documentElement.dataset.bg === 'custom') window.DirectoryTools.applyBackground('none');
        }
      }
      render(); setStatus(t('deleted'));
      focusTarget = gallery.querySelector('button') || upload;
    } catch { setStatus(t('deleteError')); }
    finally { setBusy(false); focusTarget?.focus({ preventScroll: true }); }
  }
  async function initialize() {
    const legacy = read(legacyKey);
    try { records = (await loadRecords()).filter(record => record.image instanceof Blob && record.thumb instanceof Blob).sort((a, b) => b.createdAt - a.createdAt); }
    catch { available = false; }
    if (legacy?.startsWith('data:image/')) {
      try {
        const blob = await (await fetch(legacy)).blob();
        const signature = 'legacy:' + legacy.length + ':' + legacy.slice(-64);
        let record = records.find(item => item.signature === signature);
        if (!record) {
          record = await prepareImage(blob, t('previous'), signature);
          records.unshift(record);
          const saved = await persist([record], records.slice(limit).map(item => item.id));
          if (saved) remove(legacyKey);
        } else if (available) remove(legacyKey);
        currentId = record.id;
      } catch { setStatus(t('invalid')); }
    }
    records = records.slice(0, limit);
    if (records.length) {
      try { await applyRecord(records.find(record => record.id === currentId) || records[0], false); }
      catch { setStatus(t('invalid')); }
    } else if (!legacy && available && document.documentElement.dataset.bg === 'custom') window.DirectoryTools.applyBackground('none');
    render(); section.dataset.ready = 'true'; setBusy(false);
    if (!available) setStatus(t('temporary'));
  }
  window.WallpaperLibrary = { add: addImage, syncActive };
  upload.addEventListener('click', () => input.click());
  section.addEventListener('dragover', event => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault(); section.classList.add('is-dragover');
  });
  section.addEventListener('dragleave', event => { if (!section.contains(event.relatedTarget)) section.classList.remove('is-dragover'); });
  section.addEventListener('drop', event => {
    event.preventDefault(); section.classList.remove('is-dragover');
    addImage(event.dataTransfer.files[0]);
  });
  window.addEventListener('langchange', () => { render(); setStatus(''); setBusy(busy); });
  ready = initialize();
})();
