import {
  app,
  BrowserWindow,
  dialog,
  DownloadItem as ElectronDownloadItem,
  ipcMain,
  Session,
  shell
} from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'

export interface DownloadStatus {
  id: string
  filename: string
  path: string
  totalBytes: number
  receivedBytes: number
  state: 'progressing' | 'completed' | 'failed' | 'cancelled' | 'pending'
  startTime: number
  endTime?: number
  speed?: number
  progress?: number
  percent?: number
}

// 内部状态接口，增加缓存字段
interface InternalDownloadItem extends DownloadStatus {
  item?: ElectronDownloadItem
  tempPath: string
  isDone: boolean
}

export class DownloadManager {
  private panelWindow: BrowserWindow | null = null
  private downloads: Map<string, InternalDownloadItem> = new Map()

  constructor(private mainWindow: BrowserWindow) {
    this.setupHandler(mainWindow.webContents.session)
    this.setupIPC()
  }

  private setupHandler(session: Session): void {
    session.on('will-download', (_, item) => {
      // 1. 同步设置临时路径，确保下载立即静默开始
      const id = `dl-${Date.now().toString(32)}`
      const filename = item.getFilename()
      const tempPath = path.join(app.getPath('temp'), `${id}-${filename}`)

      // 不调用 event.preventDefault()，通过 setSavePath 抑制默认弹窗
      item.setSavePath(tempPath)

      // 2. 预先创建状态对象，用于暂存后台下载进度
      // 此时还未添加到 this.downloads，对用户不可见
      const pendingDownload: InternalDownloadItem = {
        id,
        filename,
        path: tempPath, // 暂存临时路径
        tempPath,
        totalBytes: item.getTotalBytes(),
        receivedBytes: 0,
        state: 'progressing',
        startTime: Date.now(),
        isDone: false,
        speed: 0,
        progress: 0,
        percent: 0
      }

      // 3. 先绑定事件，实时更新 pendingDownload 对象
      // 这样即使用户选路径慢了，进度数据也不会丢
      this.handleDownloadEvents(item, pendingDownload)

      // 4. 异步询问用户保存位置
      this.handleUserDialog(item, pendingDownload, filename)
    })
  }

  /**
   * 处理用户交互：选择路径 -> 决定是否展示面板
   */
  private async handleUserDialog(
    item: ElectronDownloadItem,
    download: InternalDownloadItem,
    filename: string
  ): Promise<void> {
    try {
      const { filePath, canceled } = await dialog.showSaveDialog(
        this.mainWindow,
        {
          defaultPath: filename
        }
      )

      // Case 1: 用户取消
      if (canceled || !filePath) {
        item.cancel()
        // 如果下载瞬间完成且用户取消，需要清理临时文件
        if (download.isDone) {
          this.cleanTempFile(download.tempPath)
        }
        return
      }

      // Case 2: 用户确认保存
      download.path = filePath // 更新为目标路径

      // 将下载项加入管理列表
      this.downloads.set(download.id, download)

      // *** 只有用户确认保存后，才展示面板 ***
      this.showPanel()

      // 发送初始通知，让UI显示当前状态（可能已经下载了一部分）
      this.notify('download:added', this.formatStatus(download))

      // 如果在用户选择路径期间，文件已经下载完了
      if (download.isDone) {
        await this.finalizeDownload(download)
      }
    } catch (error) {
      console.error('Dialog error:', error)
      item.cancel()
    }
  }

  /**
   * 监听下载过程，直接更新传入的 download 对象
   */
  private handleDownloadEvents(
    item: ElectronDownloadItem,
    download: InternalDownloadItem
  ): void {
    let lastReceived = 0
    let lastTime = Date.now()

    item.on('updated', (_, state) => {
      if (download.isDone) return

      if (state === 'progressing') {
        const receivedBytes = item.getReceivedBytes()
        const now = Date.now()
        const timeDiff = (now - lastTime) / 1000
        const bytesDiff = receivedBytes - lastReceived
        const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0

        lastReceived = receivedBytes
        lastTime = now

        // 更新内部状态
        download.receivedBytes = receivedBytes
        download.speed = speed
        download.progress =
          download.totalBytes > 0 ? receivedBytes / download.totalBytes : 0
        download.percent = Math.round(download.progress * 100)

        // 只有当该项已被用户确认（存在于 Map 中）时，才通知 UI 更新
        if (this.downloads.has(download.id)) {
          this.notify('download:updated', {
            id: download.id,
            receivedBytes,
            totalBytes: download.totalBytes,
            speed,
            progress: download.progress,
            percent: download.percent,
            state: 'progressing'
          })
        }
      }
    })

    item.once('done', async (_, state) => {
      download.isDone = true
      download.item = undefined

      if (state === 'cancelled') {
        // 如果在 Map 中，通知 UI 移除；如果不在，静默处理
        if (this.downloads.has(download.id)) {
          this.updateDownloadState(download.id, 'cancelled')
          this.cleanTempFile(download.tempPath)
        }
        return
      }

      if (state === 'interrupted') {
        if (this.downloads.has(download.id)) {
          this.updateDownloadState(download.id, 'failed')
        }
        return
      }

      // 下载完成
      // 如果用户已经选好路径，执行移动；否则等待 handleUserDialog 处理
      if (
        this.downloads.has(download.id) &&
        download.path !== download.tempPath
      ) {
        await this.finalizeDownload(download)
      }
    })
  }

  /**
   * 完成下载：移动文件
   */
  private async finalizeDownload(
    download: InternalDownloadItem
  ): Promise<void> {
    try {
      await this.moveFile(download.tempPath, download.path)
      this.updateDownloadState(download.id, 'completed')
    } catch (err) {
      console.error('Move file failed:', err)
      this.updateDownloadState(download.id, 'failed')
      this.cleanTempFile(download.tempPath)
    }
  }

  // --- 工具方法 ---

  private updateDownloadState(
    id: string,
    state: DownloadStatus['state']
  ): void {
    const dl = this.downloads.get(id)
    if (!dl) return
    dl.state = state
    dl.endTime = Date.now()
    this.notify('download:completed', { id, state, path: dl.path })
  }

  private formatStatus(d: InternalDownloadItem): DownloadStatus {
    return {
      id: d.id,
      filename: d.filename,
      path: d.path,
      totalBytes: d.totalBytes,
      receivedBytes: d.receivedBytes,
      state: d.state,
      startTime: d.startTime,
      endTime: d.endTime,
      speed: d.speed || 0,
      progress: d.progress || 0,
      percent: d.percent || 0
    }
  }

  private async moveFile(src: string, dest: string): Promise<void> {
    try {
      await fs.rename(src, dest)
    } catch (err: any) {
      // 在其他盘符rename会失败
      if (err.code === 'EXDEV') {
        await fs.copyFile(src, dest)
        await fs.unlink(src)
      } else {
        throw err
      }
    }
  }

  private async cleanTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch (e) {
      /* ignore */
    }
  }

  // --- IPC & UI 管理 ---
  private setupIPC(): void {
    ipcMain.handle('download:getAll', () => this.getAll())
    ipcMain.handle('download:open', (_, id) => this.open(id))
    ipcMain.handle('download:show', (_, id) => this.showInFolder(id))
    ipcMain.handle('download:remove', (_, id) => {
      this.remove(id)
      this.notify('download:removed', id)
    })
    ipcMain.handle('download:clear', () => {
      this.clearCompleted()
      this.notify('download:cleared', this.getCompletedIds())
    })
    ipcMain.handle('download:hide', () => this.hidePanel())
    ipcMain.handle('download:togglePanel', () => this.togglePanel())
  }

  private getCompletedIds(): string[] {
    const ids: string[] = []
    this.downloads.forEach((dl, id) => {
      if (dl.state !== 'progressing') ids.push(id)
    })
    return ids
  }

  createPanel(): void {
    if (this.panelWindow) return
    const mainBounds = this.mainWindow.getBounds()

    this.panelWindow = new BrowserWindow({
      width: 360,
      height: 480,
      x: mainBounds.x + mainBounds.width - 380,
      y: mainBounds.y + 50,
      parent: this.mainWindow,
      modal: false,
      show: false, // 初始隐藏
      frame: false,
      resizable: true,
      webPreferences: {
        preload: path.join(__dirname, './preload.js'),
        contextIsolation: true
      }
    })

    const serveUrl = process.env['VITE_DEV_SERVER_URL']
    if (serveUrl) {
      this.panelWindow.loadURL(serveUrl + 'downloads')
      this.panelWindow.webContents.openDevTools()
    } else {
      this.panelWindow.loadFile(
        path.join(process.env.VITE_DIST, 'renderer/downloads/index.html')
      )
    }

    this.panelWindow.on('blur', () => {
      // 1. 确保窗口没有被销毁
      // 2. 确保窗口是可见的（避免重复操作）
      // 3. (可选) 如果正在开发调试，DevTools 获得焦点也会触发 blur，可以加个判断
      if (
        this.panelWindow &&
        !this.panelWindow.isDestroyed() &&
        this.panelWindow.isVisible()
      ) {
        // 如果你有开启 DevTools 调试，不想让 DevTools 抢焦点导致面板关闭，取消下面注释
        // if (this.panelWindow.webContents.isDevToolsFocused()) return

        this.hidePanel()
      }
    })

    this.panelWindow.on('closed', () => {
      this.panelWindow = null
    })

    // *** 关键优化：移除 blur 自动关闭逻辑 ***
    // 这种体验通常更好：下载面板保持打开，用户可以随时查看，直到手动关闭。
    // 如果需要点击外部关闭，应该由前端通过监听 blur 发送 IPC 'download:hide' 来控制，
    // 或者使用 closure hiding 逻辑，而不是 destroy。

    // 窗口跟随主窗口移动
    const updatePosition = () => {
      if (!this.panelWindow || this.panelWindow.isDestroyed()) return
      const bounds = this.mainWindow.getBounds()
      this.panelWindow.setPosition(bounds.x + bounds.width - 380, bounds.y + 50)
    }

    this.mainWindow.on('move', updatePosition)
    this.mainWindow.on('resize', updatePosition)
  }

  showPanel(): void {
    if (!this.panelWindow) this.createPanel()
    // 确保窗口存在且未销毁
    if (this.panelWindow && !this.panelWindow.isDestroyed()) {
      this.panelWindow.show()
    }
  }

  hidePanel(): void {
    this.panelWindow?.hide()
  }

  togglePanel(): void {
    if (this.panelWindow?.isVisible()) {
      this.hidePanel()
    } else {
      this.showPanel()
    }
  }

  destroyPanel(): void {
    if (this.panelWindow && !this.panelWindow.isDestroyed()) {
      this.panelWindow.destroy()
    }
    this.panelWindow = null
  }

  getAll() {
    return Array.from(this.downloads.values()).map(this.formatStatus)
  }

  open(id: string): void {
    const dl = this.downloads.get(id)
    if (dl && dl.state === 'completed') shell.openPath(dl.path)
  }

  showInFolder(id: string): void {
    const dl = this.downloads.get(id)
    if (dl) shell.showItemInFolder(dl.path)
  }

  remove(id: string): void {
    const dl = this.downloads.get(id)
    if (dl?.item && !dl.isDone) {
      dl.item.cancel()
    }
    this.downloads.delete(id)
  }

  clearCompleted(): void {
    this.downloads.forEach((dl, id) => {
      if (dl.state !== 'progressing') {
        this.downloads.delete(id)
      }
    })
  }

  private notify(channel: string, data: unknown): void {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
      if (/^download:(.+)$/.test(channel)) {
        this.mainWindow.webContents.send('download:changed')
      }
    }
    // 只有当 panel 存在且未被销毁时才发送消息
    if (this.panelWindow && !this.panelWindow.isDestroyed()) {
      this.panelWindow.webContents.send(channel, data)
    }
  }
}
