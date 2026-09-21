import { contextBridge, ipcRenderer } from 'electron'

const api = {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
}

contextBridge.exposeInMainWorld('api', api)

export type PreloadApi = typeof api
