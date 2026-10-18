import { db, verify, admin } from '@/lib/server'
const FEE = 100, PRICE = () => Number(process.env.PLAN_PRICE_BDT || 0)
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString() }
const err = (e: string, s = 400) => Response.json({ error: e }, { status: s })
async function balance(cid: string) {
  const { data: pay } = await db.from('payments').select('amount_bdt').eq('creator_id', cid).eq('status', 'approved')
  const { data: wd } = await db.from('withdrawals').select('amount_bdt,fee_bdt').eq('creator_id', cid).neq('status', 'rejected')
  const gross = (pay || []).reduce((s, p) => s + p.amount_bdt, 0), cut = Math.round(gross * 0.05)
  return { gross, cut, members: pay?.length || 0, net: gross - cut - (wd || []).reduce((s, w) => s + w.amount_bdt + w.fee_bdt, 0) }
}
export async function POST(req: Request) {
  const user = verify(req.headers.get('x-init-data') || '')
  if (!user) return err('Open this app from Telegram.', 401)
  const { action, ...a } = await req.json()
  const { data: me } = await db.from('profiles').select('*').eq('telegram_id', user.id).maybeSingle()
  const { data: cr } = await db.from('creators').select('*').eq('telegram_id', user.id).maybeSingle()
  const ok = !!cr || (me?.is_approved && me.trial_ends_at && new Date(me.trial_ends_at) > new Date())
  switch (action) {
    case 'me': {
      const { data: creators } = await db.from('creators').select('id,name')
      return Response.json({ me, isCreator: !!cr, creators, active: !!ok, price: PRICE() })
    }
    case 'apply': {
      if (!me?.phone_number) return err('Share your phone number in the bot chat first.')
      const txn = String(a.txn || '').trim().toUpperCase()
      if (!/^[A-Z0-9]{8,12}$/.test(txn)) return err('TxnID looks wrong. Copy it from your bKash receipt.')
      const { data: c } = await db.from('creators').select('name').eq('id', a.creator_id).single()
      if (!c) return err('Choose a trainer.')
      const { data: p, error } = await db.from('payments').insert({ user_telegram_id: user.id, creator_id: a.creator_id, amount_bdt: PRICE(), bkash_txn_id: txn }).select().single()
      if (error) return err('This TxnID was already used.')
      await admin(`🚨 NEW PAYMENT ACTIVATION REQUEST\n📱 ${me.phone_number}\n🔑 ${txn}\n💰 ${p.amount_bdt} BDT\n🏋 ${c.name}`,
        { reply_markup: { inline_keyboard: [[{ text: '✅ APPROVE', callback_data: `ok:${p.id}` }, { text: '❌ REJECT', callback_data: `no:${p.id}` }]] } }, process.env.TOPIC_TRIALS)
      return Response.json({ ok: true })
    }
  }
  if (!ok && ['feed', 'board', 'finish'].includes(action)) return err('locked', 403)
  switch (action) {
    case 'feed': {
      const { data: videos } = await db.from('videos').select('id,youtube_id,title,discipline,duration_minutes,creator_id,creators(name)').order('created_at', { ascending: false }).limit(60)
      const cid = me?.trial_creator_id
      const link = cid ? (await db.from('creators').select('telegram_community_link').eq('id', cid).single()).data?.telegram_community_link : null
      return Response.json({ videos, myCreator: cid, community: link })
    }
    case 'board': {
      const { data } = await db.from('sessions').select('user_telegram_id,reps,profiles(full_name)').eq('video_id', a.video_id).gte('created_at', today()).order('reps', { ascending: false })
      return Response.json({ count: data?.length || 0, top: (data || []).slice(0, 3).map((s: any) => ({ name: s.profiles?.full_name, reps: s.reps, you: s.user_telegram_id === user.id })) })
    }
    case 'finish':
      await db.from('sessions').insert({ user_telegram_id: user.id, video_id: a.video_id, reps: Math.min(Number(a.reps) || 0, 5000), seconds: Math.min(Number(a.seconds) || 0, 14400) })
      return Response.json({ ok: true })
  }
  if (!cr) return err('Creators only.', 403)
  switch (action) {
    case 'addVideo': {
      const m = String(a.url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)
      if (!m) return err('Paste a valid YouTube link.')
      await db.from('videos').insert({ creator_id: cr.id, youtube_id: m[1], title: String(a.title || 'Workout').slice(0, 80), discipline: a.discipline, duration_minutes: Number(a.minutes) || 10 })
      return Response.json({ ok: true })
    }
    case 'ledger': return Response.json({ ...(await balance(cr.id)), fee: FEE })
    case 'withdraw': {
      const { net } = await balance(cr.id)
      if (net <= FEE) return err(`Balance must be above ${FEE} BDT.`)
      const { data: w } = await db.from('withdrawals').insert({ creator_id: cr.id, amount_bdt: net - FEE, fee_bdt: FEE }).select().single()
      await admin(`💸 CASH-OUT\n🏋 ${cr.name}\nbKash: ${cr.bkash_number}\nSend: ${net - FEE} BDT (after ${FEE} fee)`, { reply_markup: { inline_keyboard: [[{ text: '✅ MARK PAID', callback_data: `wd:${w.id}` }]] } }, process.env.TOPIC_SUPPORT)
      return Response.json({ ok: true })
    }
  }
  return err('Unknown action')
}
