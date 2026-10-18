import { db, tg } from '@/lib/server'
export async function POST(req: Request) {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== process.env.WEBHOOK_SECRET) return new Response('no', { status: 401 })
  const u = await req.json()
  const m = u.message
  if (m?.text?.startsWith('/start')) {
    await tg('sendMessage', { chat_id: m.chat.id, text: 'Welcome! First, share your phone number so we can verify you.',
      reply_markup: { keyboard: [[{ text: '📱 Share my number', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true } })
    await tg('sendMessage', { chat_id: m.chat.id, text: 'Then open the app:', reply_markup: { inline_keyboard: [[{ text: 'Open app', web_app: { url: process.env.APP_URL } }]] } })
  }
  if (m?.contact && m.contact.user_id === m.from.id) {
    await db.from('profiles').upsert({ telegram_id: m.from.id, phone_number: m.contact.phone_number, full_name: m.from.first_name }, { onConflict: 'telegram_id' })
    await tg('sendMessage', { chat_id: m.chat.id, text: 'Number saved ✅ Open the app to pick your trainer.', reply_markup: { remove_keyboard: true } })
  }
  const c = u.callback_query
  if (c && String(c.from.id) === process.env.ADMIN_ID) {
    const [act, id] = c.data.split(':')
    const edit = (t: string) => tg('editMessageText', { chat_id: c.message.chat.id, message_id: c.message.message_id, text: c.message.text + t })
    if (act === 'ok' || act === 'no') {
      const { data: p } = await db.from('payments').update({ status: act === 'ok' ? 'approved' : 'rejected' }).eq('id', id).eq('status', 'pending').select().single()
      if (p && act === 'ok') await db.from('profiles').update({ is_approved: true, trial_creator_id: p.creator_id, trial_ends_at: new Date(Date.now() + 30 * 864e5).toISOString() }).eq('telegram_id', p.user_telegram_id)
      if (p) await tg('sendMessage', { chat_id: p.user_telegram_id, text: act === 'ok' ? '✅ Approved! Your 30-day trial has started.' : '❌ Payment not verified. Check your TxnID and try again.' })
      await edit(act === 'ok' ? '\n\n✅ APPROVED' : '\n\n❌ REJECTED')
    }
    if (act === 'wd') { await db.from('withdrawals').update({ status: 'paid' }).eq('id', id); await edit('\n\n✅ PAID') }
  }
  if (c) await tg('answerCallbackQuery', { callback_query_id: c.id })
  return Response.json({ ok: true })
}
