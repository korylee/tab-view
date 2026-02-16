import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI, IpcRendererEvent } from '@electron-toolkit/preload'

const api = {
  tab: {
    getAll: () => ipcRenderer.invoke('tab:getAll'),
    switch: (id: string) => ipcRenderer.invoke('tab:switch', id),
    close: (id: string) => ipcRenderer.invoke('tab:close', id),
    navigate: (id: string, url: string) =>
      ipcRenderer.invoke('tab:navigate', id, url),
    back: (id: string) => ipcRenderer.invoke('tab:back', id),
    forward: (id: string) => ipcRenderer.invoke('tab:forward', id),
    reload: (id: string) => ipcRenderer.invoke('tab:reload', id)
  },
  download: {
    getAll: () => ipcRenderer.invoke('download:getAll'),
    open: (id: string) => ipcRenderer.invoke('download:open', id),
    show: (id: string) => ipcRenderer.invoke('download:show', id),
    hide: () => ipcRenderer.invoke('download:hide'),
    remove: (id: string) => ipcRenderer.invoke('download:remove', id),
    clear: () => ipcRenderer.invoke('download:clearCompleted'),
    cancel: (id: string) => ipcRenderer.invoke('download:cancel', id),
    togglePanel: () => ipcRenderer.invoke('download:togglePanel')
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    const fn = (_: IpcRendererEvent, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, fn)
    return () => ipcRenderer.removeListener(channel, fn)
  }
} as const

export type GlobalApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronApi', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
}
