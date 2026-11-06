/**
 * 知径导航 - 语言管理器
 * 负责语言检测、切换、持久化和 DOM 文本替换
 */
const LangManager = (() => {
  'use strict';

  const LANG_KEY = 'zz-nav-language';
  const LANG_OPTIONS = ['zh', 'en'];
  let currentLang = 'zh';

  // ===================== 工具函数 =====================

  /** 安全读取 localStorage */
  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  /** 安全写入 localStorage */
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  /** 检测系统语言 */
  function detectSystemLang() {
    const lang = (navigator.language || navigator.userLanguage || 'zh').toLowerCase();
    return lang.startsWith('en') ? 'en' : 'zh';
  }

  /** 从嵌套对象中按点号路径取值，如 "nav.recommend" */
  function t(path) {
    const dict = I18N[currentLang] || I18N.zh;
    return path.split('.').reduce((obj, key) => (obj != null ? obj[key] : undefined), dict) || '';
  }

  /** 带占位符替换的翻译，如 tReplace('search.resultFound', {count: 5, modules: 2}) */
  function tReplace(path, vars) {
    let str = t(path);
    if (!vars) return str;
    Object.keys(vars).forEach(key => {
      str = str.replace(new RegExp('\\{' + key + '\\}', 'g'), vars[key]);
    });
    return str;
  }

  // ===================== DOM 替换 =====================

  /** 替换所有标记了 data-i18n 的元素的 textContent */
  function applyTextTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const value = t(key);
      if (value) el.textContent = value;
    });
  }

  /** 替换所有标记了 data-i18n-placeholder 的 input/textarea 的 placeholder */
  function applyPlaceholderTranslations() {
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      const value = t(key);
      if (value) el.placeholder = value;
    });
  }

  /** 替换所有标记了 data-i18n-title 的元素的 title 和 aria-label */
  function applyTitleTranslations() {
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.dataset.i18nTitle;
      const value = t(key);
      if (value) {
        el.title = value;
        el.setAttribute('aria-label', value);
      }
    });
  }

  /** 替换所有标记了 data-i18n-html 的元素的 innerHTML（用于包含 SVG 图标的按钮） */
  function applyHtmlTranslations() {
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.dataset.i18nHtml;
      const value = t(key);
      if (value) el.innerHTML = value;
    });
  }

  /** 替换 select 下拉框中带 data-i18n 的 option 文本 */
  function applySelectOptionTranslations() {
    document.querySelectorAll('select option[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const value = t(key);
      if (value) el.textContent = value;
    });
  }

  /** 更新页面标题 */
  function applyPageTitle() {
    const title = t('meta.title');
    if (title) document.title = title;
  }

  /** 更新 <html lang> 属性 */
  function applyHtmlLang() {
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
  }

  /** 更新语言切换按钮的显示文本 */
  function updateLangToggleButton() {
    const label = currentLang === 'zh' ? 'Switch to English' : '切换到中文';
    const displayText = currentLang === 'zh' ? 'EN' : '中';

    // 侧边栏按钮：翻译文本标签
    var sidebarBtn = document.getElementById('lang-toggle-sidebar');
    if (sidebarBtn) {
      sidebarBtn.title = label;
      sidebarBtn.setAttribute('aria-label', label);
      sidebarBtn.setAttribute('data-lang-label', displayText);
    }

    // 顶栏/头部按钮：直接显示语言代码
    ['lang-toggle', 'lang-toggle-topbar'].forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = displayText;
      el.title = label;
      el.setAttribute('aria-label', label);
    });
  }

  /** 更新搜索引擎 tab 的 placeholder 属性 */
  function applySearchEnginePlaceholders() {
    const map = {
      'bing': 'search.bingPlaceholder',
      'so360': 'search.so360Placeholder',
      'baiduDev': 'search.baiduDevPlaceholder',
      'google': 'search.googlePlaceholder',
      'weixin': 'search.weixinPlaceholder',
      'zhihu': 'search.zhihuPlaceholder',
    };
    document.querySelectorAll('#search-tabs button[data-engine]').forEach(btn => {
      const engine = btn.dataset.engine;
      // 根据 engine URL 匹配语言 key
      if (engine.includes('bing.com')) {
        btn.dataset.placeholder = t('search.bingPlaceholder');
      } else if (engine.includes('so.com')) {
        btn.dataset.placeholder = t('search.so360Placeholder');
      } else if (engine.includes('kaifa.baidu.com')) {
        btn.dataset.placeholder = t('search.baiduDevPlaceholder');
      } else if (engine.includes('baidu.com')) {
        btn.dataset.placeholder = t('search.baiduPlaceholder');
      } else if (engine.includes('google.com')) {
        btn.dataset.placeholder = t('search.googlePlaceholder');
      } else if (engine.includes('sogou.com')) {
        btn.dataset.placeholder = t('search.weixinPlaceholder');
      } else if (engine.includes('zhihu.com')) {
        btn.dataset.placeholder = t('search.zhihuPlaceholder');
      }
    });
  }

  /** 对倒计时区域的默认文本做翻译 */
  function applyCountdownText() {
    const cd1Label = document.querySelector('.countdown-container:first-child .countdown-days');
    const cd2Label = document.querySelector('.countdown-container:last-child .countdown-days');
    if (cd1Label) {
      const stored = storageGet('zz-nav-cd1-name');
      cd1Label.textContent = stored || t('countdown.exam');
    }
    if (cd2Label) {
      const stored = storageGet('zz-nav-cd2-name');
      cd2Label.textContent = stored || t('countdown.civilService');
    }
    // 倒计时“天”文本
    document.querySelectorAll('.countdown span').forEach(function(el) {
      // 保留数字，只替换可能的“天”文本
    });
  }

  /** 翻译动态生成的搜索反馈文本 */
  function applySearchFeedback() {
    var feedbackEl = document.getElementById('search-feedback-text');
    if (!feedbackEl) return;
    var text = feedbackEl.textContent || '';
    // 尝试匹配“找到 X 个网站，来自 Y 个模块”
    var match = text.match(/找到\s*(\d+)\s*个网站，来自\s*(\d+)\s*个模块/);
    if (match) {
      feedbackEl.textContent = tReplace('search.resultFound', { count: match[1], modules: match[2] });
    }
    // 尝试匹配“没有找到与“XXX”匹配的网站”
    var noMatch = text.match(/没有找到与“(.*?)”匹配的网站/);
    if (noMatch) {
      feedbackEl.textContent = tReplace('search.noResult', { query: noMatch[1] });
    }
  }

  // ===================== 主应用函数 =====================

  /** 应用所有翻译到 DOM */
  function applyAllTranslations() {
    applyHtmlLang();
    applyTextTranslations();
    applyPlaceholderTranslations();
    applyTitleTranslations();
    applyHtmlTranslations();
    applySelectOptionTranslations();
    applySearchEnginePlaceholders();
    applyCountdownText();
    applySearchFeedback();
    applyPageTitle();
    updateLangToggleButton();
    applyCardTranslations();
  }

  /** 翻译卡片 tooltip 与可见文字（需要 card-i18n.js 已加载） */
  function applyCardTranslations() {
    if (typeof CardI18N !== 'undefined' && typeof CardI18N.translateAllCards === 'function') {
      CardI18N.translateAllCards(currentLang);
    }
  }

  /** 切换语言 */
  function toggle() {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    storageSet(LANG_KEY, currentLang);
    applyAllTranslations();

    // 触发自定义事件，让其他脚本可以响应语言变化
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: currentLang } }));
  }

  /** 设置为指定语言 */
  function setLang(lang) {
    if (!LANG_OPTIONS.includes(lang)) return;
    if (currentLang === lang) return;
    currentLang = lang;
    storageSet(LANG_KEY, currentLang);
    applyAllTranslations();
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: currentLang } }));
  }

  /** 获取当前语言 */
  function getLang() {
    return currentLang;
  }

  /** 初始化：从存储或系统语言读取，应用翻译 */
  function init() {
    const saved = storageGet(LANG_KEY);
    currentLang = saved && LANG_OPTIONS.includes(saved) ? saved : detectSystemLang();
    applyAllTranslations();
  }

  // ===================== 公开 API =====================

  return {
    init,
    toggle,
    setLang,
    getLang,
    t,
    tReplace,
    /** 供外部脚本在动态内容变化后重新应用翻译 */
    refresh: applyAllTranslations,
  };
})();
