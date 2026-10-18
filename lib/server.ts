import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
export const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
export function verify(initData: string) {
  const p = new URLSearchParams(initData); const hash = p.get('hash'); p.delete('hash')
  const s = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n')
  const key = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN!).digest()
  if (crypto.createHmac('sha256', key).update(s).digest('hex') !== hash) return null
  if (Date.now() / 1000 - Number(p.get('auth_date')) > 86400) return null
  return JSON.parse(p.get('user')!) as { id: number; first_name: string }
}
export const tg = (method: string, body: any) =>
  fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())
export const admin = (text: string, extra: any = {}, topic?: string) =>
  tg('sendMessage', { chat_id: process.env.ADMIN_CHAT_ID, text, ...(topic ? { message_thread_id: Number(topic) } : {}), ...extra })
