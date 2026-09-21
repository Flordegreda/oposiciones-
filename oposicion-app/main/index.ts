import { app, BrowserWindow, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { registerIpc } from './ipc'
import { getConfig, openDb } from './db'
import { rootExists } from './fs-ops'
import { syncMaterial } from './sync'

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

const isDev = !app.isPackaged

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Control de oposición',
    backgroundColor: '#f1f5f9',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const distHtml = path.join(__dirname, '../../dist/index.html')
  if (process.env.VITE_DEV_SERVER_URL) {
    void win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else if (fs.existsSync(distHtml)) {
    void win.loadFile(distHtml)
  } else if (isDev) {
    void win.loadURL('http://localhost:5173')
  } else {
    void win.loadFile(distHtml)
  }
}

app.whenReady().then(() => {
  try {
    openDb()
    const cfg = getConfig()
    if (cfg.root_path && rootExists(cfg.root_path)) {
      syncMaterial()
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    dialog.showErrorBox('Error al iniciar', msg)
  }
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
