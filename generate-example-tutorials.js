const fs = require('node:fs');
const path = require('node:path');

const EXAMPLES = [
  ['dark-mode', '深色模式 Dark Mode'],
  ['devices', '设备访问 Devices'],
  ['in-app-purchases', '应用程序内购 In-App Purchases'],
  ['keyboard-shortcuts', '键盘快捷键 Keyboard Shortcuts'],
  ['launch-app-from-url-in-another-app', '深度链接 Deep Links'],
  ['linux-desktop-actions', '桌面启动器快捷操作 Linux Desktop Actions'],
  ['menus', '菜单 Menus'],
  ['multithreading', '多线程 Multithreading'],
  ['native-file-drag-drop', '原生文件拖 & 放 Native File Drag & Drop'],
  ['navigation-history', '导航历史 Navigation History'],
  ['notifications', '通知 Notifications'],
  ['offscreen-rendering', '离屏渲染 Offscreen Rendering'],
  ['online-offline-events', '在线/离线事件探测 Online/Offline Events'],
  ['progress-bar', '进度条 Progress Bar'],
  ['recent-documents', '最近的文件 Recent Documents'],
  ['represented-file', '在 BrowserWindow 中展示文件 Represented File'],
  ['spellchecker', '拼写检查器 Spellchecker'],
  ['web-embeds', 'Web 嵌入 Web Embeds'],
  ['windows-taskbar', '任务栏自定义 Windows Taskbar'],
  ['window-customization', '自定义窗口 Window Customization']
];

const OUT_DIR = path.join(__dirname, 'electron-examples');
const RAW_BASE = 'https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/';
const FIDDLE_BASE = 'https://raw.githubusercontent.com/electron/electron/main/docs/fiddles/';

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function fetchText(url, retries) {
  const attempts = retries || 3;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.text();
    } catch (err) {
      lastError = err;
      if (attempt < attempts - 1) await sleep(1000 * (attempt + 1));
    }
  }
  throw lastError;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function codeBox(label, code) {
  return '<div class="codebox"><div class="codebar"><span>' + escapeHtml(label) + '</span><button type="button" class="copy-btn">复制</button></div><pre><code>' + escapeHtml(code.replace(/\n$/, '')) + '</code></pre></div>';
}

function resolveImageSrc(src) {
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('../')) return 'https://raw.githubusercontent.com/electron/electron/main/docs/' + src.slice(3);
  if (src.startsWith('./')) return 'https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/' + src.slice(2);
  return 'https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/' + src;
}

function inlineMarkdown(input) {
  let s = escapeHtml(input);

  s = s.replace(/`([^`]+)`/g, function (_, code) {
    return '<code>' + code + '</code>';
  });

  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, function (_, alt, src) {
    return '<img src="' + escapeAttr(resolveImageSrc(src)) + '" alt="' + escapeAttr(alt) + '">';
  });

  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, text, href) {
    return '<a href="' + escapeAttr(href) + '" target="_blank" rel="noopener">' + text + '</a>';
  });

  s = s.replace(/\[([^\]]+)\]\[\]/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return s;
}

function renderCodeBlock(lines, startIndex) {
  let i = startIndex + 1;
  const content = [];
  while (i < lines.length && !/^```/.test(lines[i])) {
    content.push(lines[i]);
    i += 1;
  }
  i += 1;

  const fence = lines[startIndex].trim();
  const info = fence.slice(3).trim();
  const titleMatch = info.match(/title=['"]([^'"]+)['"]/);
  const lang = info.split(/\s+/)[0] || '';
  const languageNames = {
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    html: 'HTML',
    css: 'CSS',
    json: 'JSON',
    bash: 'PowerShell / Bash',
    sh: 'PowerShell / Bash',
    shell: 'PowerShell / Bash',
    md: 'Markdown',
    fiddle: 'Electron Fiddle 完整示例'
  };
  let label = titleMatch ? titleMatch[1] : languageNames[lang] || (lang || '代码');
  const code = content.join('\n').replace(/\n$/, '');

  if (!code.trim()) {
    return { html: '', nextIndex: i };
  }

  return {
    html: codeBox(label, code),
    nextIndex: i
  };
}

function renderList(lines, startIndex, ordered) {
  let i = startIndex;
  const items = [];
  const marker = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/;

  while (i < lines.length && marker.test(lines[i])) {
    const text = lines[i].replace(marker, '');
    items.push('<li>' + inlineMarkdown(text) + '</li>');
    i += 1;
  }

  const tag = ordered ? 'ol' : 'ul';
  return { html: '<' + tag + '>' + items.join('') + '</' + tag + '>', nextIndex: i };
}

function renderTable(lines, startIndex) {
  let i = startIndex;
  const rows = [];
  while (i < lines.length && /^\|.*\|$/.test(lines[i])) {
    rows.push(lines[i]);
    i += 1;
  }

  if (rows.length === 0) return { html: '', nextIndex: i };

  const cells = rows.map(function (row) {
    return row.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (cell) {
      return cell.trim();
    });
  });

  let html = '<div class="table-wrap"><table><thead><tr>';
  cells[0].forEach(function (cell) {
    html += '<th>' + inlineMarkdown(cell) + '</th>';
  });
  html += '</tr></thead><tbody>';

  cells.slice(1).forEach(function (row, rowIndex) {
    if (rowIndex === 0 && row.every(function (cell) { return /^:?-{3,}:?$/.test(cell); })) return;
    html += '<tr>';
    row.forEach(function (cell) {
      html += '<td>' + inlineMarkdown(cell) + '</td>';
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  return { html: html, nextIndex: i };
}

function markdownToHtml(md) {
  const lines = md.split(/\r?\n/);
  let i = 0;

  if (/^---\s*$/.test(lines[0] || '')) {
    i += 1;
    while (i < lines.length && !/^---\s*$/.test(lines[i])) i += 1;
    i += 1;
  }

  let html = '';

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^```/.test(line.trim())) {
      const result = renderCodeBlock(lines, i);
      html += result.html;
      i = result.nextIndex;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6);
      html += '<h' + level + '>' + inlineMarkdown(heading[2]) + '</h' + level + '>';
      i += 1;
      continue;
    }

    if (/^\s*[-*_]{3,}\s*$/.test(line)) {
      html += '<hr>';
      i += 1;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      html += '<blockquote>' + quote.map(inlineMarkdown).join('<br>') + '</blockquote>';
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const result = renderList(lines, i, false);
      html += result.html;
      i = result.nextIndex;
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const result = renderList(lines, i, true);
      html += result.html;
      i = result.nextIndex;
      continue;
    }

    if (/^\|.*\|$/.test(line)) {
      const result = renderTable(lines, i);
      html += result.html;
      i = result.nextIndex;
      continue;
    }

    if (/^\[[^\]]+\]:/.test(line)) {
      i += 1;
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !/^```/.test(lines[i]) && !/^#{1,6}\s+/.test(lines[i]) && !/^\s*[-*_]{3,}\s*$/.test(lines[i]) && !/^\s*>/.test(lines[i]) && !/^\s*[-*+]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i]) && !/^\|.*\|$/.test(lines[i])) {
      paragraph.push(lines[i]);
      i += 1;
    }

    html += '<p>' + paragraph.map(inlineMarkdown).join('<br>') + '</p>';
  }

  return html;
}

function buildOperationSteps(slug) {
  const safeName = 'electron-example-' + slug;
  return [
    '打开 PowerShell，进入总目录：',
    '<pre><code>cd D:\\hf\\L\\electron</code></pre>',
    '创建一个独立的示例项目目录并进入：',
    '<pre><code>New-Item -ItemType Directory -Path apps\\' + slug + ' -Force\ncd apps\\' + slug + '</code></pre>',
    '初始化 npm 项目：',
    '<pre><code>npm init -y</code></pre>',
    '安装 Electron。国内网络可以先设置镜像再安装：',
    '<pre><code>$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"\nnpm install --save-dev electron</code></pre>',
    '根据下方官方代码创建对应文件。大多数示例需要 <code>main.js</code> 和 <code>index.html</code>，部分还需要 <code>preload.js</code> 或 <code>renderer.js</code>。代码块已经标注用途。',
    '确认 <code>package.json</code> 中有启动脚本，然后运行：',
    '<pre><code>npm pkg set scripts.start="electron ."\nnpm start</code></pre>',
    '观察窗口效果。修改代码后退出应用，再重新执行 <code>npm start</code>。'
  ];
}

function buildManualExtra(slug) {
  if (slug === 'web-embeds') {
    return [
      '<h3>完整示例：在 Electron 中嵌入网页</h3>',
      '<p>下面分别演示 <code>&lt;iframe&gt;</code>、<code>&lt;webview&gt;</code> 和 <code>WebContentsView</code> 的写法。推荐优先使用 iframe 或 WebContentsView。</p>',
      '<h4>index.html：使用 iframe</h4>',
      codeBox('index.html', '<!doctype html>\n<html lang="zh-CN">\n  <head>\n    <meta charset="UTF-8">\n    <title>Web Embeds</title>\n  </head>\n  <body>\n    <h1>iframe 示例</h1>\n    <iframe src="https://www.example.com" width="100%" height="600"></iframe>\n  </body>\n</html>'),
      '<h4>index.html：使用 webview</h4>',
      codeBox('index.html', '<!doctype html>\n<html lang="zh-CN">\n  <head>\n    <meta charset="UTF-8">\n    <title>Webview 示例</title>\n  </head>\n  <body>\n    <h1>webview 示例</h1>\n    <webview src="https://www.example.com" style="width:100%;height:600px;"></webview>\n  </body>\n</html>'),
      '<h4>main.js：使用 WebContentsView</h4>',
      codeBox('main.js', "const { app, BaseWindow, WebContentsView } = require('electron/main')\n\napp.whenReady().then(() => {\n  const win = new BaseWindow({ width: 900, height: 700 })\n  const view = new WebContentsView()\n  win.contentView.addChildView(view)\n  view.setBounds({ x: 0, y: 0, width: 900, height: 700 })\n  view.webContents.loadURL('https://www.example.com')\n})\n\napp.on('window-all-closed', () => {\n  if (process.platform !== 'darwin') app.quit()\n})"),
      '<p>如果使用 <code>webview</code>，还需要在 <code>main.js</code> 的 <code>webPreferences</code> 中设置 <code>webviewTag: true</code>。</p>'
    ].join('');
  }

  if (slug === 'window-customization') {
    return [
      '<h3>完整示例：自定义 BrowserWindow 窗口</h3>',
      '<p>这个示例创建一个无边框、透明背景、不可调整大小、始终置顶的窗口。</p>',
      '<h4>main.js</h4>',
      codeBox('main.js', "const { app, BrowserWindow } = require('electron/main')\nconst path = require('node:path')\n\nfunction createWindow () {\n  const win = new BrowserWindow({\n    width: 800,\n    height: 600,\n    frame: false,\n    transparent: true,\n    resizable: false,\n    alwaysOnTop: true,\n    webPreferences: {\n      preload: path.join(__dirname, 'preload.js')\n    }\n  })\n\n  win.loadFile('index.html')\n}\n\napp.whenReady().then(() => {\n  createWindow()\n\n  app.on('activate', () => {\n    if (BrowserWindow.getAllWindows().length === 0) createWindow()\n  })\n})\n\napp.on('window-all-closed', () => {\n  if (process.platform !== 'darwin') app.quit()\n})"),
      '<h4>index.html</h4>',
      codeBox('index.html', '<!doctype html>\n<html lang="zh-CN">\n  <head>\n    <meta charset="UTF-8">\n    <title>自定义窗口</title>\n    <style>\n      body { background: rgba(15, 23, 42, 0.75); color: white; font-family: system-ui, sans-serif; }\n      .bar { -webkit-app-region: drag; padding: 16px; }\n    </style>\n  </head>\n  <body>\n    <div class="bar">拖拽这里可以移动窗口</div>\n    <p>这是一个 frameless + transparent 窗口。</p>\n  </body>\n</html>')
    ].join('');
  }

  return '';
}

async function fetchFiddleFiles(fileList) {
  const entries = [];
  for (const file of fileList) {
    const url = FIDDLE_BASE + file;
    const content = await fetchText(url);
    entries.push({ name: file.split('/').pop(), content: content });
  }
  return entries;
}

async function buildFiddleExtra(slug) {
  if (slug === 'dark-mode') {
    const files = await fetchFiddleFiles([
      'features/dark-mode/index.html',
      'features/dark-mode/main.js',
      'features/dark-mode/preload.js',
      'features/dark-mode/renderer.js',
      'features/dark-mode/styles.css'
    ]);
    return '<h3>完整可运行代码：Dark Mode</h3>' + files.map(function (file) { return '<h4>' + escapeHtml(file.name) + '</h4>' + codeBox(file.name, file.content); }).join('');
  }

  if (slug === 'navigation-history') {
    const files = await fetchFiddleFiles([
      'features/navigation-history/index.html',
      'features/navigation-history/main.js',
      'features/navigation-history/preload.js',
      'features/navigation-history/renderer.js',
      'features/navigation-history/style.css'
    ]);
    return '<h3>完整可运行代码：Navigation History</h3>' + files.map(function (file) { return '<h4>' + escapeHtml(file.name) + '</h4>' + codeBox(file.name, file.content); }).join('');
  }

  if (slug === 'launch-app-from-url-in-another-app') {
    const files = await fetchFiddleFiles([
      'system/protocol-handler/launch-app-from-URL-in-another-app/index.html',
      'system/protocol-handler/launch-app-from-URL-in-another-app/main.js',
      'system/protocol-handler/launch-app-from-URL-in-another-app/preload.js',
      'system/protocol-handler/launch-app-from-URL-in-another-app/renderer.js'
    ]);
    return '<h3>完整可运行代码：Deep Links</h3>' + files.map(function (file) { return '<h4>' + escapeHtml(file.name) + '</h4>' + codeBox(file.name, file.content); }).join('');
  }

  if (slug === 'devices') {
    const sections = [
      ['Web Bluetooth', [
        'features/web-bluetooth/index.html',
        'features/web-bluetooth/main.js',
        'features/web-bluetooth/preload.js',
        'features/web-bluetooth/renderer.js'
      ]],
      ['Web HID', [
        'features/web-hid/index.html',
        'features/web-hid/main.js',
        'features/web-hid/renderer.js'
      ]],
      ['Web Serial', [
        'features/web-serial/index.html',
        'features/web-serial/main.js',
        'features/web-serial/renderer.js'
      ]],
      ['Web USB', [
        'features/web-usb/index.html',
        'features/web-usb/main.js',
        'features/web-usb/renderer.js'
      ]]
    ];

    let html = '<h3>完整可运行代码：Device Access</h3>';
    for (const [title, fileList] of sections) {
      const files = await fetchFiddleFiles(fileList);
      html += '<h4>' + escapeHtml(title) + '</h4>';
      html += files.map(function (file) { return codeBox(file.name, file.content); }).join('');
    }
    return html;
  }

  return '';
}

function pageCss() {
  return `
    :root { --bg:#f7fafc; --panel:#fff; --panel2:#eef3f8; --text:#0f172a; --muted:#526072; --line:#dbe4ee; --accent:#0284c7; --accent2:#0ea5e9; --code:#f6f8fb; --radius:14px; }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { margin:0; color:var(--text); font-family:"Segoe UI","Microsoft YaHei",system-ui,sans-serif; line-height:1.75; background:radial-gradient(circle at 10% 0%, rgba(56,189,248,.14), transparent 28rem),radial-gradient(circle at 90% 12%, rgba(167,139,250,.12), transparent 30rem),linear-gradient(135deg,#f8fbff 0%,#eef4fb 50%,#f8fafc 100%); background-attachment:fixed; }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .wrap { max-width:1000px; margin:0 auto; padding:1.6rem 1.2rem 4rem; }
    .top { display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-bottom:1.4rem; }
    .back { border:1px solid var(--line); background:var(--panel); border-radius:999px; padding:.45rem .85rem; font-size:.9rem; }
    .pager a { border:1px solid var(--line); background:var(--panel); border-radius:999px; padding:.4rem .75rem; font-size:.88rem; }
    main { background:rgba(255,255,255,.72); border:1px solid var(--line); border-radius:var(--radius); padding:2rem; box-shadow:0 18px 50px rgba(15,23,42,.06); }
    h1 { margin:0 0 .35rem; font-size:clamp(2rem,5vw,3rem); line-height:1.15; letter-spacing:-.02em; }
    .meta { color:var(--muted); margin:0 0 1.8rem; }
    h2 { margin:2.1rem 0 .7rem; font-size:1.45rem; }
    h3 { margin:1.6rem 0 .5rem; font-size:1.1rem; }
    p, li { color:#334155; }
    strong { color:#0f172a; }
    .callout { border-left:4px solid var(--accent); background:rgba(2,132,199,.07); padding:.85rem 1rem; border-radius:0 var(--radius) var(--radius) 0; margin:1rem 0; }
    .steps { background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); padding:1.1rem 1.3rem; margin-top:1.2rem; }
    .steps ol { margin:0; padding-left:1.4rem; }
    .steps li { margin:.45rem 0; }
    .codebox { border:1px solid var(--line); background:var(--code); border-radius:var(--radius); overflow:hidden; margin:1rem 0 1.4rem; }
    .codebar { display:flex; justify-content:space-between; align-items:center; padding:.5rem .8rem; border-bottom:1px solid var(--line); background:#edf3f8; color:var(--muted); font-size:.82rem; }
    .copy-btn { border:1px solid var(--line); background:#fff; color:#334155; border-radius:8px; padding:.25rem .6rem; cursor:pointer; font-size:.78rem; }
    .copy-btn:hover { border-color:var(--accent); color:var(--accent); }
    pre { margin:0; padding:1rem 1.1rem; overflow:auto; color:#0f172a; font-family:"Cascadia Code","JetBrains Mono",Consolas,monospace; font-size:.9rem; line-height:1.55; }
    code { font-family:"Cascadia Code","JetBrains Mono",Consolas,monospace; }
    blockquote { border-left:4px solid #b6c5d6; background:#f7fafc; margin:1rem 0; padding:.8rem 1rem; color:#475569; }
    img { max-width:100%; height:auto; border:1px solid var(--line); border-radius:10px; }
    hr { border:0; border-top:1px solid var(--line); margin:2rem 0; }
    table { border-collapse:collapse; width:100%; margin:1rem 0; background:#fff; }
    th, td { border:1px solid var(--line); padding:.5rem .65rem; text-align:left; vertical-align:top; font-size:.9rem; }
    th { background:#eef3f8; }
    footer { color:var(--muted); font-size:.85rem; margin-top:1.4rem; text-align:center; }
    @media (max-width:640px) { main { padding:1.2rem; } .top { align-items:flex-start; } }
  `;
}

function pageJs() {
  return `
    function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
      return new Promise(function (resolve, reject) {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        try { document.execCommand('copy'); resolve(); }
        catch (err) { reject(err); }
        finally { document.body.removeChild(ta); }
      });
    }
    document.querySelectorAll('.codebox').forEach(function (box) {
      var btn = box.querySelector('.copy-btn');
      var code = box.querySelector('pre code');
      btn.addEventListener('click', function () {
        copyText(code.textContent).then(function () {
          btn.textContent = '已复制';
          setTimeout(function () { btn.textContent = '复制'; }, 1200);
        });
      });
    });
  `;
}

function buildPage(example, index, total) {
  const [slug, zh] = example;
  const prev = index > 0 ? EXAMPLES[index - 1] : null;
  const next = index < total - 1 ? EXAMPLES[index + 1] : null;
  const pager = [];
  if (prev) pager.push('<a href="' + prev[0] + '.html">← ' + escapeHtml(prev[1].split(' ')[0]) + '</a>');
  pager.push('<a href="index.html">目录</a>');
  if (next) pager.push('<a href="' + next[0] + '.html">' + escapeHtml(next[1].split(' ')[0]) + ' →</a>');

  const steps = buildOperationSteps(slug);

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(zh)} - Electron 官方示例教程</title>
  <style>${pageCss()}</style>
</head>
<body>
  <div class="wrap">
    <header class="top">
      <a class="back" href="index.html">← 全部示例</a>
      <nav class="pager">${pager.join('')}</nav>
    </header>
    <main>
      <h1>${escapeHtml(zh)}</h1>
      <p class="meta">Electron 官方示例 · ${escapeHtml(slug)} · 第 ${index + 1} / ${total} 个</p>

      <section>
        <h2>手把手操作步骤</h2>
        <div class="callout">本页面基于 Electron 官方文档整理。先在本地运行起来，再阅读下面的官方说明和代码。</div>
        <div class="steps"><ol>
          ${steps.map(function (s) { return '<li>' + s + '</li>'; }).join('')}
        </ol></div>
      </section>

      <section>
        <h2>官方文档与代码</h2>
        ${'__CONTENT__'}
      </section>
    </main>
    <footer>Electron 官方示例教程 · 生成自 electronjs.org 文档</footer>
  </div>
  <script>${pageJs()}</script>
</body>
</html>`;
}

function buildIndex() {
  const cards = EXAMPLES.map(function (example, index) {
    return '<a class="card" href="' + example[0] + '.html"><span class="num">' + String(index + 1).padStart(2, '0') + '</span><strong>' + escapeHtml(example[1]) + '</strong><span>' + escapeHtml(example[0]) + '</span></a>';
  }).join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Electron 官方示例教程合集</title>
  <style>${pageCss()}
    .hero { text-align:center; padding:2.5rem 0 1rem; }
    .hero h1 { margin-bottom:.6rem; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:1rem; margin-top:2rem; }
    .card { display:flex; flex-direction:column; gap:.35rem; border:1px solid var(--line); background:#fff; border-radius:var(--radius); padding:1rem 1.1rem; color:var(--text); transition:.18s ease; }
    .card:hover { transform:translateY(-2px); border-color:var(--accent); text-decoration:none; box-shadow:0 12px 30px rgba(2,132,199,.08); }
    .num { color:var(--accent); font-size:.8rem; letter-spacing:.08em; }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <h1>Electron 官方示例教程合集</h1>
      <p class="meta">共 ${EXAMPLES.length} 个示例，每个页面都包含 PowerShell 操作步骤和官方代码。</p>
    </header>
    <main style="background:transparent;border:0;box-shadow:none;padding:0;">
      <div class="grid">${cards}</div>
    </main>
    <footer>点击任意示例开始学习 · 建议按顺序进行</footer>
  </div>
</body>
</html>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (let index = 0; index < EXAMPLES.length; index += 1) {
    const [slug] = EXAMPLES[index];
    const url = RAW_BASE + slug + '.md';
    const md = await fetchText(url);
    let contentHtml = markdownToHtml(md);

    const manualExtra = buildManualExtra(slug);
    if (manualExtra) {
      contentHtml += manualExtra;
    }

    const fiddleExtra = await buildFiddleExtra(slug);
    if (fiddleExtra) {
      contentHtml += fiddleExtra;
    }

    const page = buildPage(EXAMPLES[index], index, EXAMPLES.length).replace('__CONTENT__', contentHtml);
    fs.writeFileSync(path.join(OUT_DIR, slug + '.html'), page, 'utf8');
    console.log('OK', slug);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), buildIndex(), 'utf8');
  console.log('DONE', OUT_DIR);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
