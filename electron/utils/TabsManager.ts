import { BrowserView, BrowserWindow, ipcMain, Session, webContents, WebContents } from 'electron'
import { PRELOAD_PATH } from './constant'
import path from 'node:path'
import fs from 'node:fs'

const configPath = path.join(__dirname, '../config.json')

const config = (function () {
  try {
    const configData = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(configData)
  } catch (e) {
    console.error('Error reading config file', e)
    return {}
  }
})()

console.log('config-data', configPath, config)

interface TabInfo {
  id: string
  view: BrowserView
  url: string
  title: string
  canGoBack: boolean
  canGoForward: boolean
  isLoading: boolean
}

export class TabsManager {
  private tabs: Map<string, TabInfo> = new Map()
  private activeTabId: string | null = null
  private readonly session: Session
  private readonly tabBarHeight = 40

  constructor(private readonly mainWindow: BrowserWindow) {
    this.session = mainWindow.webContents.session

    this.setupIPC()

    // 监听窗口大小变化
    mainWindow.on('resize', () => this.resize())
    mainWindow.on('maximize', () => this.resize())
    mainWindow.on('unmaximize', () => this.resize())

    const urls: string[] = config?.initialTabs ?? []
    urls.forEach((url, i) => {
      const id = this.createTab(url)
      i === 0 && this.switchTab(id)
    })
  }

  get activeTab() {
    return this.tabs.get(this.activeTabId || '')
  }

  createTab(url: string): string {
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        // sandbox: true,
        preload: PRELOAD_PATH,
        // 同域存储共享
        session: this.session,
        partition: 'persist:main'
      }
    })
    // id 全局唯一
    const id = `${view.webContents.id}`

    const tab: TabInfo = {
      id,
      view,
      url,
      title: 'Loading',
      canGoBack: false,
      canGoForward: false,
      isLoading: true
    }

    this.tabs.set(id, tab)
    this.setupEvents(id, view)

    view.webContents.loadURL(url)

    // 如果是第一个标签页，立即显示
    if (this.tabs.size === 1) {
      this.switchTab(id)
    }

    this.notify('tab:created', this.serialize(tab))
    return id
  }

  private setupIPC(): void {
    ipcMain.handle('tab:getAll', (_) => this.getAll())
    ipcMain.handle('tab:switch', (_, id) => this.switchTab(id))
    ipcMain.handle('tab:close', (_, id) => this.closeTab(id))
    ipcMain.handle('tab:navigate', (_, id, url) => this.navigate(id, url))
    ipcMain.handle('tab:back', (_, id) => this.goBack(id))
    ipcMain.handle('tab:forward', (_, id) => this.goForward(id))
    ipcMain.handle('tab:reload', (_, id) => this.reload(id))
    ipcMain.handle('tab:reorder', (_, ids) => this.reorderTabs(ids))
  }

  private setupEvents(id: string, view: BrowserView): void {
    const web = view.webContents

    web.on('page-title-updated', (_, title) => {
      this.updateTab(id, { title })
    })

    web.on('did-navigate', (_, url) => {
      this.updateTab(id, {
        url,
        canGoBack: web.canGoBack(),
        canGoForward: web.canGoForward()
      })
    })

    web.on('did-start-loading', () => this.updateTab(id, { isLoading: true }))
    web.on('did-stop-loading', () =>
      this.updateTab(id, {
        isLoading: false,
        canGoBack: web.canGoBack(),
        canGoForward: web.canGoForward()
      })
    )

    // 页面加载完成后再调整大小（确保内容正确渲染）
    web.on('dom-ready', () => {
      if (this.activeTabId === id) {
        this.resize()
      }
    })

    web.setWindowOpenHandler(({ url }) => {
      const id = this.createTab(url)
      this.switchTab(id)
      return { action: 'deny' }
    })
  }

  switchTab(id: string): void {
    if (this.activeTabId === id) return

    const tab = this.tabs.get(id)
    if (!tab) return

    if (this.activeTab) {
      this.mainWindow.removeBrowserView(this.activeTab.view)
    }

    this.mainWindow.setBrowserView(tab.view)
    this.activeTabId = id

    this.resize()

    // 确保 webContents 聚焦
    tab.view.webContents.focus()

    this.notify('tab:switched', this.serialize(tab))
  }

  closeTab(val: string | WebContents): void {
    const id = typeof val === 'string' ? val : String(val.id)
    const tab =  this.tabs.get(id)
    if (!tab) return

    if (this.activeTabId === id) {
      this.mainWindow.removeBrowserView(tab.view)
    }

    tab.view.webContents.close()
    this.tabs.delete(id)

    if (this.activeTabId === id) {
      this.activeTabId = null
      const remaining = Array.from(this.tabs.keys())
      if (remaining.length) this.switchTab(remaining[0])
    }

    this.notify('tab:closed', id)
  }

  navigate(id: string, url: string): void {
    this.tabs.get(id)?.view.webContents.loadURL(url)
  }

  goBack(id: string): void {
    this.tabs.get(id)?.view.webContents.goBack()
  }

  goForward(id: string): void {
    this.tabs.get(id)?.view.webContents.goForward()
  }

  reload(id: string): void {
    this.tabs.get(id)?.view.webContents.reload()
  }

  resize(): void {
    const tab = this.activeTab
    if (!tab) return

    const contentBounds = this.mainWindow.getContentBounds()

    const viewBounds = {
      x: 0,
      y: this.tabBarHeight,
      width: contentBounds.width,
      height: contentBounds.height - this.tabBarHeight
    }

    tab.view.setBounds(viewBounds)

    // 强制重绘
    tab.view.webContents.invalidate()
  }

  private reorderTabs(sortedIds: string[]): void {
    const newMap = new Map<string, TabInfo>()

    sortedIds.forEach((id) => {
      this.tabs.has(id) && newMap.set(id, this.tabs.get(id)!)
    })

    this.tabs.forEach((value, key) => {
      !newMap.has(key) && newMap.set(key, value)
    })

    this.tabs = newMap

    this.notify('tab:reordered', sortedIds)
  }

  getAll() {
    return Array.from(this.tabs.values()).map((t) => this.serialize(t))
  }

  private updateTab(id: string, data: Partial<TabInfo>): void {
    const tab = this.tabs.get(id)
    if (!tab) return
    Object.assign(tab, data)
    this.notify('tab:updated', { id, ...data })
  }

  private serialize(tab: TabInfo) {
    return {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      canGoBack: tab.canGoBack,
      canGoForward: tab.canGoForward,
      isLoading: tab.isLoading
    }
  }

  private notify(channel: string, data: unknown): void {
    this.mainWindow.webContents.send(channel, data)
  }
}
