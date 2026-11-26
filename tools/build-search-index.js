// 从 sites.json 生成静态拼音检索索引 search-index.js
// 运行时零依赖：页面只需引入生成的 JS，不必加载拼音库
const fs = require('fs');
const path = require('path');
const { pinyin } = require('pinyin-pro');

const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'sites.json'), 'utf8'));
const index = Object.create(null);
let count = 0;

function add(label, tooltip) {
    if (!label) return;
    const key = label.trim();
    if (!key || index[key]) return;
    const syllables = pinyin(key, { toneType: 'none', type: 'array', nonZh: 'consecutive' }) || [];
    const full = syllables.join('').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const abbr = syllables.map(s => (s[0] || '')).join('').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const extra = (tooltip || '').trim();
    const extraPy = extra ? pinyin(extra, { toneType: 'none', type: 'array', nonZh: 'consecutive' }).join('').replace(/[^a-z0-9]/gi, '').toLowerCase() : '';
    index[key] = [full, abbr, extraPy].filter(Boolean).join(' ');
    count += 1;
}

data.columns.forEach(column => {
    (column.subColumns || []).forEach(sub => {
        (sub.cards || []).forEach(card => add(card.label, card.tooltip));
    });
});

const banner = '// 由 tools/build-search-index.js 生成，请勿手动编辑\n';
const content = banner + 'window.SEARCH_INDEX = ' + JSON.stringify(index) + ';\n';
fs.writeFileSync(path.join(root, 'search-index.js'), content, 'utf8');
console.log('entries=' + count + ' bytes=' + Buffer.byteLength(content, 'utf8'));
