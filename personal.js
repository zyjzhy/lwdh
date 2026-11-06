(() => {
  'use strict';
  const settings = document.getElementById('settings-modal');
  const container = document.getElementById('common-recommendations');
  const tabs = [...document.querySelectorAll('[data-settings-tab]')];
  const panels = [...document.querySelectorAll('[data-settings-panel]')];
  const glassButtons = [...document.querySelectorAll('[data-glass-mode]')];
  const search = document.getElementById('favorite-search');
  const list = document.getElementById('favorite-list');
  const results = document.getElementById('favorite-results');
  const status = document.getElementById('favorite-status');
  const sources = new Map();
  const favoriteKey = 'zz-nav-favorites';
  const glassKey = 'zz-nav-glass-mode';
  const t = key => LangManager.t('personal.' + key);
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); return true; } catch { return false; } };
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
  const label = card => card.querySelector('.card-label')?.textContent.trim() || '';
  const domain = url => {
    try { const parsed = new URL(url, location.href); return parsed.protocol === 'file:' ? LangManager.t('refresh.localTool') : parsed.hostname.replace(/^www\./, ''); }
    catch { return ''; }
  };
  const safeUrl = value => {
    try {
      const input = value.trim();
      const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(input) ? input : 'https://' + input);
      return ['http:', 'https:'].includes(url.protocol) && url.hostname && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  };
  let state = { urls: [], custom: [] };
  try {
    const saved = JSON.parse(read(favoriteKey));
    if (saved && Array.isArray(saved.urls)) {
      state.urls = [...new Set(saved.urls.filter(url => typeof url === 'string'))].slice(0, 100);
      state.custom = (Array.isArray(saved.custom) ? saved.custom : []).filter(item => typeof item?.name === 'string' && typeof item?.url === 'string' && safeUrl(item.url) === item.url).slice(0, 100);
    }
  } catch {}
  document.querySelectorAll('a.card:not([data-frequent-clone])').forEach(card => {
    if (!sources.has(card.getAttribute('href'))) sources.set(card.getAttribute('href'), card);
  });
  function customSource(item) {
    if (sources.has(item.url)) return;
    const card = node('a', 'card');
    card.href = item.url; card.target = '_blank'; card.rel = 'noopener noreferrer';
    card.dataset.tooltip = item.name;
    card.dataset.personalName = item.name;
    const img = node('img'); img.src = 'site-placeholder.svg'; img.alt = '';
    img.dataset.iconSrc = new URL('/favicon.ico', item.url).href;
    card.append(img, node('span', 'card-label', item.name), node('span', 'card-description', domain(item.url)));
    sources.set(item.url, card);
  }
  state.custom.forEach(customSource);
  state.urls = state.urls.filter(url => sources.has(url));
  function syncCardStars() {
    const favorites = new Set(state.urls);
    document.querySelectorAll('.card-favorite-toggle').forEach(button => {
      const active = favorites.has(button.dataset.favoriteUrl);
      const text = (active ? t('remove') : t('add')) + '：' + label(button.parentElement.querySelector('.card'));
      if (button.getAttribute('aria-pressed') !== String(active)) button.setAttribute('aria-pressed', String(active));
      if (button.title !== text) { button.title = text; button.setAttribute('aria-label', text); }
    });
  }
  function enhanceCardFavorites() {
    document.querySelectorAll('.card-container > a.card').forEach(card => {
      const entry = node('div', 'card-entry');
      card.before(entry); entry.append(card);
      const button = node('button', 'card-favorite-toggle');
      button.type = 'button'; button.dataset.favoriteUrl = card.getAttribute('href'); button.append(icon('star'));
      entry.append(button);
    });
    syncCardStars();
  }
  function renderPinned() {
    container.querySelectorAll('.favorite-card').forEach(card => (card.closest('.card-entry') || card).remove());
    const favorites = new Set(state.urls);
    container.querySelectorAll('.card').forEach(card => card.classList.toggle('is-favorite-duplicate', favorites.has(card.getAttribute('href'))));
    const fragment = document.createDocumentFragment();
    state.urls.forEach(url => {
      const source = sources.get(url);
      if (!source) return;
      const card = window.DirectoryTools.cloneCard(source, 0);
      delete card.dataset.commonPinned;
      card.classList.remove('is-favorite-duplicate');
      card.classList.add('favorite-card');
      card.querySelectorAll('.frequent-count, .favorite-pin').forEach(el => el.remove());
      fragment.append(card);
    });
    container.prepend(fragment);
    enhanceCardFavorites();
  }
  function selectSection(section) {
    const target = panels.some(panel => panel.dataset.settingsPanel === section) ? section : tabs.find(tab => tab.getAttribute('aria-selected') === 'true')?.dataset.settingsTab || 'appearance';
    tabs.forEach(tab => {
      const selected = tab.dataset.settingsTab === target;
      tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.dataset.settingsPanel !== target; });
    settings.querySelector('.modal-content').scrollTop = 0;
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectSection(tab.dataset.settingsTab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault(); selectSection(tabs[next].dataset.settingsTab); tabs[next].focus();
    });
  });
  function applyGlass(mode, save = true) {
    const choice = ['airy', 'balanced', 'readable'].includes(mode) ? mode : 'balanced';
    document.documentElement.dataset.glass = choice;
    glassButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.glassMode === choice)));
    if (save) write(glassKey, choice);
  }
  glassButtons.forEach(button => button.addEventListener('click', () => applyGlass(button.dataset.glassMode)));
  applyGlass(read(glassKey), false);
  const previewObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.removeAttribute('data-preview-pending'); previewObserver.unobserve(entry.target);
    });
  }, { root: settings.querySelector('.modal-content'), rootMargin: '80px' });
  settings.querySelectorAll('[data-preview-pending]').forEach(preview => previewObserver.observe(preview));
  function setStatus(message) { status.textContent = message; }
  function save(message) {
    const saved = write(favoriteKey, JSON.stringify({ version: 1, ...state }));
    setStatus(saved ? message : (LangManager.getLang() === 'en' ? 'Changes are active, but this browser could not save them.' : '更改已生效，但当前浏览器未能保存。'));
    window.DirectoryTools.refreshRecommendations(); renderList(); renderPicker();
  }
  function actionButton(action, text, symbol) {
    const button = node('button', 'favorite-row-action');
    button.type = 'button'; button.dataset.favoriteAction = action;
    button.title = text; button.setAttribute('aria-label', text); button.append(icon(symbol));
    return button;
  }
  function renderList() {
    list.replaceChildren();
    document.getElementById('favorite-total').textContent = String(state.urls.length);
    if (!state.urls.length) { list.append(node('li', 'favorite-empty', t('empty'))); return; }
    state.urls.forEach((url, index) => {
      const row = node('li', 'favorite-row'); row.dataset.favoriteUrl = url;
      const info = node('div', 'favorite-row-info');
      info.append(node('strong', '', label(sources.get(url))), node('small', '', domain(url)));
      const actions = node('div', 'favorite-row-actions');
      const up = actionButton('up', t('up'), 'arrow-up'); up.disabled = index === 0;
      const down = actionButton('down', t('down'), 'arrow-up'); down.classList.add('favorite-down'); down.disabled = index === state.urls.length - 1;
      actions.append(up, down, actionButton('remove', t('remove'), 'x'));
      row.append(info, actions); list.append(row);
    });
  }
  function add(url) {
    if (state.urls.includes(url)) { setStatus(t('duplicate')); return false; }
    if (state.urls.length >= 100) { setStatus(t('limit')); return false; }
    const customName = sources.get(url)?.dataset.personalName;
    if (customName && !state.custom.some(item => item.url === url)) state.custom.push({ name: customName, url });
    state.urls.push(url); save(t('saved')); return true;
  }
  function renderPicker() {
    const query = search.value.trim().toLowerCase();
    results.replaceChildren();
    if (!query) { results.append(node('p', 'favorite-picker-note', t('searchHint'))); return; }
    const rank = card => {
      const name = label(card).toLowerCase();
      return name === query ? 0 : name.startsWith(query) ? 1 : name.includes(query) ? 2 : 3;
    };
    const matches = [...sources]
      .filter(([url, card]) => !state.urls.includes(url) && (label(card) + ' ' + url + ' ' + (card.dataset.labelOrig || '')).toLowerCase().includes(query))
      .sort(([, a], [, b]) => rank(a) - rank(b))
      .slice(0, 8);
    if (!matches.length) { results.append(node('p', 'favorite-picker-note', t('noMatch'))); return; }
    matches.forEach(([url, card]) => {
      const row = node('div', 'favorite-result');
      const info = node('div', 'favorite-row-info'); info.append(node('strong', '', label(card)), node('small', '', domain(url)));
      const button = node('button', 'favorite-add');
      button.type = 'button'; button.setAttribute('aria-label', t('add') + '：' + label(card)); button.append(icon('plus'));
      button.addEventListener('click', () => { add(url); search.focus(); });
      row.append(info, button); results.append(row);
    });
  }
  search.addEventListener('input', renderPicker);
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-favorite-action]');
    if (!button) return;
    const url = button.closest('.favorite-row').dataset.favoriteUrl, index = state.urls.indexOf(url);
    const action = button.dataset.favoriteAction;
    if (action === 'remove') {
      state.urls.splice(index, 1); state.custom = state.custom.filter(item => item.url !== url);
    } else {
      const next = index + (action === 'up' ? -1 : 1);
      if (next < 0 || next >= state.urls.length) return;
      [state.urls[index], state.urls[next]] = [state.urls[next], state.urls[index]];
    }
    save(action === 'remove' ? t('removed') : '');
    const rows = [...list.querySelectorAll('.favorite-row')];
    const target = action === 'remove' ? rows[Math.min(index, rows.length - 1)] : rows.find(row => row.dataset.favoriteUrl === url);
    const focus = target?.querySelector('[data-favorite-action="' + action + '"]:not(:disabled)');
    (focus || target?.querySelector('button:not(:disabled)') || search).focus();
  });
  document.getElementById('favorite-custom-form').addEventListener('submit', event => {
    event.preventDefault();
    const nameInput = document.getElementById('favorite-custom-name'), urlInput = document.getElementById('favorite-custom-url');
    const name = nameInput.value.trim(), url = safeUrl(urlInput.value);
    if (!name || !url) { setStatus(t('invalid')); urlInput.focus(); return; }
    if (state.urls.includes(url)) { setStatus(t('duplicate')); return; }
    if (state.urls.length >= 100) { setStatus(t('limit')); return; }
    if (!sources.has(url)) { const item = { name: name.slice(0, 40), url }; state.custom.push(item); customSource(item); }
    if (add(url)) { event.target.reset(); event.target.closest('details').open = false; }
  });
  const feedback = node('div', 'card-favorite-feedback');
  feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
  document.body.append(feedback);
  let feedbackTimer;
  document.addEventListener('click', event => {
    const button = event.target.closest('.card-favorite-toggle');
    if (!button) return;
    event.preventDefault(); event.stopPropagation();
    const url = button.dataset.favoriteUrl;
    if (state.urls.includes(url)) {
      state.urls = state.urls.filter(value => value !== url);
      state.custom = state.custom.filter(item => item.url !== url);
      save(t('removed'));
    } else { add(url); }
    feedback.textContent = status.textContent;
    feedback.classList.add('is-visible');
    window.clearTimeout(feedbackTimer);
    feedbackTimer = window.setTimeout(() => { feedback.classList.remove('is-visible'); feedback.textContent = ''; }, 2200);
    const current = button.isConnected && button.getClientRects().length ? button :
      [...document.querySelectorAll('.card-favorite-toggle')].find(item => item.dataset.favoriteUrl === url && item.getClientRects().length);
    (current || document.querySelector('.favorite-manage'))?.focus({ preventScroll: true });
  });
  const heading = container.closest('.sub-column').querySelector('h3');
  heading.classList.add('has-favorite-manager');
  const manage = node('button', 'favorite-manage');
  manage.type = 'button'; manage.append(icon('star'), node('span', '', t('manage'))); manage.setAttribute('aria-label', t('manage')); manage.title = t('manage');
  manage.addEventListener('click', () => window.DirectoryTools.openSettings('favorites'));
  heading.append(manage);
  window.PersonalNav = { selectSection, renderPinned };
  renderList(); renderPicker(); renderPinned();
  window.addEventListener('langchange', () => {
    manage.querySelector('span').textContent = t('manage'); manage.title = t('manage'); manage.setAttribute('aria-label', t('manage'));
    renderList(); renderPicker(); renderPinned(); setStatus('');
  });
})();
