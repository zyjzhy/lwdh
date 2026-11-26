#!/usr/bin/env node
/* 知径导航：站点数据的提取、校验与回填工具
 *
 *   node tools/directory-data.js generate  # 从 index.html 生成 sites.json
 *   node tools/directory-data.js check     # 校验 sites.json 与 index.html 是否一致
 *   node tools/directory-data.js write     # 从 sites.json 回填 index.html 的卡片区
 *
 * 只处理 index.html 中 .sub-column > .card-container 里的卡片行，
 * 不触碰其他结构、脚本或样式。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML_FILE = path.join(ROOT, 'index.html');
const DATA_FILE = path.join(ROOT, 'sites.json');
const CARD_I18N = path.join(ROOT, 'card-i18n.js');
const CARD_EN_EXTRA = path.join(ROOT, 'card-en-extra.js');

const CARD_PREFIX = '<a class="card"';

function parseAttrs(raw) {
  // 兼容历史拼写 data-tooltip":"xxx" -> data-tooltip="xxx"
  raw = raw.replace(/data-tooltip":"([^"]*)"/g, 'data-tooltip="$1"');
  const out = Object.create(null);
  const re = /([^\s=]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(raw))) {
    let key = m[1];
    // 兼容历史拼写 data-tooltip":" -> data-tooltip
    if (key.endsWith('":')) key = key.slice(0, -2);
    if (key.startsWith('data-')) key = key.replace(/^data-/, '');
    out[key] = m[2];
  }
  return out;
}

function attr(value) {
  return String(value == null ? '' : value).replace(/"/g, '&quot;');
}

function parseCard(card) {
  const tagEnd = card.indexOf('>');
  const attrs = parseAttrs(card.slice(CARD_PREFIX.length, tagEnd));
  const inner = card.slice(tagEnd + 1, -4); // 去掉 </a>
  const imgMatch = inner.match(/<img[^>]*>/);
  let icon = '';
  let iconAlt = '';
  let labelHtml = inner;
  let iconSpace = false;
  if (imgMatch) {
    const imgAttrs = parseAttrs(imgMatch[0].slice(4, -1));
    icon = imgAttrs['icon-src'] || '';
    iconAlt = imgAttrs.alt || '';
    iconSpace = /\s$/.test(inner.slice(0, imgMatch.index));
    labelHtml = inner.replace(imgMatch[0], '');
  }
  const badge = labelHtml.indexOf('<span class="badge-new">NEW</span>') !== -1;
  const label = labelHtml.replace(/<span class="badge-new">NEW<\/span>/g, '').trim();
  return {
    label,
    url: attrs.href || '',
    tooltip: attrs.tooltip || '',
    icon,
    iconAlt,
    iconSpace,
    pinned: attrs['common-pinned'] === 'true',
    badgeNew: badge,
  };
}

function cardMarkup(card) {
  let head = CARD_PREFIX;
  if (card.pinned) head += ' data-common-pinned="true"';
  head += ` data-tooltip="${attr(card.tooltip)}" href="${attr(card.url)}" target="_blank" rel="noopener noreferrer"`;
  let body = '';
  if (card.icon) {
    if (card.iconSpace) body += ' ';
    body += `<img src="site-placeholder.svg" width="32" height="32" data-icon-src="${attr(card.icon)}"`;
    body += ` alt="${attr(card.iconAlt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
  }
  body += card.label;
  if (card.badgeNew) body += '<span class="badge-new">NEW</span>';
  return head + '>' + body + '</a>';
}

function sectionInterior(cards, newline, blankTail) {
  const nl = newline || '\n';
  const tail = nl.repeat(1 + (blankTail || 0));
  return nl + cards.map(cardMarkup).join(nl) + tail;
}

function detectNewline(text) {
  return text.indexOf('\r\n') !== -1 ? '\r\n' : '\n';
}

function parseHtml(html) {
  const columns = [];
  const colRe = /<div id="([\w-]+)" class="column[^"]*"[^>]*>([\s\S]*?)(?=<div id="[\w-]+" class="column[^"]*"[^>]*>|<footer class="site-footer")/g;
  let colMatch;
  while ((colMatch = colRe.exec(html))) {
    const columnId = colMatch[1];
    const blockStart = colMatch.index + colMatch[0].indexOf('<div id="' + columnId + '"');
    const block = colMatch[2];
    const subColumns = [];
    const subRe = /<div class="sub-column"(?:\s+data-campus)?>([\s\S]*?)(?=<div class="sub-column"|$)/g;
    let subMatch;
    while ((subMatch = subRe.exec(block))) {
      const content = subMatch[1];
      const heading = content.match(/<h3>[\s\S]*?<span data-i18n="([^"]+)">([^<]*)<\/span>/);
      const container = content.match(/<div[^>]*class="card-container"[^>]*>/);
      if (!heading || !container) continue;
      const openInContent = content.indexOf(container[0]) + container[0].length;
      const closeInContent = content.indexOf('</div>', openInContent);
      if (closeInContent === -1) continue;
      const interior = content.slice(openInContent, closeInContent);
      const cards = interior.match(/<a class="card"[\s\S]*?<\/a>/g) || [];
      const tail = interior.slice(interior.lastIndexOf('</a>') + 4);
      const blankTail = Math.max(0, (tail.match(/\r?\n/g) || []).length - 1);
      const subStart = blockStart + colMatch[0].indexOf(subMatch[0]);
      const containerOffset = subMatch[0].indexOf(container[0]);
      const interiorStart = subStart + containerOffset + container[0].length;
      subColumns.push({
        id: heading[1],
        title: heading[2].trim(),
        campus: /data-campus/.test(subMatch[0]),
        cards: cards.map(parseCard),
        blankTail,
        start: interiorStart,
        end: interiorStart + interior.length,
        interior,
      });
    }
    if (subColumns.length) columns.push({ id: columnId, subColumns });
  }
  return columns;
}

function loadTranslations() {
  const context = { console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(CARD_EN_EXTRA, 'utf8') + '\n;globalThis.__extra = CardEnExtra;', context, { filename: CARD_EN_EXTRA });
  vm.runInContext(fs.readFileSync(CARD_I18N, 'utf8') + '\n;globalThis.__cards = CardI18N;', context, { filename: CARD_I18N });
  const labels = context.__extra.labels || {};
  const tooltips = Object.assign({}, context.__extra.tooltips || {}, context.__cards.tooltipMap || {});
  return { labels, tooltips };
}

function buildData(html) {
  const columns = parseHtml(html);
  const { labels, tooltips } = loadTranslations();
  let missingLabels = 0;
  let missingTooltips = 0;
  const data = {
    version: 1,
    source: 'index.html',
    note: '知径导航站点数据。修改后运行 node tools/directory-data.js write 回填到 index.html。',
    columns: columns.map((column) => ({
      id: column.id,
      subColumns: column.subColumns.map((sub) => ({
        id: sub.id,
        title: sub.title,
        campus: sub.campus,
        blankTail: sub.blankTail,
        cards: sub.cards.map((card) => {
          if (!labels[card.label]) missingLabels += 1;
          if (!tooltips[card.tooltip]) missingTooltips += 1;
          return {
            label: card.label,
            labelEn: labels[card.label] || '',
            url: card.url,
            tooltip: card.tooltip,
            tooltipEn: tooltips[card.tooltip] || '',
            icon: card.icon,
            iconAlt: card.iconAlt,
            iconSpace: card.iconSpace,
            pinned: card.pinned,
            badgeNew: card.badgeNew,
          };
        }),
      })),
    })),
  };
  return { data, missingLabels, missingTooltips, count: columns.reduce((n, c) => n + c.subColumns.reduce((m, s) => m + s.cards.length, 0), 0) };
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function flatten(data) {
  const out = [];
  data.columns.forEach((column, ci) => {
    column.subColumns.forEach((sub, si) => {
      sub.cards.forEach((card, i) => out.push({ ci, si, i, card }));
    });
  });
  return out;
}

function generate() {
  const html = fs.readFileSync(HTML_FILE, 'utf8');
  const { data, missingLabels, missingTooltips, count } = buildData(html);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`已生成 ${path.basename(DATA_FILE)}：${data.columns.length} 个栏目 / ${count} 个站点`);
  console.log(`英文映射缺失：名称 ${missingLabels} 个，说明 ${missingTooltips} 个`);
}

function check() {
  const html = fs.readFileSync(HTML_FILE, 'utf8');
  const newline = detectNewline(html);
  const parsed = parseHtml(html);
  const data = readData();
  const problems = [];
  const sectionsA = parsed.reduce((n, c) => n + c.subColumns.length, 0);
  const sectionsB = data.columns.reduce((n, c) => n + c.subColumns.length, 0);
  if (sectionsA !== sectionsB) problems.push(`分区数量不一致：HTML ${sectionsA} / JSON ${sectionsB}`);

  const max = Math.max(parsed.length, data.columns.length);
  for (let ci = 0; ci < max; ci += 1) {
    const pc = parsed[ci];
    const dc = data.columns[ci];
    if (!pc || !dc) {
      problems.push(`第 ${ci + 1} 个栏目缺失`);
      continue;
    }
    if (pc.id !== dc.id) problems.push(`栏目 ${ci + 1} id 不一致：HTML ${pc.id} / JSON ${dc.id}`);
    for (let si = 0; si < Math.max(pc.subColumns.length, dc.subColumns.length); si += 1) {
      const ps = pc.subColumns[si];
      const ds = dc.subColumns[si];
      if (!ps || !ds) {
        problems.push(`栏目 ${pc.id} 第 ${si + 1} 个分区缺失`);
        continue;
      }
      if (ps.id !== ds.id) problems.push(`分区 ${pc.id}/${si + 1} id 不一致：${ps.id} / ${ds.id}`);
      if (ps.interior.trim() !== sectionInterior(ds.cards, newline, ds.blankTail).trim()) {
        problems.push(`分区 ${pc.id}/${ps.id} 卡片内容不一致（HTML ${ps.cards.length} / JSON ${ds.cards.length}）`);
      }
    }
  }
  if (problems.length) {
    console.error(`校验失败，共 ${problems.length} 处差异：`);
    problems.slice(0, 30).forEach((p) => console.error(' - ' + p));
    if (problems.length > 30) console.error(` - ……另有 ${problems.length - 30} 处`);
    process.exitCode = 1;
  } else {
    console.log('校验通过：index.html 与 sites.json 完全一致。');
  }
}

function write() {
  const html = fs.readFileSync(HTML_FILE, 'utf8');
  const newline = detectNewline(html);
  const parsed = parseHtml(html);
  const data = readData();
  const regions = [];
  parsed.forEach((column, ci) => {
    column.subColumns.forEach((sub, si) => {
      const target = data.columns[ci] && data.columns[ci].subColumns[si];
      if (!target) throw new Error(`JSON 缺少栏目 ${column.id} 的第 ${si + 1} 个分区`);
      regions.push({ start: sub.start, end: sub.end, text: sectionInterior(target.cards, newline, target.blankTail), key: `${column.id}/${sub.id}` });
    });
  });
  regions.sort((a, b) => b.start - a.start);
  let output = html;
  regions.forEach((region) => {
    output = output.slice(0, region.start) + region.text + output.slice(region.end);
  });
  if (output === html) {
    console.log('没有需要回填的变更。');
  } else {
    fs.writeFileSync(HTML_FILE, output, 'utf8');
    console.log(`已从 sites.json 回填 ${regions.length} 个分区到 index.html。`);
  }
}

if (require.main === module) {
  const cmd = process.argv[2] || 'generate';
  if (cmd === 'generate') generate();
  else if (cmd === 'check') check();
  else if (cmd === 'write') write();
  else {
    console.error('用法：node tools/directory-data.js [generate|check|write]');
    process.exitCode = 1;
  }
}

module.exports = { parseHtml, cardMarkup, sectionInterior, parseCard, parseAttrs, detectNewline, buildData };
