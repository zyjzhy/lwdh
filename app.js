        (() => {
            'use strict';

            const sidebar = document.getElementById('sidebar');
            const content = document.getElementById('content');
            const toggleButton = document.getElementById('toggle-sidebar');
            const searchInput = document.getElementById('search-input');
            const searchButton = document.getElementById('search-button');
            const searchHistoryContainer = document.getElementById('search-history');
            const searchFeedback = document.getElementById('search-feedback');
            const searchFeedbackText = document.getElementById('search-feedback-text');
            const clearSearchFilterButton = document.getElementById('clear-search-filter');
            const searchTabs = Array.from(document.querySelectorAll('#search-tabs button'));
            const navLinks = Array.from(document.querySelectorAll('#sidebar a[data-target], .nav-link[data-target]'));
            const columns = Array.from(document.querySelectorAll('.column'));
            const aboutModal = document.getElementById('about-modal');
            const announcement = document.getElementById('announcement');
            const contactModal = document.getElementById('contact-author-modal');
            const settingsModal = document.getElementById('settings-modal');
            const scrollTopBtn = document.getElementById('scroll-to-top');
            const commonRecommendationContainer = document.getElementById('common-recommendations');
            const feedbackForm = document.getElementById('feedback-form');
            const feedbackStatus = document.getElementById('feedback-status');
            const feedbackButton = contactModal?.querySelector('.modal-footer button');
            const aboutButtons = Array.from(document.querySelectorAll('.about-open'));
            const themeCycleButtons = Array.from(document.querySelectorAll('.theme-cycle'));
            const settingsButtons = Array.from(document.querySelectorAll('.settings-open'));
            const themeOptionButtons = Array.from(document.querySelectorAll('[data-theme-option]'));
            const paletteOptionButtons = Array.from(document.querySelectorAll('[data-palette-option]'));
            const backgroundOptionButtons = Array.from(document.querySelectorAll('[data-bg-option]'));
            const announcementKey = 'zz-nav-announcement-2026-07';
            const themeKey = 'zz-nav-theme-mode';
            const paletteKey = 'zz-nav-palette-mode';
            const backgroundKey = 'zz-nav-background-mode';
            const searchHistoryKey = 'zz-nav-search-history';
            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
            const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
            const themeOrder = ['auto', 'light', 'dark'];
            const paletteOrder = ['rose', 'ocean', 'forest', 'violet', 'sunset', 'graphite', 'aurora', 'peach', 'mint'];
            const backgroundOrder = ['study', 'none', 'desk', 'sky', 'green', 'campus', 'peak', 'library', 'coast', 'window', 'notebook', 'nightdesk', 'mountain', 'forest', 'night', 'autumn', 'sunset', 'ocean', 'lantern', 'mist', 'ridge', 'starry', 'space', 'sunrise', 'meadow', 'custom'];
            const bgRotateModeKey = 'zz-nav-bg-rotate-mode';
            const dailyBgIndexKey = 'zz-nav-daily-bg-index';
            const dailyBgDateKey = 'zz-nav-daily-bg-date';
            const rotateBackgrounds = ['study', 'desk', 'sky', 'green', 'campus', 'peak', 'library', 'coast', 'window', 'notebook', 'nightdesk', 'mountain', 'forest', 'night', 'autumn', 'sunset', 'ocean', 'lantern', 'mist', 'ridge', 'starry', 'space', 'sunrise', 'meadow'];
            const weeklyBgIndexKey = 'zz-nav-weekly-bg-index';
            const weeklyBgWeekKey = 'zz-nav-weekly-bg-week';

            const emailConfig = {
                publicKey: 'ZqKUJXh-0iqkAEsVV',
                serviceId: 'service_ob2v3ek',
                templateId: 'template_klhycbc'
            };

            let activeEngine = searchTabs.find(tab => tab.classList.contains('active'))?.dataset.engine
                || searchTabs[0]?.dataset.engine
                || 'https://cn.bing.com/search?q=';
            let activeThemeChoice = 'auto';
            let activePaletteChoice = 'rose';
            let activeBackgroundChoice = 'study';
            let searchHistoryItems = [];
            let emailLoadPromise = null;
            let scrollSpyTicking = false;

            function iconHref(name) {
                return `#icon-${name}`;
            }

            function setSvgIcon(icon, name) {
                if (!icon) return;
                let use = icon.querySelector('use');
                if (!use) {
                    use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                    icon.appendChild(use);
                }
                use.setAttribute('href', iconHref(name));
            }

            function createSvgIcon(name, extraClass = '') {
                const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                icon.classList.add('svg-icon');
                extraClass.split(/\s+/).filter(Boolean).forEach(className => icon.classList.add(className));
                icon.setAttribute('aria-hidden', 'true');
                icon.setAttribute('focusable', 'false');
                setSvgIcon(icon, name);
                return icon;
            }

            function ensureSvgIcon(container, name, extraClass = '') {
                let icon = container.querySelector('.svg-icon');
                if (!icon) {
                    icon = createSvgIcon(name, extraClass);
                    container.prepend(icon);
                } else {
                    extraClass.split(/\s+/).filter(Boolean).forEach(className => icon.classList.add(className));
                    setSvgIcon(icon, name);
                }
                return icon;
            }

            function svgIconMarkup(name, extraClass = '') {
                const className = ['svg-icon', ...extraClass.split(/\s+/).filter(Boolean)].join(' ');
                return `<svg class="${className}" aria-hidden="true" focusable="false"><use href="${iconHref(name)}"></use></svg>`;
            }

            function storageGet(key) {
                try {
                    return localStorage.getItem(key);
                } catch (error) {
                    return null;
                }
            }

            function storageSet(key, value) {
                try {
                    localStorage.setItem(key, value);
                } catch (error) {
                    // 隐私模式下可能禁用 localStorage，忽略即可。
                }
            }

            function storageRemove(key) {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    // 隐私模式下可能禁用 localStorage，忽略即可。
                }
            }

            const SEARCH_HISTORY_LIMIT = 10;

            function loadSearchHistory() {
                try {
                    const parsed = JSON.parse(storageGet(searchHistoryKey) || '[]');
                    return Array.isArray(parsed)
                        ? parsed.filter(item => typeof item === 'string' && item.trim()).slice(0, SEARCH_HISTORY_LIMIT)
                        : [];
                } catch (error) {
                    return [];
                }
            }

            function saveSearchHistory() {
                storageSet(searchHistoryKey, JSON.stringify(searchHistoryItems.slice(0, SEARCH_HISTORY_LIMIT)));
            }

            function renderSearchHistory() {
                if (!searchHistoryContainer) {
                    return;
                }

                searchHistoryContainer.innerHTML = '';
                searchHistoryContainer.hidden = searchHistoryItems.length === 0;

                searchHistoryItems.forEach(term => {
                    const item = document.createElement('div');
                    item.className = 'search-token';

                    const textButton = document.createElement('button');
                    textButton.type = 'button';
                    textButton.className = 'search-token-text';
                    textButton.textContent = term;
                    textButton.title = term;
                    textButton.addEventListener('click', () => {
                        if (!searchInput) return;
                        searchInput.value = term;
                        filterCards();
                        searchInput.focus();
                    });

                    const removeButton = document.createElement('button');
                    removeButton.type = 'button';
                    removeButton.className = 'search-token-remove';
                    removeButton.setAttribute('aria-label', `删除搜索内容：${term}`);
                    removeButton.appendChild(createSvgIcon('x'));
                    removeButton.addEventListener('click', () => {
                        searchHistoryItems = searchHistoryItems.filter(item => item !== term);
                        saveSearchHistory();
                        renderSearchHistory();
                    });

                    const searchButton = document.createElement('button');
                    searchButton.type = 'button';
                    searchButton.className = 'search-token-search';
                    searchButton.setAttribute('aria-label', `搜索：${term}`);
                    searchButton.appendChild(createSvgIcon('search'));
                    searchButton.addEventListener('click', () => {
                        rememberSearchTerm(term);
                        openSearchTerm(term);
                    });

                    item.append(textButton, removeButton, searchButton);
                    searchHistoryContainer.appendChild(item);
                });

            }

            function rememberSearchTerm(term) {
                const normalized = term.trim().replace(/\s+/g, ' ');
                if (!normalized) return;

                searchHistoryItems = [
                    normalized,
                    ...searchHistoryItems.filter(item => item.toLowerCase() !== normalized.toLowerCase())
                ].slice(0, SEARCH_HISTORY_LIMIT);
                saveSearchHistory();
                renderSearchHistory();
            }

            function openSearchTerm(term) {
                const query = term.trim();
                if (!query) return;
                window.open(activeEngine + encodeURIComponent(query), '_blank', 'noopener');
            }

            // === 使用频率追踪 ===
            const CLICK_COUNT_KEY = 'zz-nav-click-counts';
            const COMMON_RECOMMENDATION_LIMIT = 20;

            function getClickCounts() {
                try {
                    return JSON.parse(localStorage.getItem(CLICK_COUNT_KEY)) || {};
                } catch (e) {
                    return {};
                }
            }

            function saveClickCounts(counts) {
                try {
                    localStorage.setItem(CLICK_COUNT_KEY, JSON.stringify(counts));
                } catch (e) {}
            }

            function getCardIdentifier(card) {
                const urlMatch = (card.getAttribute('onclick') || '').match(/window\.open\('([^']+)'/);
                if (urlMatch) return urlMatch[1];
                const label = (card.textContent || '').trim().replace(/\s+/g, ' ');
                return label || '';
            }

            function getCardLabel(card) {
                const label = card.querySelector('.card-label')?.textContent || card.textContent || '';
                return label.trim().replace(/\s+/g, ' ');
            }

            function getCardGroupTitle(card) {
                return (card.closest('.sub-column')?.querySelector('h3')?.textContent || '').trim();
            }

            function isCampusServiceCard(card) {
                return getCardGroupTitle(card).includes('校园服务');
            }

            function isPinnedCommonRecommendation(card) {
                return card.closest('#common-recommendations') && card.dataset.commonPinned === 'true';
            }

            function trackCardClick(card) {
                if (isCampusServiceCard(card) || isPinnedCommonRecommendation(card)) return;
                const id = getCardIdentifier(card);
                if (!id) return;
                const counts = getClickCounts();
                counts[id] = (counts[id] || 0) + 1;
                saveClickCounts(counts);
            }

            function getCardClickCount(card) {
                const id = getCardIdentifier(card);
                if (!id) return 0;
                const counts = getClickCounts();
                return counts[id] || 0;
            }

            function getFrequentRecommendationCards() {
                const counts = getClickCounts();
                const seen = new Set();

                return Array.from(document.querySelectorAll('.card'))
                    .filter(card => !card.closest('#common-recommendations'))
                    .filter(card => !isCampusServiceCard(card))
                    .map(card => {
                        const id = getCardIdentifier(card);
                        return {
                            card,
                            id,
                            count: id ? counts[id] || 0 : 0
                        };
                    })
                    .filter(item => {
                        if (!item.id || item.count <= 0 || seen.has(item.id)) {
                            return false;
                        }

                        seen.add(item.id);
                        return true;
                    })
                    .sort((a, b) => b.count - a.count || getCardLabel(a.card).localeCompare(getCardLabel(b.card), 'zh-Hans-CN'))
                    .slice(0, COMMON_RECOMMENDATION_LIMIT);
            }

            function syncFrequentRecommendationIcon(sourceCard, clone, label) {
                const sourceImg = sourceCard.querySelector('img');
                let cloneImg = clone.querySelector('img');

                if (!cloneImg) {
                    cloneImg = document.createElement('img');
                    clone.insertBefore(cloneImg, clone.firstChild);
                }

                cloneImg.loading = 'lazy';
                cloneImg.decoding = 'async';
                cloneImg.referrerPolicy = 'no-referrer';
                cloneImg.alt = sourceImg?.alt || `${label} 图标`;
                cloneImg.removeAttribute('srcset');
                cloneImg.classList.remove('fallback-icon');
                delete cloneImg.dataset.fallbackApplied;
                delete cloneImg.dataset.originalSrc;
                cloneImg.addEventListener('error', () => applyFallbackIcon(cloneImg, label));

                if (!sourceImg) {
                    applyFallbackIcon(cloneImg, label);
                    return;
                }

                const sourceCurrentSrc = sourceImg.currentSrc || sourceImg.src || '';
                const sourceOriginalSrc = sourceImg.dataset.originalSrc || sourceImg.getAttribute('src') || sourceCurrentSrc;
                const sourceHasRealIcon = sourceCurrentSrc &&
                    !sourceCurrentSrc.startsWith('data:image/svg+xml') &&
                    !sourceImg.classList.contains('fallback-icon') &&
                    !sourceImg.dataset.fallbackApplied;

                if (sourceHasRealIcon) {
                    cloneImg.src = sourceCurrentSrc;
                    return;
                }

                if (sourceImg.dataset.fallbackApplied || !sourceOriginalSrc || sourceOriginalSrc.startsWith('data:image/svg+xml')) {
                    applyFallbackIcon(cloneImg, label);
                    return;
                }

                cloneImg.dataset.originalSrc = sourceOriginalSrc;
                cloneImg.classList.add('fallback-icon');
                cloneImg.src = createFallbackIcon(label);

                const probe = new Image();
                probe.decoding = 'async';
                probe.referrerPolicy = 'no-referrer';
                probe.onload = () => {
                    if (probe.naturalWidth > 0) {
                        cloneImg.classList.remove('fallback-icon');
                        cloneImg.src = sourceOriginalSrc;
                        return;
                    }

                    applyFallbackIcon(cloneImg, label);
                };
                probe.onerror = () => applyFallbackIcon(cloneImg, label);
                probe.src = sourceOriginalSrc;
            }

            function createFrequentRecommendationCard(sourceCard, clickCount) {
                const clone = sourceCard.cloneNode(true);
                const label = getCardLabel(clone);
                clone.removeAttribute('id');
                clone.classList.add('frequent-recommendation-card');
                clone.dataset.frequentClone = 'true';
                syncFrequentRecommendationIcon(sourceCard, clone, label);

                clone.querySelectorAll('.frequent-count').forEach(badge => badge.remove());

                const badge = document.createElement('span');
                badge.className = 'frequent-count';
                badge.textContent = `${clickCount}`;
                badge.setAttribute('aria-hidden', 'true');
                clone.appendChild(badge);

                clone.setAttribute('aria-label', `${label}，已点击 ${clickCount} 次`);
                return clone;
            }

            function renderCommonRecommendations() {
                if (!commonRecommendationContainer) return;

                const pinnedCards = Array.from(commonRecommendationContainer.querySelectorAll('[data-common-pinned="true"]'));
                commonRecommendationContainer
                    .querySelectorAll('.frequent-recommendation-card')
                    .forEach(card => card.remove());

                getFrequentRecommendationCards().forEach(({ card, count }) => {
                    commonRecommendationContainer.appendChild(createFrequentRecommendationCard(card, count));
                });

                pinnedCards.forEach(card => commonRecommendationContainer.appendChild(card));
            }

            function sortDynamicSection(container) {
                if (!container) return;
                if (container.id === 'common-recommendations') return;

                const subColumn = container.closest('.sub-column');
                if (!subColumn) return;
                const heading = (subColumn.querySelector('h3')?.textContent || '');
                if (heading.includes('学校') || heading.includes('校园') || heading.includes('私用')) return;

                const cards = Array.from(container.querySelectorAll(':scope > .card'));
                cards.sort((a, b) => {
                    return getCardClickCount(b) - getCardClickCount(a);
                });

                cards.forEach(card => container.appendChild(card));
            }

            function initEmailService() {
                if (window.__zzNavEmailReady) {
                    return true;
                }

                if (!window.emailjs?.init) {
                    return false;
                }

                try {
                    window.emailjs.init(emailConfig.publicKey);
                    window.__zzNavEmailReady = true;
                    return true;
                } catch (error) {
                    console.warn('EmailJS 初始化失败:', error);
                    return false;
                }
            }

            function loadEmailServiceFallback() {
                if (window.emailjs?.send) {
                    return Promise.resolve(initEmailService());
                }

                if (emailLoadPromise) {
                    return emailLoadPromise;
                }

                emailLoadPromise = new Promise(resolve => {
                    let settled = false;
                    const finish = ok => {
                        if (!settled) {
                            settled = true;
                            resolve(ok);
                        }
                    };
                    const script = document.createElement('script');
                    script.src = 'https://unpkg.com/@emailjs/browser@3/dist/email.min.js';
                    script.async = true;
                    script.onload = () => finish(initEmailService());
                    script.onerror = () => finish(false);
                    document.head.appendChild(script);
                    window.setTimeout(() => finish(initEmailService()), 3500);
                });

                return emailLoadPromise;
            }

            async function ensureEmailService() {
                if (initEmailService()) {
                    return true;
                }

                await new Promise(resolve => window.setTimeout(resolve, 160));
                if (initEmailService()) {
                    return true;
                }

                return loadEmailServiceFallback();
            }

            function updateSidebarToggle() {
                if (!toggleButton || !sidebar) {
                    return;
                }

                const isHidden = sidebar.classList.contains('hidden');
                const label = isHidden ? '展开侧边导航' : '收起侧边导航';
                toggleButton.setAttribute('aria-label', label);
                toggleButton.setAttribute('aria-expanded', String(!isHidden));
                toggleButton.title = label;
                ensureSvgIcon(toggleButton, isHidden ? 'angle-right' : 'angle-left');
            }

            function resolveTheme(choice) {
                return choice === 'dark' || (choice === 'auto' && systemDarkMode.matches) ? 'dark' : 'light';
            }

            function themeLabel(choice) {
                const labels = {
                    auto: '自动',
                    light: '白天',
                    dark: '黑夜'
                };
                return labels[choice] || labels.auto;
            }

            function themeIcon(choice, resolved) {
                if (choice === 'auto') {
                    return 'wand-magic-sparkles';
                }
                return resolved === 'dark' ? 'moon' : 'sun';
            }

            function applyTheme(choice = 'auto', shouldSave = true) {
                activeThemeChoice = themeOrder.includes(choice) ? choice : 'auto';
                const resolved = resolveTheme(activeThemeChoice);

                document.documentElement.dataset.theme = resolved;
                document.documentElement.dataset.themeChoice = activeThemeChoice;

                if (shouldSave) {
                    storageSet(themeKey, activeThemeChoice);
                }

                themeCycleButtons.forEach(button => {
                    ensureSvgIcon(button, themeIcon(activeThemeChoice, resolved));
                    button.setAttribute('aria-label', `当前${themeLabel(activeThemeChoice)}模式，点击切换主题`);
                    button.title = `当前${themeLabel(activeThemeChoice)}模式`;
                    var label = button.querySelector('.sidebar-label');
                    if (label) label.textContent = themeLabel(activeThemeChoice);
                });

                themeOptionButtons.forEach(button => {
                    const isActive = button.dataset.themeOption === activeThemeChoice;
                    button.classList.toggle('active', isActive);
                    button.setAttribute('aria-pressed', String(isActive));
                });
            }

            function cycleTheme() {
                const currentIndex = themeOrder.indexOf(activeThemeChoice);
                const nextChoice = themeOrder[(currentIndex + 1 + themeOrder.length) % themeOrder.length];
                applyTheme(nextChoice);
            }

            function initTheme() {
                applyTheme(storageGet(themeKey) || 'auto', false);
                systemDarkMode.addEventListener('change', () => {
                    if (activeThemeChoice === 'auto') {
                        applyTheme('auto', false);
                    }
                });
            }

            function applyPalette(choice = 'rose', shouldSave = true) {
                activePaletteChoice = paletteOrder.includes(choice) ? choice : 'rose';
                document.documentElement.dataset.palette = activePaletteChoice;

                if (shouldSave) {
                    storageSet(paletteKey, activePaletteChoice);
                }

                paletteOptionButtons.forEach(button => {
                    const isActive = button.dataset.paletteOption === activePaletteChoice;
                    button.classList.toggle('active', isActive);
                    button.setAttribute('aria-pressed', String(isActive));
                });
            }

            function applyBackground(choice = 'study', shouldSave = true) {
                activeBackgroundChoice = backgroundOrder.includes(choice) ? choice : 'study';
                document.documentElement.dataset.bg = activeBackgroundChoice;

                if (shouldSave) {
                    storageSet(backgroundKey, activeBackgroundChoice);
                }

                backgroundOptionButtons.forEach(button => {
                    const isActive = button.dataset.bgOption === activeBackgroundChoice;
                    button.classList.toggle('active', isActive);
                    button.setAttribute('aria-pressed', String(isActive));
                });
            }

            function todayString() {
                const d = new Date();
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }

            function getWeekId() {
                const d = new Date();
                const jan1 = new Date(d.getFullYear(), 0, 1);
                const days = Math.floor((d - jan1) / 86400000);
                return `${d.getFullYear()}-W${String(Math.ceil((days + jan1.getDay() + 1) / 7)).padStart(2, '0')}`;
            }

            function getBgRotateMode() {
                const old = storageGet('zz-nav-auto-rotate');
                if (old === '1') return 'daily';
                if (old === '0') return 'fixed';
                return storageGet(bgRotateModeKey) || 'fixed';
            }

            function setBgRotateMode(mode) {
                storageSet(bgRotateModeKey, mode);
                storageRemove('zz-nav-auto-rotate');
                const sel = document.getElementById('bg-rotate-mode');
                if (sel) sel.value = mode;
            }

            function advanceBgByMode() {
                const mode = getBgRotateMode();
                if (mode === 'fixed') return;

                if (mode === 'refresh') {
                    const idx = Math.floor(Math.random() * rotateBackgrounds.length);
                    applyBackground(rotateBackgrounds[idx], false);
                    return;
                }

                if (mode === 'daily') {
                    const lastDate = storageGet(dailyBgDateKey) || '';
                    const today = todayString();
                    if (lastDate === today) {
                        const savedIdx = parseInt(storageGet(dailyBgIndexKey), 10);
                        if (!isNaN(savedIdx) && rotateBackgrounds[savedIdx]) {
                            applyBackground(rotateBackgrounds[savedIdx], false);
                        }
                        return;
                    }
                    const lastIdx = parseInt(storageGet(dailyBgIndexKey), 10);
                    const nextIdx = isNaN(lastIdx) ? 0 : (lastIdx + 1) % rotateBackgrounds.length;
                    storageSet(dailyBgIndexKey, String(nextIdx));
                    storageSet(dailyBgDateKey, today);
                    applyBackground(rotateBackgrounds[nextIdx], false);
                    return;
                }

                if (mode === 'weekly') {
                    const currentWeek = getWeekId();
                    const savedWeek = storageGet(weeklyBgWeekKey) || '';
                    if (savedWeek === currentWeek) {
                        const savedIdx = parseInt(storageGet(weeklyBgIndexKey), 10);
                        if (!isNaN(savedIdx) && rotateBackgrounds[savedIdx]) {
                            applyBackground(rotateBackgrounds[savedIdx], false);
                        }
                        return;
                    }
                    const lastIdx = parseInt(storageGet(weeklyBgIndexKey), 10);
                    const nextIdx = isNaN(lastIdx) ? 0 : (lastIdx + 1) % rotateBackgrounds.length;
                    storageSet(weeklyBgIndexKey, String(nextIdx));
                    storageSet(weeklyBgWeekKey, currentWeek);
                    applyBackground(rotateBackgrounds[nextIdx], false);
                }
            }

            function setCustomBackground(dataUrl) {
                if (!dataUrl) {
                    document.documentElement.style.setProperty('--custom-background-image', 'none');
                    delete document.documentElement.dataset.hasCustomBg;
                    return;
                }

                document.documentElement.style.setProperty('--custom-background-image', `url("${dataUrl}")`);
                document.documentElement.dataset.hasCustomBg = 'true';
            }

            function handleCustomBackground(file) {
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function(e) {
                    const dataUrl = e.target.result;
                    storageSet('zz-nav-custom-bg', dataUrl);
                    setCustomBackground(dataUrl);
                    applyBackground('custom');
                };
                reader.readAsDataURL(file);
            }

            function initDisplayPreferences() {
                initTheme();
                applyPalette(storageGet(paletteKey) || 'rose', false);
                var customBg = storageGet('zz-nav-custom-bg');
                setCustomBackground(customBg);
                var savedBg = customBg ? 'custom' : (storageGet(backgroundKey) || 'study');
                applyBackground(savedBg, false);
                var sel = document.getElementById('bg-rotate-mode');
                if (sel) sel.value = getBgRotateMode();
                window.setTimeout(advanceBgByMode, 1000);
            }

            function activeColumn() {
                return document.querySelector('.column.active:not(.is-filtered-out)')
                    || columns.find(column => !column.classList.contains('is-filtered-out'))
                    || document.getElementById('offen-links')
                    || columns[0];
            }

            function getSubColumns(column) {
                if (!column) {
                    return [];
                }

                return Array.from(column.querySelectorAll(':scope > .sub-column'));
            }

            function getTabLabel(subColumn, index, moduleName) {
                const headingText = subColumn.querySelector('h3')?.textContent || '';
                let label = headingText.trim().replace(/\s+/g, ' ') || `分组 ${index + 1}`;
                if (moduleName) {
                    if (label.startsWith(moduleName)) {
                        label = label.slice(moduleName.length).trim();
                    } else if (label.endsWith(moduleName)) {
                        label = label.slice(0, -moduleName.length).trim();
                    }
                }
                return label || `分组 ${index + 1}`;
            }

            function setActiveSubColumn(column, subColumnId) {
                const subColumns = getSubColumns(column);
                if (!column || !subColumns.length) {
                    return;
                }

                const target = subColumns.find(group => group.id === subColumnId) || subColumns[0];

                column.querySelectorAll('.module-tab').forEach(tab => {
                    const isActive = tab.dataset.subTarget === target.id;
                    tab.classList.toggle('active', isActive);
                    tab.setAttribute('aria-selected', String(isActive));
                    tab.tabIndex = isActive ? 0 : -1;
                });

                subColumns.forEach(group => {
                    const isActive = group === target;
                    group.classList.toggle('is-tab-hidden', !isActive);
                    group.setAttribute('aria-hidden', String(!isActive));
                });
            }

            function restoreModuleTabs() {
                columns.forEach(column => {
                    const activeTab = column.querySelector('.module-tab.active');
                    if (activeTab) {
                        setActiveSubColumn(column, activeTab.dataset.subTarget);
                    }
                });
            }

            function setupModuleTabs() {
                columns.forEach(column => {
                    const subColumns = getSubColumns(column);
                    if (subColumns.length <= 1 || column.hasAttribute('data-no-tabs') || column.querySelector(':scope > .module-tabs')) {
                        return;
                    }

                    const tabs = document.createElement('div');
                    tabs.className = 'module-tabs';
                    tabs.setAttribute('role', 'tablist');
                    tabs.setAttribute('aria-label', '模块分组');

                    const navLink = document.querySelector(`.nav-link[data-target="${column.id}"]`);
                    const moduleName = navLink ? navLink.textContent.trim() : '';
                    if (moduleName) {
                        const label = document.createElement('span');
                        label.className = 'module-label';
                        label.innerHTML = navLink.innerHTML.trim();
                        tabs.appendChild(label);
                        const sep = document.createElement('span');
                        sep.className = 'module-sep';
                        sep.textContent = '|';
                        tabs.appendChild(sep);
                    }

                    subColumns.forEach((subColumn, index) => {
                        if (!subColumn.id) {
                            subColumn.id = `${column.id || 'module'}-sub-${index + 1}`;
                        }

                        const tab = document.createElement('button');
                        tab.type = 'button';
                        tab.className = 'module-tab';
                        tab.dataset.subTarget = subColumn.id;
                        tab.textContent = getTabLabel(subColumn, index, moduleName);
                        tab.setAttribute('role', 'tab');
                        tab.setAttribute('aria-controls', subColumn.id);
                        tab.addEventListener('click', () => setActiveSubColumn(column, subColumn.id));

                        subColumn.setAttribute('role', 'tabpanel');
                        subColumn.setAttribute('tabindex', '0');
                        tabs.appendChild(tab);
                    });

                    column.insertBefore(tabs, subColumns[0]);
                    setActiveSubColumn(column, subColumns[0].id);
                });
            }

            function resetColumnFilters(column) {
                if (!column) {
                    return;
                }

                column.classList.remove('search-empty', 'is-filtered-out');
                column.querySelectorAll('.card.is-hidden').forEach(card => card.classList.remove('is-hidden'));
                column.querySelectorAll('.sub-column.is-empty').forEach(group => group.classList.remove('is-empty'));
            }

            function setSearchFeedback(query, matchCount, moduleCount) {
                if (!searchFeedback) return;

                const isSearching = Boolean(query);
                searchFeedback.hidden = !isSearching;
                searchFeedback.classList.toggle('is-empty', isSearching && matchCount === 0);

                if (!searchFeedbackText) return;

                if (!isSearching) {
                    searchFeedbackText.textContent = '';
                    return;
                }

                searchFeedbackText.textContent = matchCount > 0
                    ? `找到 ${matchCount} 个网站，来自 ${moduleCount} 个模块`
                    : `没有找到与“${query}”匹配的网站`;
            }

            function clearSearchFilter() {
                document.body.classList.remove('searching', 'search-has-results', 'search-no-results');
                columns.forEach(resetColumnFilters);
                navLinks.forEach(link => link.classList.remove('search-filtered-out'));
                setSearchFeedback('', 0, 0);
                restoreModuleTabs();
            }

            function filterCards() {
                const rawQuery = searchInput?.value.trim() || '';
                const query = rawQuery.toLowerCase();

                if (!query) {
                    clearSearchFilter();
                    return;
                }

                let totalVisible = 0;
                const matchedColumns = [];
                document.body.classList.add('searching');

                columns.forEach(column => {
                    let columnVisible = 0;

                    getSubColumns(column).forEach(group => {
                        let groupVisible = 0;
                        group.setAttribute('aria-hidden', 'false');

                        group.querySelectorAll('.card').forEach(card => {
                            const searchableText = [
                                card.textContent,
                                card.dataset.tooltip,
                                card.getAttribute('aria-label')
                            ].join(' ').toLowerCase();
                            const isMatch = searchableText.includes(query);

                            card.classList.toggle('is-hidden', !isMatch);
                            if (isMatch) {
                                groupVisible += 1;
                                columnVisible += 1;
                            }
                        });

                        group.classList.toggle('is-empty', groupVisible === 0);
                    });

                    column.classList.remove('search-empty');
                    column.classList.toggle('is-filtered-out', columnVisible === 0);
                    if (columnVisible > 0) {
                        totalVisible += columnVisible;
                        matchedColumns.push(column);
                    }
                });

                navLinks.forEach(link => {
                    const target = document.getElementById(link.dataset.target);
                    link.classList.toggle('search-filtered-out', Boolean(target?.classList.contains('is-filtered-out')));
                });

                document.body.classList.toggle('search-has-results', totalVisible > 0);
                document.body.classList.toggle('search-no-results', totalVisible === 0);
                setSearchFeedback(rawQuery, totalVisible, matchedColumns.length);

                const active = document.querySelector('.column.active');
                if (matchedColumns.length && (!active || active.classList.contains('is-filtered-out'))) {
                    markActiveColumn(matchedColumns[0].id);
                }
            }

            function markActiveColumn(targetId) {
                const target = document.getElementById(targetId);
                if (!target) {
                    return;
                }

                columns.forEach(column => {
                    column.classList.toggle('active', column === target);
                });

                navLinks.forEach(link => {
                    const isActive = link.dataset.target === targetId;
                    link.classList.toggle('active', isActive);
                    link.toggleAttribute('aria-current', isActive);
                });
            }

            function smoothScrollTo(target) {
                if (reducedMotion.matches) {
                    target.scrollIntoView({ block: 'start' });
                    return;
                }
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            function setActiveColumn(targetId, shouldScroll = true) {
                const target = document.getElementById(targetId);
                if (!target) {
                    return;
                }

                markActiveColumn(targetId);

                if (shouldScroll) {
                    smoothScrollTo(target);
                }
            }

            function updateActiveSectionFromScroll() {
                const threshold = Math.min(window.innerHeight * 0.35, 260);
                const visibleColumns = columns.filter(column => !column.classList.contains('is-filtered-out'));
                let current = visibleColumns[0];

                if (!current) {
                    return;
                }

                visibleColumns.forEach(column => {
                    if (column.getBoundingClientRect().top <= threshold) {
                        current = column;
                    }
                });

                if (current?.id) {
                    markActiveColumn(current.id);
                }
            }

            function requestActiveSectionUpdate() {
                if (scrollSpyTicking) {
                    return;
                }

                scrollSpyTicking = true;
                window.requestAnimationFrame(() => {
                    scrollSpyTicking = false;
                    updateActiveSectionFromScroll();
                });
            }

            function performExternalSearch() {
                const query = searchInput?.value.trim() || '';

                if (!query) {
                    searchInput?.focus();
                    return;
                }

                rememberSearchTerm(query);
                openSearchTerm(query);
                searchInput.value = '';
                filterCards();
            }

            function hasOpenModal() {
                return [aboutModal, announcement, contactModal, settingsModal].some(modal => modal?.classList.contains('show'));
            }

            function lockPageScroll() {
                if (document.body.classList.contains('modal-open')) {
                    return;
                }

                document.body.classList.add('modal-open');
            }

            function unlockPageScroll() {
                document.body.classList.remove('modal-open');
            }

            function showModal(modal) {
                if (!modal) {
                    return;
                }

                lockPageScroll();
                modal.style.display = 'block';
                modal.setAttribute('role', 'dialog');
                modal.setAttribute('aria-modal', 'true');
                requestAnimationFrame(() => modal.classList.add('show'));
            }

            function hideModal(modal) {
                if (!modal) {
                    return;
                }

                modal.classList.remove('show');
                window.setTimeout(() => {
                    modal.style.display = 'none';
                    if (!hasOpenModal()) {
                        unlockPageScroll();
                    }
                }, reducedMotion.matches ? 0 : 180);
            }

            function closeAnnouncement(remember = true) {
                if (remember) {
                    storageSet(announcementKey, 'seen');
                }
                hideModal(announcement);
            }

            function openAboutModal() {
                showModal(aboutModal);
                window.setTimeout(() => aboutModal?.querySelector('.modal-close')?.focus(), 80);
            }

            function closeAboutModal() {
                hideModal(aboutModal);
            }

            function openContactModal() {
                showModal(contactModal);
                window.setTimeout(() => document.getElementById('message')?.focus(), 80);
            }

            function closeContactModal() {
                hideModal(contactModal);
            }

            function openSettingsModal() {
                showModal(settingsModal);
                window.setTimeout(() => settingsModal?.querySelector('.theme-option.active')?.focus(), 80);
            }

            function closeSettingsModal() {
                hideModal(settingsModal);
            }

            function setFeedbackStatus(message, type = 'neutral') {
                if (!feedbackStatus) {
                    return;
                }

                const colors = {
                    neutral: 'var(--text-light)',
                    success: '#067647',
                    error: '#b42318'
                };

                feedbackStatus.textContent = message;
                feedbackStatus.style.color = colors[type] || colors.neutral;
            }

            async function sendFeedback() {
                const message = document.getElementById('message')?.value.trim() || '';
                const fromName = document.getElementById('from_name')?.value.trim() || '匿名用户';
                const replyTo = document.getElementById('reply_to')?.value.trim()
                    || `no-reply@${location.hostname || 'local.zz-nav'}`;
                const originalButtonHtml = `${svgIconMarkup('paper-plane', 'feedback-button-icon')} 发送反馈`;

                if (!message) {
                    setFeedbackStatus('请先填写反馈内容。', 'error');
                    document.getElementById('message')?.focus();
                    return;
                }

                const emailReady = await ensureEmailService();
                if (!emailReady || !window.emailjs?.send) {
                    setFeedbackStatus('邮件服务加载失败，请检查网络或浏览器拦截后再试。', 'error');
                    return;
                }

                if (feedbackButton) {
                    feedbackButton.disabled = true;
                    feedbackButton.innerHTML = `${svgIconMarkup('spinner', 'feedback-button-icon icon-spin')} 发送中...`;
                }
                setFeedbackStatus('正在发送反馈...', 'neutral');

                try {
                    await window.emailjs.send(emailConfig.serviceId, emailConfig.templateId, {
                        message,
                        from_name: fromName,
                        reply_to: replyTo,
                        page_url: location.href
                    }, emailConfig.publicKey);
                    feedbackForm?.reset();
                    setFeedbackStatus('反馈已发送，感谢你的建议。', 'success');
                    window.setTimeout(closeContactModal, 800);
                } catch (error) {
                    console.error('邮件发送失败:', error);
                    setFeedbackStatus(`发送失败：${error?.text || '请检查网络连接后重试。'}`, 'error');
                } finally {
                    if (feedbackButton) {
                        feedbackButton.disabled = false;
                        feedbackButton.innerHTML = originalButtonHtml;
                    }
                }
            }

            function scrollToTop() {
                window.scrollTo({
                    top: 0,
                    behavior: reducedMotion.matches ? 'auto' : 'smooth'
                });
            }

            function createDesktopShortcut() {
                const canonicalLink = document.querySelector('link[rel="canonical"]');
                const canonicalUrl = canonicalLink?.href || '';
                const shortcutUrl = location.protocol === 'file:' && canonicalUrl ? canonicalUrl : location.href;
                const fallbackName = '知径导航';
                const pageTitle = (document.title || fallbackName).replace(/\s*-\s*.*/, '').trim();
                const shortcutName = (pageTitle || fallbackName).replace(/[\\/:*?"<>|]/g, '');
                const shortcutContent = [
                    '[InternetShortcut]',
                    `URL=${shortcutUrl}`,
                    ''
                ].join('\r\n');
                const blob = new Blob([shortcutContent], { type: 'application/internet-shortcut' });
                const objectUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');

                link.href = objectUrl;
                link.download = `${shortcutName}.url`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
            }

            function updateScrollButton() {
                if (!scrollTopBtn) {
                    return;
                }

                scrollTopBtn.style.display = window.scrollY > 320 ? 'flex' : 'none';
            }

            function updateCountdown() {
                const now = new Date();

                const getDaysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();
                const getValidCountdownDate = (year, monthIndex, day) => {
                    if (day > getDaysInMonth(year, monthIndex)) {
                        return null;
                    }
                    return new Date(year, monthIndex, day);
                };
                const getDaysLeft = (monthIndex, day) => {
                    let year = now.getFullYear();
                    let target = getValidCountdownDate(year, monthIndex, day);
                    while (!target || now > target) {
                        year += 1;
                        target = getValidCountdownDate(year, monthIndex, day);
                    }
                    return Math.max(0, Math.ceil((target - now) / 86400000));
                };

                var kaoyan = document.getElementById('kaoyan');
                var kaogong = document.getElementById('kaogong');

                var cd1Month = parseInt(storageGet('zz-nav-cd1-month') || '11', 10);
                var cd1Day = parseInt(storageGet('zz-nav-cd1-day') || '22', 10);
                var cd2Month = parseInt(storageGet('zz-nav-cd2-month') || '11', 10);
                var cd2Day = parseInt(storageGet('zz-nav-cd2-day') || '1', 10);

                if (kaoyan) {
                    kaoyan.textContent = getDaysLeft(cd1Month, cd1Day);
                }
                if (kaogong) {
                    kaogong.textContent = getDaysLeft(cd2Month, cd2Day);
                }

                var cd1Label = document.querySelector('.countdown-container:first-child .countdown-days');
                var cd2Label = document.querySelector('.countdown-container:last-child .countdown-days');
                if (cd1Label) {
                    cd1Label.textContent = storageGet('zz-nav-cd1-name') || '考研倒计时';
                }
                if (cd2Label) {
                    cd2Label.textContent = storageGet('zz-nav-cd2-name') || '考公倒计时';
                }
            }

            function initCountdownSettings() {
                var openCustomSelect = null;

                function getReferenceYear(monthIndex) {
                    var now = new Date();
                    var thisYearDate = new Date(now.getFullYear(), monthIndex, 1);
                    return now > thisYearDate ? now.getFullYear() + 1 : now.getFullYear();
                }

                function getDaysInMonth(monthIndex) {
                    return new Date(getReferenceYear(monthIndex), monthIndex + 1, 0).getDate();
                }

                function clearOptions(select) {
                    while (select.firstChild) {
                        select.removeChild(select.firstChild);
                    }
                }

                function fillMonthOptions(monthSelect) {
                    clearOptions(monthSelect);
                    for (var i = 1; i <= 12; i++) {
                        monthSelect.appendChild(new Option(i + '月', String(i - 1)));
                    }
                }

                function fillDayOptions(daySelect, monthIndex, preferredDay) {
                    var dayCount = getDaysInMonth(monthIndex);
                    var safeDay = Math.min(Math.max(parseInt(preferredDay, 10) || 1, 1), dayCount);
                    clearOptions(daySelect);
                    for (var i = 1; i <= dayCount; i++) {
                        daySelect.appendChild(new Option(i + '日', String(i)));
                    }
                    daySelect.value = String(safeDay);
                    return safeDay;
                }

                function refreshCustomSelect(select) {
                    if (select && typeof select.customSelectRefresh === 'function') {
                        select.customSelectRefresh();
                    }
                }

                function closeCustomSelect() {
                    if (openCustomSelect) {
                        openCustomSelect.close();
                        openCustomSelect = null;
                    }
                }

                function handleCustomSelectScroll(event) {
                    if (event.target && event.target.closest && event.target.closest('.custom-select-menu')) {
                        return;
                    }
                    closeCustomSelect();
                }

                function enhanceCustomSelect(select) {
                    if (!select || select.customSelectRefresh) {
                        return;
                    }

                    var wrapper = document.createElement('div');
                    var button = document.createElement('button');
                    var menu = document.createElement('ul');
                    var menuId = select.id + '-menu';

                    wrapper.className = 'select-combobox';
                    button.type = 'button';
                    button.className = 'custom-select-trigger';
                    button.setAttribute('aria-haspopup', 'listbox');
                    button.setAttribute('aria-expanded', 'false');
                    button.setAttribute('aria-controls', menuId);
                    menu.className = 'custom-select-menu';
                    menu.id = menuId;
                    menu.setAttribute('role', 'listbox');
                    menu.hidden = true;

                    select.classList.add('native-select-proxy');
                    select.setAttribute('aria-hidden', 'true');
                    select.tabIndex = -1;
                    select.parentNode.insertBefore(wrapper, select);
                    wrapper.appendChild(select);
                    wrapper.appendChild(button);
                    document.body.appendChild(menu);

                    function syncButton() {
                        var option = select.options[select.selectedIndex];
                        button.textContent = option ? option.textContent : '';
                    }

                    function positionMenu() {
                        var rect = button.getBoundingClientRect();
                        var preferredMaxHeight = 184;
                        var viewportPadding = 8;
                        var spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
                        var spaceAbove = rect.top - viewportPadding;
                        var openAbove = spaceBelow < 132 && spaceAbove > spaceBelow;
                        var availableSpace = openAbove ? spaceAbove : spaceBelow;
                        var menuHeight = Math.max(112, Math.min(preferredMaxHeight, availableSpace));

                        menu.style.left = rect.left + 'px';
                        menu.style.width = rect.width + 'px';
                        menu.style.maxHeight = menuHeight + 'px';
                        menu.style.top = (openAbove ? rect.top - menuHeight - 6 : rect.bottom + 6) + 'px';
                    }

                    function buildMenu() {
                        menu.innerHTML = '';
                        Array.from(select.options).forEach(function(option) {
                            var item = document.createElement('li');
                            item.className = 'custom-select-option';
                            item.setAttribute('role', 'option');
                            item.setAttribute('data-value', option.value);
                            item.setAttribute('aria-selected', option.selected ? 'true' : 'false');
                            item.textContent = option.textContent;
                            if (option.selected) {
                                item.classList.add('active');
                            }
                            item.addEventListener('click', function() {
                                select.value = option.value;
                                select.dispatchEvent(new Event('change', { bubbles: true }));
                                closeCustomSelect();
                                button.focus();
                            });
                            menu.appendChild(item);
                        });
                    }

                    var api = {
                        close: function() {
                            menu.hidden = true;
                            button.setAttribute('aria-expanded', 'false');
                        }
                    };

                    function openMenu() {
                        if (openCustomSelect && openCustomSelect !== api) {
                            openCustomSelect.close();
                        }
                        buildMenu();
                        positionMenu();
                        menu.hidden = false;
                        button.setAttribute('aria-expanded', 'true');
                        openCustomSelect = api;
                        var selectedItem = menu.querySelector('[aria-selected="true"]');
                        if (selectedItem) {
                            selectedItem.scrollIntoView({ block: 'nearest' });
                        }
                    }

                    button.addEventListener('click', function(event) {
                        event.stopPropagation();
                        if (menu.hidden) {
                            openMenu();
                        } else {
                            closeCustomSelect();
                        }
                    });

                    button.addEventListener('keydown', function(event) {
                        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openMenu();
                        } else if (event.key === 'Escape') {
                            closeCustomSelect();
                        }
                    });

                    select.addEventListener('change', function() {
                        syncButton();
                        buildMenu();
                    });

                    select.customSelectRefresh = function() {
                        syncButton();
                        buildMenu();
                    };

                    syncButton();
                    buildMenu();
                }

                document.querySelectorAll('.cd-date-row').forEach(function(row) {
                    var monthSelect = row.querySelector('select');
                    var daySelect = row.querySelectorAll('select')[1];
                    fillMonthOptions(monthSelect);
                    if (monthSelect && daySelect) {
                        monthSelect.addEventListener('change', function() {
                            var safeDay = fillDayOptions(daySelect, parseInt(monthSelect.value, 10), daySelect.value);
                            storageSet('zz-nav-' + daySelect.id, String(safeDay));
                            refreshCustomSelect(daySelect);
                        });
                    }
                });

                function loadOne(prefix, defaultName, defaultMonth, defaultDay) {
                    var nameEl = document.getElementById(prefix + '-name');
                    var monthEl = document.getElementById(prefix + '-month');
                    var dayEl = document.getElementById(prefix + '-day');
                    var storedMonth = storageGet('zz-nav-' + prefix + '-month');
                    var storedDay = storageGet('zz-nav-' + prefix + '-day');
                    var monthValue = Math.min(Math.max(parseInt(storedMonth || defaultMonth, 10), 0), 11);
                    if (nameEl) nameEl.value = storageGet('zz-nav-' + prefix + '-name') || defaultName;
                    if (monthEl) monthEl.value = String(monthValue);
                    if (dayEl) fillDayOptions(dayEl, monthValue, storedDay || defaultDay);
                }

                loadOne('cd1', '考研倒计时', 11, 22);
                loadOne('cd2', '考公倒计时', 11, 1);

                document.querySelectorAll('.countdown-setting-item select').forEach(enhanceCustomSelect);

                document.querySelectorAll('.countdown-setting-item input, .countdown-setting-item select').forEach(function(el) {
                    el.addEventListener('change', function() {
                        var id = this.id;
                        var key = 'zz-nav-' + id;
                        storageSet(key, this.value);
                        updateCountdown();
                    });
                });

                document.addEventListener('click', closeCustomSelect);
                window.addEventListener('resize', closeCustomSelect);
                window.addEventListener('scroll', handleCustomSelectScroll, true);
            }

            function escapeSvgText(value) {
                return String(value)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
            }

            function hashText(value) {
                return Array.from(value || '知径').reduce((hash, char) => {
                    return (hash * 31 + char.codePointAt(0)) >>> 0;
                }, 7);
            }

            function createFallbackIcon(label) {
                const cleanLabel = (label || '网站').trim();
                const firstChar = Array.from(cleanLabel.replace(/\s+/g, ''))[0] || '站';
                const hue = hashText(cleanLabel) % 360;
                const huePair = (hue + 42) % 360;
                const svg = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
                        <defs>
                            <linearGradient id="g" x1="10" y1="8" x2="56" y2="58" gradientUnits="userSpaceOnUse">
                                <stop stop-color="hsl(${hue} 78% 58%)"/>
                                <stop offset="1" stop-color="hsl(${huePair} 82% 48%)"/>
                            </linearGradient>
                        </defs>
                        <rect width="64" height="64" rx="16" fill="url(#g)"/>
                        <circle cx="49" cy="15" r="10" fill="rgba(255,255,255,.2)"/>
                        <text x="32" y="40" text-anchor="middle" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="28" font-weight="800" fill="#fff">${escapeSvgText(firstChar)}</text>
                    </svg>
                `.replace(/\s+/g, ' ').trim();

                return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
            }

            function applyFallbackIcon(img, label) {
                if (!img || img.dataset.fallbackApplied) {
                    return;
                }

                img.dataset.fallbackApplied = 'true';
                img.classList.add('fallback-icon');
                img.alt = `${label || '网站'} 默认图标`;
                img.src = createFallbackIcon(label);
            }

            function enhanceCards() {
                document.querySelectorAll('.card').forEach(card => {
                    const textNodes = Array.from(card.childNodes).filter(node => {
                        return node.nodeType === Node.TEXT_NODE && node.textContent.trim();
                    });

                    if (!card.querySelector('.card-label') && textNodes.length) {
                        const labelSpan = document.createElement('span');
                        labelSpan.className = 'card-label';
                        labelSpan.textContent = textNodes
                            .map(node => node.textContent.trim())
                            .join(' ')
                            .replace(/\s+/g, ' ');
                        card.insertBefore(labelSpan, textNodes[textNodes.length - 1]);
                        textNodes.forEach(node => node.remove());
                    }

                    const label = card.textContent.trim().replace(/\s+/g, ' ');
                    card.setAttribute('role', 'link');
                    card.setAttribute('tabindex', '0');
                    card.setAttribute('aria-label', card.dataset.tooltip ? `${label}：${card.dataset.tooltip}` : label);

                    if (!card.querySelector('img')) {
                        const fallbackImg = document.createElement('img');
                        fallbackImg.loading = 'lazy';
                        fallbackImg.decoding = 'async';
                        fallbackImg.referrerPolicy = 'no-referrer';
                        applyFallbackIcon(fallbackImg, label);
                        card.insertBefore(fallbackImg, card.firstChild);
                    }

                    card.querySelectorAll('img').forEach(img => {
                        const originalSrc = img.getAttribute('src') || '';

                        if (!img.hasAttribute('alt') || !img.getAttribute('alt')) {
                            img.alt = `${label} 图标`;
                        }
                        img.loading = 'lazy';
                        img.decoding = 'async';
                        img.referrerPolicy = 'no-referrer';
                        img.addEventListener('error', () => applyFallbackIcon(img, label));

                        if (img.dataset.fallbackApplied) {
                            return;
                        }

                        if (!originalSrc || originalSrc.startsWith('data:image/svg+xml')) {
                            applyFallbackIcon(img, label);
                            return;
                        }

                        img.dataset.originalSrc = originalSrc;
                        img.classList.add('fallback-icon');
                        img.src = createFallbackIcon(label);

                        const probe = new Image();
                        probe.decoding = 'async';
                        probe.referrerPolicy = 'no-referrer';
                        probe.onload = () => {
                            if (probe.naturalWidth > 0) {
                                img.classList.remove('fallback-icon');
                                img.src = originalSrc;
                                return;
                            }

                            applyFallbackIcon(img, label);
                        };
                        probe.onerror = () => applyFallbackIcon(img, label);
                        probe.src = originalSrc;
                    });

                    card.addEventListener('keydown', event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            card.click();
                        }
                    });
                });
            }

            function bindEvents() {
                document.addEventListener('click', function(e) {
                    const card = e.target.closest('.card');
                    if (!card) {
                        return;
                    }

                    trackCardClick(card);
                    window.setTimeout(() => {
                        renderCommonRecommendations();
                    }, 0);
                }, { capture: true });

                toggleButton?.addEventListener('click', () => {
                    sidebar?.classList.toggle('hidden');
                    content?.classList.toggle('shifted');
                    document.body.classList.toggle('sidebar-collapsed', sidebar?.classList.contains('hidden'));
                    updateSidebarToggle();
                });

                themeCycleButtons.forEach(button => {
                    button.addEventListener('click', cycleTheme);
                });

                settingsButtons.forEach(button => {
                    button.addEventListener('click', openSettingsModal);
                });

                aboutButtons.forEach(button => {
                    button.addEventListener('click', openAboutModal);
                });

                themeOptionButtons.forEach(button => {
                    button.type = 'button';
                    button.addEventListener('click', () => {
                        applyTheme(button.dataset.themeOption || 'auto');
                    });
                });

                paletteOptionButtons.forEach(button => {
                    button.type = 'button';
                    button.addEventListener('click', () => {
                        applyPalette(button.dataset.paletteOption || 'rose');
                    });
                });

                backgroundOptionButtons.forEach(button => {
                    button.type = 'button';
                    button.addEventListener('click', () => {
                        const option = button.dataset.bgOption || 'study';
                        if (option === 'custom') {
                            const input = document.getElementById('custom-bg-input');
                            if (input) input.click();
                        } else {
                            applyBackground(option);
                        }
                    });
                });

                const rotateModeSelect = document.getElementById('bg-rotate-mode');
                if (rotateModeSelect) {
                    rotateModeSelect.addEventListener('change', function() {
                        setBgRotateMode(this.value);
                        if (this.value !== 'fixed') {
                            advanceBgByMode();
                        }
                    });
                }

                navLinks.forEach(link => {
                    link.addEventListener('click', event => {
                        event.preventDefault();
                        setActiveColumn(link.dataset.target);
                    });
                });

                searchTabs.forEach(tab => {
                    tab.type = 'button';
                    tab.setAttribute('aria-pressed', String(tab.classList.contains('active')));
                    tab.addEventListener('click', () => {
                        searchTabs.forEach(item => {
                            item.classList.remove('active');
                            item.setAttribute('aria-pressed', 'false');
                        });

                        tab.classList.add('active');
                        tab.setAttribute('aria-pressed', 'true');
                        activeEngine = tab.dataset.engine || activeEngine;
                        if (searchInput && tab.dataset.placeholder) {
                            searchInput.placeholder = `${tab.dataset.placeholder}，输入同时筛选站内网站`;
                        }
                        searchInput?.focus();
                    });
                });

                searchInput?.addEventListener('input', filterCards);
                searchInput?.addEventListener('keydown', event => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        performExternalSearch();
                    }
                    if (event.key === 'Escape') {
                        searchInput.value = '';
                        filterCards();
                    }
                });

                searchButton?.addEventListener('click', performExternalSearch);
                clearSearchFilterButton?.addEventListener('click', () => {
                    clearSearchFilter();
                    searchInput?.focus();
                });

                feedbackForm?.addEventListener('submit', event => {
                    event.preventDefault();
                    sendFeedback();
                });

                window.addEventListener('scroll', () => {
                    updateScrollButton();
                    requestActiveSectionUpdate();
                    sessionStorage.setItem('zz-nav-scroll', window.scrollY);
                }, { passive: true });
                window.addEventListener('click', event => {
                    if (event.target === aboutModal) {
                        closeAboutModal();
                    }
                    if (event.target === announcement) {
                        closeAnnouncement(true);
                    }
                    if (event.target === contactModal) {
                        closeContactModal();
                    }
                    if (event.target === settingsModal) {
                        closeSettingsModal();
                    }
                });
                window.addEventListener('keydown', event => {
                    if (event.key !== 'Escape') {
                        return;
                    }
                    if (aboutModal?.classList.contains('show')) {
                        closeAboutModal();
                    }
                    if (announcement?.classList.contains('show')) {
                        closeAnnouncement(true);
                    }
                    if (contactModal?.classList.contains('show')) {
                        closeContactModal();
                    }
                    if (settingsModal?.classList.contains('show')) {
                        closeSettingsModal();
                    }
                });
            }

            function init() {
                if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
                var savedScroll = sessionStorage.getItem('zz-nav-scroll');
                initDisplayPreferences();
                initEmailService();
                enhanceCards();
                renderCommonRecommendations();
                setupModuleTabs();
                renderCommonRecommendations();
                searchHistoryItems = loadSearchHistory();
                renderSearchHistory();
                const customBgInput = document.getElementById('custom-bg-input');
                if (customBgInput) {
                    customBgInput.addEventListener('change', function() {
                        handleCustomBackground(this.files[0]);
                        this.value = '';
                    });
                }
                bindEvents();
                setActiveColumn(activeColumn()?.id || 'offen-links', false);
                updateSidebarToggle();
                updateScrollButton();
                updateActiveSectionFromScroll();
                updateCountdown();
                window.setInterval(updateCountdown, 60000);
                initCountdownSettings();

                if (savedScroll) {
                    window.setTimeout(function () {
                        window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'smooth' });
                    }, 100);
                }

                if (announcement && storageGet(announcementKey) !== 'seen') {
                    window.setTimeout(() => showModal(announcement), 300);
                }

                document.body.classList.add('initialized');
            }

            window.closeAnnouncement = closeAnnouncement;
            window.openAboutModal = openAboutModal;
            window.closeAboutModal = closeAboutModal;
            window.openContactModal = openContactModal;
            window.closeContactModal = closeContactModal;
            window.closeSettingsModal = closeSettingsModal;
            window.showFeedbackModal = openContactModal;
            window.sendFeedback = sendFeedback;
            window.scrollToTop = scrollToTop;
            window.createDesktopShortcut = createDesktopShortcut;

            try {
                init();
            } catch (e) {
                console.warn('Init error:', e);
                document.body.classList.add('initialized');
            }
        })();
