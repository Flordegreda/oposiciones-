/// <reference types="vite/client" />

interface IpcOk<T> {
  ok: true
  data: T
}
interface IpcErr {
  ok: false
  error: string
}

interface Window {
  api: {
    invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<IpcOk<T> | IpcErr>
  }
}
