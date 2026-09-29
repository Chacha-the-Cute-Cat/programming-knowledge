const fs = require('node:fs');
const path = require('node:path');

const EXAMPLES = [
  {
    slug: 'dark-mode',
    title: '深色模式 Dark Mode',
    subtitle: '使用 nativeTheme 与 CSS 媒体查询实现手动切换主题',
    intro: '这个例子不复制官方示例，而是从零写一个“一键切换浅色/深色”的小应用。主进程负责修改 nativeTheme，渲染进程通过 preload 暴露的安全接口调用它。',
    files: [
      {
        name: 'main.js',
        note: '创建窗口，并注册两个 IPC 处理函数：读取当前主题和切换主题。',
        code: `const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const path = require('node:path')

function createWindow () {
  const win = new BrowserWindow({
    width: 720,
    height: 480,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.loadFile('index.html')
}

ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors)
ipcMain.handle('theme:toggle', () => {
  nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'light' : 'dark'
  return nativeTheme.shouldUseDarkColors
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'preload.js',
        note: '只把两个明确的主题方法暴露给页面，不暴露 ipcRenderer 本身。',
        code: `const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('theme', {
  get: () => ipcRenderer.invoke('theme:get'),
  toggle: () => ipcRenderer.invoke('theme:toggle')
})`
      },
      {
        name: 'index.html',
        note: 'CSS 使用 prefers-color-scheme 自动响应 nativeTheme 的变化。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>深色模式示例</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 32px; background: #ffffff; color: #111827; }
    @media (prefers-color-scheme: dark) {
      body { background: #0f172a; color: #f8fafc; }
    }
    button { padding: 10px 16px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>深色模式</h1>
  <p>点击按钮切换 nativeTheme，页面会自动响应。</p>
  <button id="toggle">切换主题</button>
  <script src="renderer.js"></script>
</body>
</html>`
      },
      {
        name: 'renderer.js',
        note: '调用 preload 暴露的 API，并更新按钮文字。',
        code: `const button = document.getElementById('toggle')

async function updateLabel () {
  const dark = await window.theme.get()
  button.textContent = dark ? '切换到浅色' : '切换到深色'
}

button.addEventListener('click', async () => {
  await window.theme.toggle()
  updateLabel()
})

updateLabel()`
      }
    ],
    verify: '运行后点击“切换主题”，窗口背景和文字颜色会在浅色、深色之间切换，按钮文字也会同步变化。',
    notes: 'nativeTheme.themeSource 可以设为 system、light 或 dark。使用 prefers-color-scheme 后，不需要手动给页面添加 class。'
  },
  {
    slug: 'devices',
    title: '设备访问 Devices',
    subtitle: '用 WebUSB 实现一个“选择并显示 USB 设备”的小应用',
    intro: '这是我自己编写的 WebUSB 示例。主进程拦截 USB 设备选择事件，渲染进程只调用浏览器提供的 navigator.usb API。',
    files: [
      {
        name: 'main.js',
        note: '设置设备权限处理函数，并自动选择列表中的第一个 USB 设备。',
        code: `const { app, BrowserWindow, session } = require('electron')

function createWindow () {
  const win = new BrowserWindow({
    width: 700,
    height: 460
  })
  win.loadFile('index.html')
}

app.whenReady().then(() => {
  const ses = session.defaultSession
  ses.setDevicePermissionHandler(() => true)
  ses.on('select-usb-device', (event, details, callback) => {
    event.preventDefault()
    const device = details.deviceList[0]
    callback(device ? device.deviceId : null)
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'index.html',
        note: '页面只提供一个按钮和结果区域。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>设备访问示例</title>
</head>
<body>
  <h1>USB 设备访问</h1>
  <button id="pick">选择 USB 设备</button>
  <p id="result"></p>
  <script src="renderer.js"></script>
</body>
</html>`
      },
      {
        name: 'renderer.js',
        note: '调用 navigator.usb.requestDevice，将结果显示到页面。',
        code: `const button = document.getElementById('pick')
const result = document.getElementById('result')

button.addEventListener('click', async () => {
  try {
    const device = await navigator.usb.requestDevice({ filters: [] })
    result.textContent = '已选择设备：' + (device.productName || '未知设备')
  } catch (error) {
    result.textContent = '取消选择或发生错误：' + error.message
  }
})`
      }
    ],
    verify: '插入一个 USB 设备后运行应用，点击按钮，页面会显示设备名称。没有 USB 设备时也可以看到“取消选择或发生错误”的提示。',
    notes: 'WebUSB 需要真实硬件。你可以把主进程中的设备选择逻辑改成弹出一个自定义设备列表，再返回用户选择的 deviceId。'
  },
  {
    slug: 'in-app-purchases',
    title: '应用程序内购 In-App Purchases',
    subtitle: '用 Electron 的 inAppPurchase 模块获取商品并发起购买',
    intro: '这是一个 macOS App Store 应用内购的基础示例。代码是重新编写的，仅演示 API 调用顺序和交易状态处理。',
    files: [
      {
        name: 'main.js',
        note: '尽早监听 transactions-updated，然后查询商品并购买第一个商品。',
        code: `const { app, inAppPurchase } = require('electron')

const PRODUCT_IDS = ['com.example.product1', 'com.example.product2']

inAppPurchase.on('transactions-updated', (event, transactions) => {
  for (const transaction of transactions) {
    if (transaction.transactionState === 'purchased') {
      console.log('购买成功：' + transaction.payment.productIdentifier)
      inAppPurchase.finishTransactionByDate(transaction.transactionDate)
    } else if (transaction.transactionState === 'failed') {
      console.log('购买失败：' + transaction.payment.productIdentifier)
      inAppPurchase.finishTransactionByDate(transaction.transactionDate)
    }
  }
})

app.whenReady().then(() => {
  if (!inAppPurchase.canMakePayments()) {
    console.log('当前账号不能进行内购')
    return
  }

  inAppPurchase.getProducts(PRODUCT_IDS).then((products) => {
    console.log('商品数量：' + products.length)
    for (const product of products) {
      console.log(product.localizedTitle + ' - ' + product.formattedPrice)
    }

    const target = products[0]
    inAppPurchase.purchaseProduct(target.productIdentifier, 1).then((valid) => {
      console.log(valid ? '已加入支付队列' : '商品无效')
    })
  })
})`
      },
      {
        name: 'index.html',
        note: '内购主要由主进程驱动，页面只作为应用容器。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>应用内购示例</title>
</head>
<body>
  <h1>macOS 应用内购</h1>
  <p>请查看终端日志，确认商品查询和购买流程。</p>
</body>
</html>`
      }
    ],
    verify: '在 macOS 上运行，终端会打印商品列表，并尝试把第一个商品加入支付队列。',
    notes: '这个模块只在 macOS App Store 打包环境中可用。商品 ID 需要在 App Store Connect 中创建并替换。'
  },
  {
    slug: 'keyboard-shortcuts',
    title: '键盘快捷键 Keyboard Shortcuts',
    subtitle: '同时演示菜单快捷键和全局快捷键',
    intro: '这是我自己编写的快捷键示例：应用菜单中使用 accelerator，另注册一个全局快捷键 CommandOrControl+Shift+D。',
    files: [
      {
        name: 'main.js',
        note: '用 Menu 构建菜单，并在 app 就绪后注册全局快捷键。',
        code: `const { app, BrowserWindow, Menu, globalShortcut, dialog } = require('electron')

function createWindow () {
  const win = new BrowserWindow({
    width: 720,
    height: 440
  })
  win.loadFile('index.html')
}

const menu = Menu.buildFromTemplate([
  {
    label: '文件',
    submenu: [
      {
        label: '打开',
        accelerator: 'CmdOrCtrl+O',
        click: () => dialog.showMessageBox({ message: '你按下了 CmdOrCtrl+O' })
      },
      { type: 'separator' },
      { role: 'quit' }
    ]
  },
  {
    label: '帮助',
    submenu: [
      {
        label: '显示快捷键',
        accelerator: 'CmdOrCtrl+Shift+H',
        click: () => dialog.showMessageBox({ message: '快捷键：Ctrl+O、Ctrl+Shift+D' })
      }
    ]
  }
])

Menu.setApplicationMenu(menu)

app.whenReady().then(() => {
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    console.log('全局快捷键被触发')
  })
  createWindow()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'index.html',
        note: '页面列出可用的快捷键。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>键盘快捷键示例</title>
</head>
<body>
  <h1>键盘快捷键</h1>
  <ul>
    <li>Ctrl+O：打开</li>
    <li>Ctrl+Shift+H：显示快捷键</li>
    <li>Ctrl+Shift+D：全局快捷键</li>
  </ul>
</body>
</html>`
      }
    ],
    verify: '运行后，使用菜单或快捷键触发弹窗；按下 Ctrl+Shift+D 会在 PowerShell 终端打印“全局快捷键被触发”。',
    notes: '菜单快捷键只在窗口聚焦时生效，全局快捷键在应用运行期间生效。退出应用前要注销全局快捷键。'
  },
  {
    slug: 'launch-app-from-url-in-another-app',
    title: '深度链接 Deep Links',
    subtitle: '让应用注册自定义协议，并从外部链接打开',
    intro: '这个例子从零实现 myapp:// 协议处理，并处理 Windows/Linux 的 second-instance 和 macOS 的 open-url。',
    files: [
      {
        name: 'main.js',
        note: '注册协议、获取单实例锁，并把收到的 URL 显示出来。',
        code: `const { app, BrowserWindow, dialog } = require('electron')

let mainWindow = null

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('myapp', process.execPath, [process.argv[1]])
  }
} else {
  app.setAsDefaultProtocolClient('myapp')
}

function showUrl (url) {
  dialog.showMessageBox({ title: '收到深度链接', message: url })
}

function findUrl (argv) {
  return argv.find((item) => item.startsWith('myapp://'))
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    const url = findUrl(argv)
    if (url) showUrl(url)
  })

  app.on('open-url', (event, url) => {
    event.preventDefault()
    showUrl(url)
  })
}

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 760,
    height: 460
  })
  mainWindow.loadFile('index.html')
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'index.html',
        note: '页面提示如何测试深度链接。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>深度链接示例</title>
</head>
<body>
  <h1>深度链接</h1>
  <p>应用已注册 myapp:// 协议。</p>
  <p>可以打开浏览器地址栏，输入：myapp://hello?from=test</p>
</body>
</html>`
      }
    ],
    verify: '运行后，在浏览器或“运行”中打开 myapp://hello，应用会弹出对话框显示收到的 URL。',
    notes: 'Windows/Linux 使用 second-instance 事件，macOS 使用 open-url 事件。打包后的应用通常无需额外参数。'
  },
  {
    slug: 'linux-desktop-actions',
    title: '桌面启动器快捷操作 Linux Desktop Actions',
    subtitle: '在 Linux .desktop 文件中定义应用快捷动作',
    intro: '这是针对 Linux 桌面环境的原创示例，演示 .desktop 文件的 Actions 配置，并让 Electron 读取传入参数。',
    files: [
      {
        name: 'my-app.desktop',
        note: '把 Exec 路径替换成你的应用实际路径。',
        code: `[Desktop Entry]
Type=Application
Name=My Electron App
Comment=Electron 桌面快捷操作示例
Exec=/opt/my-app/my-app %U
Actions=new;open

[Desktop Action new]
Name=新建窗口
Exec=/opt/my-app/my-app --new

[Desktop Action open]
Name=打开文件
Exec=/opt/my-app/my-app --open`
      },
      {
        name: 'main.js',
        note: '读取命令行参数，打印用户选择的桌面动作。',
        code: `const { app, BrowserWindow } = require('electron')

function createWindow () {
  const win = new BrowserWindow({ width: 700, height: 420 })
  win.loadFile('index.html')
}

app.whenReady().then(() => {
  const action = process.argv.find((item) => item === '--new' || item === '--open')
  if (action) console.log('桌面动作：' + action)
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'index.html',
        note: '页面提示这是 Linux 桌面动作示例。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Linux Desktop Actions</title>
</head>
<body>
  <h1>Linux 桌面快捷操作</h1>
  <p>请查看终端，确认收到的 --new 或 --open 参数。</p>
</body>
</html>`
      }
    ],
    verify: '在 Linux 上安装 .desktop 文件后，右键应用图标会看到“新建窗口”和“打开文件”两个动作。',
    notes: '这个功能主要针对 Linux。Windows 可以使用 app.setUserTasks 实现类似的 JumpList。'
  },
  {
    slug: 'menus',
    title: '菜单 Menus',
    subtitle: '创建应用菜单和右键上下文菜单',
    intro: '这是我自己编写的菜单示例，包含顶部应用菜单和页面内右键菜单。',
    files: [
      {
        name: 'main.js',
        note: '创建应用菜单，并为窗口注册自定义右键菜单。',
        code: `const { app, BrowserWindow, Menu } = require('electron')

function createWindow () {
  const win = new BrowserWindow({
    width: 760,
    height: 500
  })
  win.loadFile('index.html')

  win.webContents.on('context-menu', (event, params) => {
    const template = [
      { label: '复制', role: 'copy' },
      { label: '粘贴', role: 'paste' },
      { type: 'separator' },
      { label: '打印选中文字', click: () => console.log(params.selectionText) }
    ]
    Menu.buildFromTemplate(template).popup({ window: win })
  })
}

const appMenu = Menu.buildFromTemplate([
  {
    label: '文件',
    submenu: [
      { label: '新建窗口', click: () => createWindow() },
      { type: 'separator' },
      { role: 'quit' }
    ]
  },
  {
    label: '编辑',
    submenu: [
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' }
    ]
  }
])

Menu.setApplicationMenu(appMenu)

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'index.html',
        note: '页面上有一个输入框，方便测试右键菜单。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>菜单示例</title>
</head>
<body>
  <h1>菜单</h1>
  <textarea rows="6" cols="50">选中这段文字，然后点击鼠标右键。</textarea>
</body>
</html>`
      }
    ],
    verify: '运行后，顶部有“文件”和“编辑”菜单；在输入框中右键会弹出复制、粘贴和“打印选中文字”。',
    notes: 'role 属性会使用系统原生行为。自定义菜单项只需要提供 label 和 click 回调。'
  },
  {
    slug: 'multithreading',
    title: '多线程 Multithreading',
    subtitle: '在 Web Worker 中使用 Node.js 模块',
    intro: '这个例子从零演示如何让 Web Worker 读取 Node.js 的 os 模块信息。',
    files: [
      {
        name: 'main.js',
        note: '开启 nodeIntegrationInWorker，并关闭 sandbox。',
        code: `const { app, BrowserWindow } = require('electron')

function createWindow () {
  const win = new BrowserWindow({
    width: 720,
    height: 420,
    webPreferences: {
      nodeIntegrationInWorker: true,
      sandbox: false
    }
  })
  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'index.html',
        note: '按钮触发 Worker。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>多线程示例</title>
</head>
<body>
  <h1>Web Worker + Node.js</h1>
  <button id="run">在 Worker 中读取 CPU 信息</button>
  <p id="result"></p>
  <script src="renderer.js"></script>
</body>
</html>`
      },
      {
        name: 'renderer.js',
        note: '创建 worker.js 并接收消息。',
        code: `const button = document.getElementById('run')
const result = document.getElementById('result')

button.addEventListener('click', () => {
  const worker = new Worker('worker.js')
  worker.onmessage = (event) => {
    result.textContent = event.data
    worker.terminate()
  }
  worker.postMessage('start')
})`
      },
      {
        name: 'worker.js',
        note: '在 Worker 中直接使用 Node.js 内置模块。',
        code: `const os = require('node:os')

self.onmessage = () => {
  self.postMessage('当前 CPU 核心数：' + os.cpus().length)
}`
      }
    ],
    verify: '运行后点击按钮，页面会显示当前 CPU 核心数，说明 Worker 成功调用了 Node.js 的 os 模块。',
    notes: 'nodeIntegrationInWorker 需要 sandbox 为 false。Electron 内置模块通常不能在 Worker 中使用。'
  },
  {
    slug: 'native-file-drag-drop',
    title: '原生文件拖 & 放 Native File Drag & Drop',
    subtitle: '从窗口拖出一个动态生成的文件到系统',
    intro: '这是自己编写的拖拽示例：页面元素被拖出窗口时，主进程动态创建文件并调用 webContents.startDrag。',
    files: [
      {
        name: 'main.js',
        note: '接收拖拽事件，创建临时文件后调用 startDrag。',
        code: `const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

function createWindow () {
  const win = new BrowserWindow({
    width: 640,
    height: 420,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.loadFile('index.html')
}

ipcMain.on('drag:start', (event, fileName) => {
  const filePath = path.join(app.getPath('temp'), fileName)
  fs.writeFileSync(filePath, '这是从 Electron 窗口拖出来的文件。')
  event.sender.startDrag({ file: filePath })
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'preload.js',
        note: '暴露 startDrag 方法。',
        code: `const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('drag', {
  start: (fileName) => ipcRenderer.send('drag:start', fileName)
})`
      },
      {
        name: 'index.html',
        note: '给一个元素设置 draggable，并加载 renderer.js。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>原生文件拖放</title>
  <style>
    #drag { display: inline-block; padding: 20px; border: 2px dashed #0284c7; border-radius: 10px; user-select: none; }
  </style>
</head>
<body>
  <h1>把下面的方块拖到桌面或文件夹</h1>
  <div id="drag" draggable="true">拖我出去</div>
  <script src="renderer.js"></script>
</body>
</html>`
      },
      {
        name: 'renderer.js',
        note: '在 ondragstart 中调用 preload 暴露的方法。',
        code: `document.getElementById('drag').ondragstart = (event) => {
  event.preventDefault()
  window.drag.start('dragged-from-electron.txt')
}`
      }
    ],
    verify: '运行后把方块拖到桌面或文件夹，会生成一个 dragged-from-electron.txt 文件。',
    notes: 'startDrag 中的 file 必须指向真实存在的本地文件。'
  },
  {
    slug: 'navigation-history',
    title: '导航历史 Navigation History',
    subtitle: '通过主进程控制前进、后退和读取当前 URL',
    intro: '这是自己编写的页面导航示例，用 hash 改变地址，再由主进程控制历史记录。',
    files: [
      {
        name: 'main.js',
        note: '提供 back、forward 和 currentUrl 三个 IPC 方法。',
        code: `const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

function createWindow () {
  const win = new BrowserWindow({
    width: 760,
    height: 460,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.loadFile('index.html')
}

ipcMain.handle('nav:back', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win.webContents.navigationHistory.canGoBack()) {
    win.webContents.navigationHistory.goBack()
  }
})

ipcMain.handle('nav:forward', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win.webContents.navigationHistory.canGoForward()) {
    win.webContents.navigationHistory.goForward()
  }
})

ipcMain.handle('nav:url', (event) => event.sender.getURL())

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'preload.js',
        note: '把三个导航方法安全暴露给页面。',
        code: `const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('nav', {
  back: () => ipcRenderer.invoke('nav:back'),
  forward: () => ipcRenderer.invoke('nav:forward'),
  currentUrl: () => ipcRenderer.invoke('nav:url')
})`
      },
      {
        name: 'index.html',
        note: '使用 hash 链接制造导航历史。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>导航历史示例</title>
</head>
<body>
  <h1>导航历史</h1>
  <a href="#page1">第一页</a>
  <a href="#page2">第二页</a>
  <button id="back">后退</button>
  <button id="forward">前进</button>
  <p id="url"></p>
  <script src="renderer.js"></script>
</body>
</html>`
      },
      {
        name: 'renderer.js',
        note: '绑定按钮并显示当前 URL。',
        code: `document.getElementById('back').addEventListener('click', () => window.nav.back())
document.getElementById('forward').addEventListener('click', () => window.nav.forward())

async function updateUrl () {
  document.getElementById('url').textContent = '当前地址：' + await window.nav.currentUrl()
}

window.addEventListener('hashchange', updateUrl)
updateUrl()`
      }
    ],
    verify: '点击第一页、第二页改变 hash，然后点击后退和前进，页面 URL 会相应变化。',
    notes: '导航历史不仅适用于 hash，也适用于页面内跳转和 loadURL 后的历史记录。'
  },
  {
    slug: 'notifications',
    title: '通知 Notifications',
    subtitle: '由渲染进程触发主进程发送系统通知',
    intro: '这是自己编写的通知示例，避免让页面直接使用主进程 Notification，而是通过 IPC 发送。',
    files: [
      {
        name: 'main.js',
        note: '监听 notify 事件，使用 Notification 发送系统通知。',
        code: `const { app, BrowserWindow, ipcMain, Notification } = require('electron')
const path = require('node:path')

function createWindow () {
  const win = new BrowserWindow({
    width: 640,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.loadFile('index.html')
}

ipcMain.on('notify', (event, message) => {
  new Notification({
    title: 'Electron 通知',
    body: message || '这是一条来自 Electron 的通知。'
  }).show()
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'preload.js',
        note: '只暴露 send 方法。',
        code: `const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('notify', {
  send: (message) => ipcRenderer.send('notify', message)
})`
      },
      {
        name: 'index.html',
        note: '输入框和按钮。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>通知示例</title>
</head>
<body>
  <h1>系统通知</h1>
  <input id="message" placeholder="输入通知内容">
  <button id="send">发送通知</button>
  <script src="renderer.js"></script>
</body>
</html>`
      },
      {
        name: 'renderer.js',
        note: '点击按钮时发送通知。',
        code: `document.getElementById('send').addEventListener('click', () => {
  const message = document.getElementById('message').value
  window.notify.send(message)
})`
      }
    ],
    verify: '运行后输入内容并点击发送，系统会弹出通知。',
    notes: '不同操作系统通知展示方式不同。Windows 上可以进一步设置 toastXml。'
  },
  {
    slug: 'offscreen-rendering',
    title: '离屏渲染 Offscreen Rendering',
    subtitle: '把网页绘制结果保存成 PNG 图片',
    intro: '这是自己编写的离屏渲染示例：窗口不显示，但监听 paint 事件并保存截图。',
    files: [
      {
        name: 'main.js',
        note: '禁用硬件加速，启用 offscreen，并在 paint 事件中保存图片。',
        code: `const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

app.disableHardwareAcceleration()

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      offscreen: true
    }
  })

  win.loadFile('index.html')
  win.webContents.on('paint', (event, dirty, image) => {
    const output = path.join(process.cwd(), 'offscreen.png')
    fs.writeFileSync(output, image.toPNG())
    console.log('截图已保存：' + output)
  })
}

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'index.html',
        note: '页面内容会被绘制到离屏画布。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>离屏渲染示例</title>
  <style>
    body { margin: 0; height: 100vh; display: grid; place-items: center; background: linear-gradient(135deg, #0ea5e9, #6366f1); color: white; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <h1>离屏渲染截图</h1>
</body>
</html>`
      }
    ],
    verify: '运行后，项目目录下会生成 offscreen.png，打开它能看到蓝色渐变背景的“离屏渲染截图”。',
    notes: 'offscreen 窗口不会显示在屏幕上。paint 事件在页面内容变化时触发。'
  },
  {
    slug: 'online-offline-events',
    title: '在线/离线事件探测 Online/Offline Events',
    subtitle: '监听网络状态变化并显示当前状态',
    intro: '这是自己编写的网络状态示例，使用渲染进程的 online 和 offline 事件。',
    files: [
      {
        name: 'main.js',
        note: '创建普通窗口即可。',
        code: `const { app, BrowserWindow } = require('electron')

function createWindow () {
  const win = new BrowserWindow({
    width: 640,
    height: 400
  })
  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'index.html',
        note: '用一个明显的大色块显示网络状态。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>在线/离线事件</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 32px; }
    #status { display: inline-block; padding: 10px 18px; border-radius: 999px; color: white; }
    .online { background: #16a34a; }
    .offline { background: #dc2626; }
  </style>
</head>
<body>
  <h1>网络状态</h1>
  <p>当前状态：<span id="status">检测中...</span></p>
  <script src="renderer.js"></script>
</body>
</html>`
      },
      {
        name: 'renderer.js',
        note: '监听 online 和 offline 事件。',
        code: `const status = document.getElementById('status')

function update () {
  const online = navigator.onLine
  status.textContent = online ? '在线' : '离线'
  status.className = online ? 'online' : 'offline'
}

window.addEventListener('online', update)
window.addEventListener('offline', update)
update()`
      }
    ],
    verify: '运行后显示“在线”。可以临时断开网络或切换飞行模式，状态会变成“离线”；恢复网络后会变回“在线”。',
    notes: 'navigator.onLine 主要反映系统网络连接状态，不一定能保证目标网站可达。'
  },
  {
    slug: 'progress-bar',
    title: '进度条 Progress Bar',
    subtitle: '在任务栏或 Dock 上显示模拟进度',
    intro: '这是自己编写的进度条示例，用定时器不断增加 setProgressBar 的值。',
    files: [
      {
        name: 'main.js',
        note: '每 200ms 增加一次进度，完成后清除定时器并移除进度条。',
        code: `const { app, BrowserWindow } = require('electron')

function createWindow () {
  const win = new BrowserWindow({
    width: 640,
    height: 360
  })
  win.loadFile('index.html')

  let progress = 0
  const timer = setInterval(() => {
    progress += 0.05
    win.setProgressBar(progress)
    if (progress >= 1) {
      clearInterval(timer)
      setTimeout(() => win.setProgressBar(-1), 600)
    }
  }, 200)
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'index.html',
        note: '页面提示进度显示在任务栏或 Dock。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>进度条示例</title>
</head>
<body>
  <h1>任务栏进度条</h1>
  <p>进度会显示在 Windows 任务栏按钮或 macOS Dock 图标上。</p>
</body>
</html>`
      }
    ],
    verify: '运行后观察任务栏应用按钮，进度会从 0 增加到 100%，然后消失。',
    notes: 'setProgressBar(-1) 会移除进度条。0 到 1 显示确定进度，大于 1 在 Windows 上显示不确定进度。'
  },
  {
    slug: 'recent-documents',
    title: '最近的文件 Recent Documents',
    subtitle: '向系统“最近打开”列表添加或清除文件',
    intro: '这是自己编写的最近文件示例，通过按钮添加一个模拟文件路径并清除列表。',
    files: [
      {
        name: 'main.js',
        note: '接收添加和清除两个 IPC 事件。',
        code: `const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

function createWindow () {
  const win = new BrowserWindow({
    width: 640,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.loadFile('index.html')
}

ipcMain.on('recent:add', (event, filePath) => {
  app.addRecentDocument(filePath)
})

ipcMain.on('recent:clear', () => {
  app.clearRecentDocuments()
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'preload.js',
        note: '暴露 add 和 clear 方法。',
        code: `const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('recent', {
  add: (filePath) => ipcRenderer.send('recent:add', filePath),
  clear: () => ipcRenderer.send('recent:clear')
})`
      },
      {
        name: 'index.html',
        note: '两个按钮。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>最近的文件示例</title>
</head>
<body>
  <h1>最近的文件</h1>
  <button id="add">添加示例文件</button>
  <button id="clear">清空列表</button>
  <script src="renderer.js"></script>
</body>
</html>`
      },
      {
        name: 'renderer.js',
        note: '用一个固定路径进行测试。',
        code: `document.getElementById('add').addEventListener('click', () => {
  window.recent.add('C:\\\\Users\\\\Public\\\\Documents\\\\example.txt')
})

document.getElementById('clear').addEventListener('click', () => {
  window.recent.clear()
})`
      }
    ],
    verify: '运行后点击“添加示例文件”，然后在任务栏图标上右键或查看系统最近文件，可以看到该文件。点击“清空列表”会移除它们。',
    notes: '实际使用时，应传入真实存在的文件路径。'
  },
  {
    slug: 'represented-file',
    title: '在 BrowserWindow 中展示文件 Represented File',
    subtitle: '设置窗口所代表的文件，并显示未保存状态',
    intro: '这是自己编写的 macOS 文件表示示例，展示窗口标题栏中的文件图标和编辑状态。',
    files: [
      {
        name: 'main.js',
        note: '设置 representedFilename 和 documentEdited。',
        code: `const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

function createWindow () {
  const win = new BrowserWindow({
    width: 720,
    height: 420,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.loadFile('index.html')
  return win
}

let mainWindow = null

ipcMain.on('file:open', (event, filePath) => {
  mainWindow.setRepresentedFilename(filePath)
  mainWindow.setDocumentEdited(true)
})

app.whenReady().then(() => {
  mainWindow = createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'preload.js',
        note: '暴露打开文件方法。',
        code: `const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('file', {
  open: (filePath) => ipcRenderer.send('file:open', filePath)
})`
      },
      {
        name: 'index.html',
        note: '按钮模拟打开一个文件。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Represented File 示例</title>
</head>
<body>
  <h1>在窗口中展示文件</h1>
  <button id="open">模拟打开文件</button>
  <script src="renderer.js"></script>
</body>
</html>`
      },
      {
        name: 'renderer.js',
        note: '调用 preload 暴露的方法。',
        code: `document.getElementById('open').addEventListener('click', () => {
  window.file.open('/Users/example/Documents/note.txt')
})`
      }
    ],
    verify: '在 macOS 上运行，点击按钮后窗口标题栏会显示文件图标，并出现“已编辑”的圆点标记。',
    notes: '这个 API 只在 macOS 上有效，Windows 和 Linux 可以忽略。'
  },
  {
    slug: 'spellchecker',
    title: '拼写检查器 Spellchecker',
    subtitle: '在内容编辑区域启用拼写检查并提供右键建议',
    intro: '这是自己编写的拼写检查示例，设置系统拼写语言，并给拼写错误单词提供建议菜单。',
    files: [
      {
        name: 'main.js',
        note: '设置拼写语言，并在右键菜单中展示建议。',
        code: `const { app, BrowserWindow, Menu, session } = require('electron')

function createWindow () {
  const win = new BrowserWindow({
    width: 760,
    height: 500
  })
  win.loadFile('index.html')

  win.webContents.on('context-menu', (event, params) => {
    const template = []
    if (params.misspelledWord) {
      for (const suggestion of params.dictionarySuggestions) {
        template.push({
          label: suggestion,
          click: () => win.webContents.replaceMisspelling(suggestion)
        })
      }
      template.push({ type: 'separator' })
    }
    template.push(
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' }
    )
    Menu.buildFromTemplate(template).popup({ window: win })
  })
}

app.whenReady().then(() => {
  session.defaultSession.setSpellCheckerLanguages(['en-US'])
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'index.html',
        note: '使用 contenteditable，方便输入并触发拼写检查。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>拼写检查器示例</title>
  <style>
    #editor { width: 90%; min-height: 200px; border: 1px solid #cbd5e1; padding: 12px; outline: none; }
  </style>
</head>
<body>
  <h1>拼写检查器</h1>
  <div id="editor" contenteditable="true">This is an exmple of a misspeled word.</div>
</body>
</html>`
      }
    ],
    verify: '运行后在编辑区右键，拼写错误单词下方会有红色波浪线，右键会显示正确拼写建议。',
    notes: '建议语言由 setSpellCheckerLanguages 决定。这里使用 en-US，因此英文单词更容易触发。'
  },
  {
    slug: 'web-embeds',
    title: 'Web 嵌入 Web Embeds',
    subtitle: '用 iframe 和 WebContentsView 嵌入外部网页',
    intro: '这是自己编写的网页嵌入示例，分别展示 iframe 和主进程控制的 WebContentsView。',
    files: [
      {
        name: 'index.html',
        note: '用 iframe 嵌入网页是最简单的方式。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Web 嵌入示例</title>
</head>
<body>
  <h1>iframe 嵌入</h1>
  <iframe src="https://www.example.com" width="100%" height="600"></iframe>
</body>
</html>`
      },
      {
        name: 'main.js',
        note: '如果使用 WebContentsView，则不需要 iframe，可以把它添加到 BaseWindow。',
        code: `const { app, BaseWindow, WebContentsView } = require('electron')

app.whenReady().then(() => {
  const win = new BaseWindow({ width: 900, height: 700 })
  const view = new WebContentsView()
  win.contentView.addChildView(view)
  view.setBounds({ x: 0, y: 0, width: 900, height: 700 })
  view.webContents.loadURL('https://www.example.com')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      }
    ],
    verify: 'iframe 方式会直接在页面中显示网页。WebContentsView 方式会创建一个独立窗口，并由主进程控制位置和大小。',
    notes: '优先使用 iframe 或 WebContentsView。webview 标签需要显式启用，且 Electron 不推荐使用。'
  },
  {
    slug: 'windows-taskbar',
    title: '任务栏自定义 Windows Taskbar',
    subtitle: '设置 JumpList、窗口闪烁和进度条',
    intro: '这是自己编写的 Windows 任务栏示例，演示用户任务、闪烁提示和进度显示。',
    files: [
      {
        name: 'main.js',
        note: '使用 app.setUserTasks、win.flashFrame 和 win.setProgressBar。',
        code: `const { app, BrowserWindow } = require('electron')

function createWindow () {
  const win = new BrowserWindow({
    width: 720,
    height: 420
  })
  win.loadFile('index.html')

  app.setUserTasks([
    {
      program: process.execPath,
      arguments: '--new-window',
      title: '新建窗口',
      description: '打开一个新的应用窗口'
    }
  ])

  win.setProgressBar(0.65)
  win.flashFrame(true)
  setTimeout(() => win.flashFrame(false), 3000)
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'index.html',
        note: '页面提示任务栏效果。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Windows 任务栏示例</title>
</head>
<body>
  <h1>Windows 任务栏</h1>
  <p>任务栏按钮会显示 65% 进度，并闪烁约 3 秒。</p>
  <p>右键任务栏图标可以看到“新建窗口”快捷任务。</p>
</body>
</html>`
      }
    ],
    verify: '运行后观察任务栏按钮：有进度、会闪烁，右键图标会出现“新建窗口”。',
    notes: '这些功能主要针对 Windows。JumpList 任务需要应用保持运行或正确注册。'
  },
  {
    slug: 'window-customization',
    title: '自定义窗口 Window Customization',
    subtitle: '创建无边框、透明并支持拖拽的自定义窗口',
    intro: '这是自己编写的窗口自定义示例，实现 frameless、transparent、拖拽区域和窗口控制按钮。',
    files: [
      {
        name: 'main.js',
        note: '创建无边框透明窗口，并处理最小化、最大化和关闭。',
        code: `const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 520,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.loadFile('index.html')
  return win
}

app.whenReady().then(() => {
  const win = createWindow()
  ipcMain.on('window:minimize', () => win.minimize())
  ipcMain.on('window:maximize', () => {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.on('window:close', () => win.close())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})`
      },
      {
        name: 'preload.js',
        note: '暴露窗口控制方法。',
        code: `const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close')
})`
      },
      {
        name: 'index.html',
        note: '拖拽区域使用 -webkit-app-region，按钮使用 no-drag。',
        code: `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>自定义窗口示例</title>
  <style>
    html, body { margin: 0; height: 100%; background: transparent; }
    body { display: grid; place-items: center; font-family: system-ui, sans-serif; }
    .window { width: 90%; height: 85%; border-radius: 18px; background: rgba(15, 23, 42, 0.88); color: white; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
    .titlebar { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; -webkit-app-region: drag; }
    .controls button { -webkit-app-region: no-drag; margin-left: 6px; }
    .content { padding: 20px; }
  </style>
</head>
<body>
  <div class="window">
    <div class="titlebar">
      <strong>自定义窗口</strong>
      <div class="controls">
        <button id="min">最小化</button>
        <button id="max">最大化</button>
        <button id="close">关闭</button>
      </div>
    </div>
    <div class="content">拖拽顶部标题栏可以移动窗口。</div>
  </div>
  <script src="renderer.js"></script>
</body>
</html>`
      },
      {
        name: 'renderer.js',
        note: '给三个按钮绑定窗口控制方法。',
        code: `document.getElementById('min').addEventListener('click', () => window.windowControls.minimize())
document.getElementById('max').addEventListener('click', () => window.windowControls.maximize())
document.getElementById('close').addEventListener('click', () => window.windowControls.close())`
      }
    ],
    verify: '运行后显示无边框半透明窗口，顶部标题栏可以拖拽，三个按钮分别控制最小化、最大化和关闭。',
    notes: 'transparent 在部分 Linux 环境中可能无效。拖拽区域上的交互元素需要设置 -webkit-app-region: no-drag。'
  }
];

const OUT_DIR = path.join(__dirname, 'electron-examples');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function codeBox(label, code) {
  return '<div class="codebox"><div class="codebar"><span>' + escapeHtml(label) + '</span><button type="button" class="copy-btn">复制</button></div><pre><code>' + escapeHtml(code.replace(/\n$/, '')) + '</code></pre></div>';
}

function css() {
  return `
    :root { --bg:#f7fafc; --panel:#fff; --panel2:#eef3f8; --text:#0f172a; --muted:#526072; --line:#dbe4ee; --accent:#0284c7; --accent2:#0ea5e9; --code:#f6f8fb; --radius:14px; }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { margin:0; color:var(--text); font-family:"Segoe UI","Microsoft YaHei",system-ui,sans-serif; line-height:1.75; background:radial-gradient(circle at 10% 0%, rgba(56,189,248,.14), transparent 28rem),radial-gradient(circle at 90% 12%, rgba(167,139,250,.12), transparent 30rem),linear-gradient(135deg,#f8fbff 0%,#eef4fb 50%,#f8fafc 100%); background-attachment:fixed; }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .wrap { max-width:1000px; margin:0 auto; padding:1.6rem 1.2rem 4rem; }
    .top { display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-bottom:1.4rem; }
    .back, .pager a { border:1px solid var(--line); background:var(--panel); border-radius:999px; padding:.4rem .8rem; font-size:.88rem; }
    main { background:rgba(255,255,255,.72); border:1px solid var(--line); border-radius:var(--radius); padding:2rem; box-shadow:0 18px 50px rgba(15,23,42,.06); }
    h1 { margin:0 0 .35rem; font-size:clamp(2rem,5vw,3rem); line-height:1.15; letter-spacing:-.02em; }
    .subtitle { color:var(--accent); margin:0 0 .4rem; }
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
    .verify, .notes { background:#f8fafc; border:1px solid var(--line); border-radius:var(--radius); padding:1rem 1.2rem; margin-top:1.2rem; }
    footer { color:var(--muted); font-size:.85rem; margin-top:1.4rem; text-align:center; }
    @media (max-width:640px) { main { padding:1.2rem; } .top { align-items:flex-start; } }
  `;
}

function js() {
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

function buildSteps(slug) {
  return [
    '打开 PowerShell，进入总目录：<pre><code>cd D:\\hf\\L\\electron</code></pre>',
    '创建独立项目目录并进入：<pre><code>New-Item -ItemType Directory -Path apps\\' + slug + ' -Force\ncd apps\\' + slug + '</code></pre>',
    '初始化 npm 项目：<pre><code>npm init -y</code></pre>',
    '设置主入口和启动脚本：<pre><code>npm pkg set main="main.js"\nnpm pkg set scripts.start="electron ."</code></pre>',
    '安装 Electron，国内网络可先设置镜像：<pre><code>$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"\nnpm install --save-dev electron</code></pre>',
    '按照下面“代码文件”一节创建对应文件。文件名必须一致。',
    '回到 PowerShell 运行：<pre><code>npm start</code></pre>'
  ];
}

function buildPage(example, index, total) {
  const prev = index > 0 ? EXAMPLES[index - 1] : null;
  const next = index < total - 1 ? EXAMPLES[index + 1] : null;
  const pager = [];
  if (prev) pager.push('<a href="' + prev.slug + '.html">← ' + escapeHtml(prev.title.split(' ')[0]) + '</a>');
  pager.push('<a href="index.html">目录</a>');
  if (next) pager.push('<a href="' + next.slug + '.html">' + escapeHtml(next.title.split(' ')[0]) + ' →</a>');

  const filesHtml = example.files.map(function (file) {
    return '<h3>' + escapeHtml(file.name) + '</h3><p>' + escapeHtml(file.note) + '</p>' + codeBox(file.name, file.code);
  }).join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(example.title)} - Electron 原创示例教程</title>
  <style>${css()}</style>
</head>
<body>
  <div class="wrap">
    <header class="top">
      <a class="back" href="index.html">← 全部示例</a>
      <nav class="pager">${pager.join('')}</nav>
    </header>
    <main>
      <p class="subtitle">${escapeHtml(example.subtitle)}</p>
      <h1>${escapeHtml(example.title)}</h1>
      <p class="meta">第 ${index + 1} / ${total} 个原创示例</p>

      <section>
        <h2>这个例子做什么</h2>
        <p>${escapeHtml(example.intro)}</p>
      </section>

      <section>
        <h2>操作步骤</h2>
        <div class="steps"><ol>
          ${buildSteps(example.slug).map(function (s) { return '<li>' + s + '</li>'; }).join('')}
        </ol></div>
      </section>

      <section>
        <h2>代码文件</h2>
        ${filesHtml}
      </section>

      <section>
        <h2>运行后应该看到什么</h2>
        <div class="verify">${escapeHtml(example.verify)}</div>
      </section>

      <section>
        <h2>补充说明</h2>
        <div class="notes">${escapeHtml(example.notes)}</div>
      </section>
    </main>
    <footer>Electron 原创示例教程 · 代码由 Codex 编写生成</footer>
  </div>
  <script>${js()}</script>
</body>
</html>`;
}

function buildIndex() {
  const cards = EXAMPLES.map(function (example, index) {
    return '<a class="card" href="' + example.slug + '.html"><span class="num">' + String(index + 1).padStart(2, '0') + '</span><strong>' + escapeHtml(example.title) + '</strong><span>' + escapeHtml(example.subtitle) + '</span></a>';
  }).join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Electron 原创示例教程合集</title>
  <style>${css()}
    .hero { text-align:center; padding:2.5rem 0 1rem; }
    .hero h1 { margin-bottom:.6rem; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:1rem; margin-top:2rem; }
    .card { display:flex; flex-direction:column; gap:.35rem; border:1px solid var(--line); background:#fff; border-radius:var(--radius); padding:1rem 1.1rem; color:var(--text); transition:.18s ease; }
    .card:hover { transform:translateY(-2px); border-color:var(--accent); text-decoration:none; box-shadow:0 12px 30px rgba(2,132,199,.08); }
    .num { color:var(--accent); font-size:.8rem; letter-spacing:.08em; }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <h1>Electron 原创示例教程合集</h1>
      <p class="meta">共 ${EXAMPLES.length} 个原创示例，代码由 Codex 重新编写，不照搬官方文档。</p>
    </header>
    <main style="background:transparent;border:0;box-shadow:none;padding:0;">
      <div class="grid">${cards}</div>
    </main>
    <footer>点击任意示例开始学习 · 建议按顺序进行</footer>
  </div>
</body>
</html>`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  EXAMPLES.forEach(function (example, index) {
    const page = buildPage(example, index, EXAMPLES.length);
    fs.writeFileSync(path.join(OUT_DIR, example.slug + '.html'), page, 'utf8');
  });
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), buildIndex(), 'utf8');
  console.log('DONE', EXAMPLES.length, 'original tutorials in', OUT_DIR);
}

main();
