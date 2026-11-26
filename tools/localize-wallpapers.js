// 把 styles.css 中的壁纸外链替换为本地 wallpapers/ 文件
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cssPath = path.join(root, 'styles.css');
let css = fs.readFileSync(cssPath, 'utf8');

const map = {
  'photo-1497366754035-f200968a6e72': 'desk',
  'photo-1519681393784-d120267933ba': 'sky',
  'photo-1500530855697-b586d89ba3ee': 'green',
  'photo-1562774053-701939374585': 'campus',
  'photo-1464822759023-fed622ff2c3b': 'peak',
  'photo-1524995997946-a1c2e315a42f': 'library',
  'photo-1507525428034-b723cf961d3e': 'coast',
  'photo-1500534314209-a25ddb2bd429': 'mountain',
  'photo-1470071459604-3b5ec3a7fe05': 'forest',
  'photo-1519501025264-65ba15a82390': 'night',
  'photo-1771820081376-092f1d9cec75': 'autumn',
  'photo-1691958262703-8fdcf760d9b9': 'sunset',
  'photo-1455390582262-044cdead277a': 'notebook',
  'photo-1516321318423-f06f85e504b3': 'nightdesk',
  'BB1msDTq': 'lantern',
  'BB1msFQx': 'mist',
  'BB1msDMN': 'ridge',
  'AAOE58E': 'starry',
  'BB1msKXW': 'space',
  'BB1msOOX': 'sunrise',
  'BB1msKEv': 'meadow'
};

const re = /url\((['"]?)(https:\/\/[^)'"]+)\1\)/g;
let count = 0;
const missing = new Set();

css = css.replace(re, (match, quote, url) => {
  if (!/^https:\/\/(images\.unsplash\.com|img-s\.msn\.cn|i\.postimg\.cc)/.test(url)) return match;
  if (url.includes('i.postimg.cc')) {
    count += 1;
    return "url('123.jpg')";
  }
  let key = null;
  for (const id of Object.keys(map)) {
    if (url.includes(id)) {
      key = map[id];
      break;
    }
  }
  if (!key) {
    missing.add(url);
    return match;
  }
  count += 1;
  return "url('wallpapers/" + key + ".jpg')";
});

fs.writeFileSync(cssPath, css);
console.log('replaced=' + count);
console.log('missing=' + JSON.stringify([...missing]));
