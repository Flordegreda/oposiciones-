export async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const res = await window.api.invoke<T>(channel, ...args)
  if (!res.ok) throw new Error(res.error)
  return res.data
}
