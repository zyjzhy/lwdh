        (() => {
            'use strict';

            const sidebar = document.getElementById('sidebar');
            const content = document.getElementById('content');
            const toggleButton = document.getElementById('toggle-sidebar');
            const searchInput = document.getElementById('search-input');
            const searchButton = document.getElementById('search-button');
            const searchTabs = Array.from(document.querySelectorAll('#search-tabs button'));
            const navLinks = Array.from(document.querySelectorAll('#sidebar a[data-target], .nav-link[data-target]'));
            const columns = Array.from(document.querySelectorAll('.column'));
            const aboutModal = document.getElementById('about-modal');
            const announcement = document.getElementById('announcement');
            const contactModal = document.getElementById('contact-author-modal');
            const settingsModal = document.getElementById('settings-modal');
            const scrollTopBtn = document.getElementById('scroll-to-top');
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
            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
            const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
            const themeOrder = ['auto', 'light', 'dark'];
            const paletteOrder = ['rose', 'ocean', 'forest', 'violet', 'sunset', 'graphite', 'aurora', 'peach', 'mint'];
            const backgroundOrder = ['study', 'none', 'desk', 'sky', 'green', 'campus', 'peak', 'library', 'coast', 'window', 'notebook', 'nightdesk', 'mountain', 'forest', 'night', 'autumn', 'sunset', 'ocean', 'cat', 'dog', 'bunny', 'panda', 'custom'];
            const bgRotateModeKey = 'zz-nav-bg-rotate-mode';
            const dailyBgIndexKey = 'zz-nav-daily-bg-index';
            const dailyBgDateKey = 'zz-nav-daily-bg-date';
            const rotateBackgrounds = ['study', 'desk', 'sky', 'green', 'campus', 'peak', 'library', 'coast', 'window', 'notebook', 'nightdesk', 'mountain', 'forest', 'night', 'autumn', 'sunset', 'ocean', 'cat', 'dog', 'bunny', 'panda'];
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
            let emailLoadPromise = null;
            let scrollSpyTicking = false;

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

            // === 使用频率追踪 ===
            const CLICK_COUNT_KEY = 'zz-nav-click-counts';

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

            function trackCardClick(card) {
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

            function sortDynamicSection(container) {
                if (!container) return;

                const subColumn = container.closest('.sub-column');
                if (!subColumn) return;
                const heading = (subColumn.querySelector('h3')?.textContent || '');
                if (heading.includes('学校') || heading.includes('私用')) return;

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
                const icon = toggleButton.querySelector('i');
                if (icon) {
                    icon.className = isHidden ? 'fas fa-angle-right' : 'fas fa-angle-left';
                }
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
                    return 'fa-wand-magic-sparkles';
                }
                return resolved === 'dark' ? 'fa-moon' : 'fa-sun';
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
                    let icon = button.querySelector('i');
                    if (!icon) {
                        icon = document.createElement('i');
                        icon.setAttribute('aria-hidden', 'true');
                        button.prepend(icon);
                    }
                    icon.className = `fas ${themeIcon(activeThemeChoice, resolved)}`;
                    button.setAttribute('aria-label', `当前${themeLabel(activeThemeChoice)}模式，点击切换主题`);
                    button.title = `当前${themeLabel(activeThemeChoice)}模式`;
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
                const customBg = storageGet('zz-nav-custom-bg');
                setCustomBackground(customBg);
                const savedBackground = storageGet(backgroundKey) || 'study';
                applyBackground(savedBackground === 'custom' && !customBg ? 'study' : savedBackground, false);
                const sel = document.getElementById('bg-rotate-mode');
                if (sel) sel.value = getBgRotateMode();
                window.setTimeout(advanceBgByMode, 1000);
            }

            function activeColumn() {
                return document.querySelector('.column.active') || document.getElementById('offen-links') || columns[0];
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

                column.classList.remove('search-empty');
                column.querySelectorAll('.card.is-hidden').forEach(card => card.classList.remove('is-hidden'));
                column.querySelectorAll('.sub-column.is-empty').forEach(group => group.classList.remove('is-empty'));
            }

            function filterCards() {
                const query = searchInput?.value.trim().toLowerCase() || '';
                const isSearching = Boolean(query);
                document.body.classList.toggle('searching', isSearching);

                if (!query) {
                    columns.forEach(resetColumnFilters);
                    restoreModuleTabs();
                    return;
                }

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

                    column.classList.toggle('search-empty', columnVisible === 0);
                });
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
                let current = columns[0];

                columns.forEach(column => {
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

                window.open(activeEngine + encodeURIComponent(query), '_blank', 'noopener');
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
                const originalButtonHtml = '<i class="fas fa-paper-plane feedback-button-icon"></i> 发送反馈';

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
                    feedbackButton.innerHTML = '<i class="fas fa-spinner fa-pulse feedback-button-icon"></i> 发送中...';
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

            function updateScrollButton() {
                if (!scrollTopBtn) {
                    return;
                }

                scrollTopBtn.style.display = window.scrollY > 320 ? 'flex' : 'none';
            }

            function updateCountdown() {
                const now = new Date();

                const getDaysLeft = (monthIndex, day) => {
                    const year = now > new Date(now.getFullYear(), monthIndex, day)
                        ? now.getFullYear() + 1
                        : now.getFullYear();
                    const target = new Date(year, monthIndex, day);
                    return Math.max(0, Math.ceil((target - now) / 86400000));
                };

                const kaoyan = document.getElementById('kaoyan');
                const kaogong = document.getElementById('kaogong');

                if (kaoyan) {
                    kaoyan.textContent = getDaysLeft(11, 22);
                }
                if (kaogong) {
                    kaogong.textContent = getDaysLeft(11, 1);
                }
            }

            function escapeSvgText(value) {
                return String(value)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
            }

            function hashText(value) {
                return Array.from(value || '猪猪导航').reduce((hash, char) => {
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
                        sortDynamicSection(card.closest('.card-container'));
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

                feedbackForm?.addEventListener('submit', event => {
                    event.preventDefault();
                    sendFeedback();
                });

                window.addEventListener('scroll', () => {
                    updateScrollButton();
                    requestActiveSectionUpdate();
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
                initDisplayPreferences();
                initEmailService();
                enhanceCards();
                setupModuleTabs();
                columns.forEach(column => {
                    column.querySelectorAll('.card-container').forEach(sortDynamicSection);
                });
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

            try {
                init();
            } catch (e) {
                console.warn('Init error:', e);
                document.body.classList.add('initialized');
            }
        })();
