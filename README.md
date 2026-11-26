# 知径导航

纯前端资源导航，支持分类浏览、站内筛选、全网搜索和个人常用入口。

- 点击网站卡片右上角的星标收藏或取消收藏。
- 收藏固定显示在常用推荐前面，可在“管理收藏”中调整顺序或添加自定义网址。
- 个性化设置包含外观、壁纸、倒计时和收藏；玻璃质感有通透、均衡、清晰三档。
- 自定义壁纸图库保留最近 6 张，支持缩略图切换、单张删除和拖放上传；当前旧壁纸会自动加入。

收藏、主题、壁纸和倒计时保存在当前浏览器，不依赖数据库。

## 站点数据

首页的 829 个站点入口集中在 `sites.json`，按栏目和分区分组，包含中英文名称、说明、图标、置顶与 NEW 标记。`index.html` 仍保留静态卡片，便于直接打开和部署。

日常维护只改 `sites.json`，然后回填到首页：

```shell
node tools/directory-data.js check     # 校验 JSON 与首页是否一致
node tools/directory-data.js write     # 从 JSON 回填首页卡片区
node tools/directory-data.js generate  # 反向从首页重新生成 JSON（会覆盖现有 JSON）
```

`write` 只替换各分区 `.card-container` 内的卡片行，不改动其他结构、脚本或样式。

## 搜索

站内筛选支持名称、说明、网址，以及中文名称的**全拼和拼音首字母**（如 `db` 命中「豆包AI」、`wyy` 命中「网易云音乐」）。输入时会显示带分类标签的建议列表，可用 ↑↓ 选择、回车直接打开选中站点；未选择时回车仍走全网搜索，`Esc` 关闭建议或清空。

拼音索引在 `search-index.js`，由 `sites.json` 生成、随页面静态加载，运行时不依赖拼音库。修改站点名称后需重新生成：

```shell
node tools/build-search-index.js
```

## 壁纸

内置壁纸使用 WebP 格式（默认山峰约 144KB，窗边约 76KB），并内置 312B 低清占位图让首屏立刻有背景；原始 JPG/PNG 保留在仓库中作为转换源。新增或更换壁纸后重新生成：

```shell
python tools/optimize-wallpapers.py
```

该脚本会把 `wallpapers/*.jpg`、`wallpaper-window.png`、`123.jpg` 转成同名 WebP，并同步改写 `styles.css` 中的引用。

## 本地预览

可直接打开 `index.html`，也可以在网站目录运行：

```shell
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

## 自动部署

推送到 `main` 分支后，现有 `.github/workflows/static.yml` 会自动部署到 GitHub Pages：

https://zyjzhy.github.io/lwdh/
