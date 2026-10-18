'use client'
import { useEffect, useState } from 'react'
const api = async (action: string, data: any = {}) => {
  const r = await fetch('/api/act', { method: 'POST', headers: { 'content-type': 'application/json', 'x-init-data': (window as any).Telegram?.WebApp?.initData || '' }, body: JSON.stringify({ action, ...data }) })
  return await r.json()
}
const DISC = ['Strength', 'Cardio', 'Recovery']
const Btn = (p: any) => <button {...p} className={'w-full rounded-xl bg-red hover:bg-red-hover active:bg-red-hover py-3 font-black uppercase text-white disabled:opacity-40 ' + (p.className || '')} />
const Inp = (p: any) => <input {...p} className="w-full rounded-xl border border-line bg-white p-3 mb-2" />

export default function App() {
  const [s, setS] = useState<any>(null); const [tab, setTab] = useState('home'); const [play, setPlay] = useState<any>(null); const [err, setErr] = useState('')
  const load = async () => { (window as any).Telegram?.WebApp?.ready(); const r = await api('me'); r.error ? setErr(r.error) : setS(r) }
  useEffect(() => { load() }, [])
  if (err) return <p className="p-6 text-red">{err}</p>
  if (!s) return <p className="p-6 text-mid">Loading…</p>
  if (play) return <Workout v={play} done={() => setPlay(null)} />
  return <div className="mx-auto max-w-md pb-24">
    {tab === 'home' && (s.active ? <Feed onPlay={setPlay} /> : <Apply s={s} reload={load} />)}
    {tab === 'creator' && s.isCreator && <Creator />}
    {s.isCreator && <nav className="fixed bottom-0 inset-x-0 mx-auto flex max-w-md bg-ink text-white">
      {['home', 'creator'].map(t => <button key={t} onClick={() => setTab(t)} className={'flex-1 p-4 font-bold ' + (tab === t ? 'text-red' : '')}>{t === 'home' ? 'Workouts' : 'My dashboard'}</button>)}</nav>}
  </div>
}

function Apply({ s, reload }: any) {
  const [cid, setCid] = useState(''); const [txn, setTxn] = useState(''); const [msg, setMsg] = useState(''); const [sent, setSent] = useState(false)
  const go = async () => { const r = await api('apply', { creator_id: cid, txn }); r.error ? setMsg(r.error) : setSent(true) }
  if (!s.me?.phone_number) return <div className="p-6"><h1 className="text-2xl font-black">One step first</h1><p className="mt-2 text-mid">Open the bot chat, send /start, and tap “Share my number”. Then come back here.</p><button onClick={reload} className="mt-4 font-bold text-red">I’ve done it</button></div>
  if (sent) return <div className="p-6"><h1 className="text-2xl font-black">Request sent</h1><p className="mt-2 text-mid">We’re checking your payment. You’ll get a Telegram message when your 30-day trial starts.</p><button onClick={reload} className="mt-4 font-bold text-red">Check again</button></div>
  return <div className="p-6"><h1 className="text-2xl font-black">Start your 30-day trial</h1>
    <p className="my-2 text-mid">Pick your trainer, send {s.price} BDT by bKash, and paste the TxnID.</p>
    <select value={cid} onChange={e => setCid(e.target.value)} className="mb-2 w-full rounded-xl border border-line bg-white p-3"><option value="">Choose your trainer</option>{s.creators.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
    <Inp placeholder="bKash TxnID" value={txn} onChange={(e: any) => setTxn(e.target.value)} />
    {msg && <p className="mb-2 text-red">{msg}</p>}
    <Btn disabled={!cid || !txn} onClick={go}>Submit payment</Btn></div>
}

function Feed({ onPlay }: any) {
  const [f, setF] = useState<any>(null); const [d, setD] = useState('All'); const [saved, setSaved] = useState<string[]>([])
  useEffect(() => { api('feed').then(setF); try { setSaved(JSON.parse(localStorage.getItem('saved') || '[]')) } catch {} }, [])
  const mark = (id: string) => { const n = saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id]; setSaved(n); try { localStorage.setItem('saved', JSON.stringify(n)) } catch {} }
  if (!f) return <p className="p-6 text-mid">Loading…</p>
  const list = (f.videos || []).filter((v: any) => d === 'All' || v.discipline === d)
  const mine = list.filter((v: any) => v.creator_id === f.myCreator)
  const Row = ({ title, items }: any) => items.length > 0 && <section className="mt-5"><h2 className="px-4 font-black">{title}</h2>
    <div className="flex gap-3 overflow-x-auto px-4 py-2">{items.map((v: any) => <div key={v.id} className="w-64 shrink-0 overflow-hidden rounded-xl border border-line bg-white">
      <div className="relative" onClick={() => onPlay(v)}><img src={`https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`} alt="" className="aspect-video w-full object-cover" />
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{v.duration_minutes} min • {v.discipline}</span></div>
      <div className="flex items-center justify-between bg-[#F3F4F6] p-3"><div><p className="font-bold leading-tight">{v.title}</p><p className="text-sm text-mid">{v.creators?.name}</p></div>
        <button onClick={() => mark(v.id)} className="text-xl">{saved.includes(v.id) ? '🔖' : '🏷️'}</button></div></div>)}</div></section>
  return <div><h1 className="p-4 text-2xl font-black">Workouts</h1>
    <div className="flex gap-2 overflow-x-auto px-4">{['All', ...DISC].map(x => <button key={x} onClick={() => setD(x)} className={'rounded-full px-4 py-2 font-bold ' + (d === x ? 'bg-ink text-white' : 'border border-line bg-white')}>{x}</button>)}</div>
    <Row title="My trainer’s routines" items={mine} /><Row title="Newest across all trainers" items={list} />
    {list.length === 0 && <p className="p-6 text-mid">No workouts yet. Your trainers are uploading soon.</p>}
    <div className="m-4 rounded-xl bg-ink p-5 text-white"><p className="font-bold">Your trainer’s private community</p><p className="mb-3 text-sm text-lite">Ask questions and train with others.</p>
      <a href={f.community || '#'}><Btn>Join private Telegram community</Btn></a></div>
    <div className="m-4 rounded-xl bg-ink p-5 text-white"><p className="font-bold">Winter dress: coming in v2</p><p className="mb-3 text-sm text-lite">We’re designing it now.</p><Btn disabled>Buy now via bKash</Btn></div></div>
}

function Workout({ v, done }: any) {
  const [sec, setSec] = useState(0); const [reps, setReps] = useState(0); const [run, setRun] = useState(true); const [b, setB] = useState<any>({ count: 0, top: [] })
  const total = v.duration_minutes * 60
  useEffect(() => { api('board', { video_id: v.id }).then(r => r.top && setB(r)) }, [])
  useEffect(() => { if (!run) return; const t = setInterval(() => setSec(x => x + 1), 1000); return () => clearInterval(t) }, [run])
  const fmt = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
  const finish = async () => { await api('finish', { video_id: v.id, reps, seconds: sec }); done() }
  return <div className="mx-auto flex h-screen max-w-md flex-col bg-bg">
    <div className="h-1 bg-line"><div className="h-1 bg-red" style={{ width: Math.min(100, sec / total * 100) + '%' }} /></div>
    <iframe className="h-[40%] w-full" src={`https://www.youtube-nocookie.com/embed/${v.youtube_id}?rel=0&playsinline=1`} allow="autoplay; fullscreen" allowFullScreen />
    <div className="flex-1 space-y-3 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4"><p className="text-sm text-mid">Time</p><p className="text-3xl font-black">{fmt(sec)}</p></div>
        <button onClick={() => setReps(r => r + 1)} className="rounded-xl bg-red p-4 text-left text-white active:bg-red-hover"><p className="text-sm">Tap to count</p><p className="text-3xl font-black">{reps} reps</p></button></div>
      <div className="rounded-xl bg-ink p-4 text-white"><p className="text-sm text-lite">{b.count > 0 ? `${b.count} ${b.count === 1 ? 'person' : 'people'} completed this today` : 'Be part of the Adventure'}</p>
        {b.top.map((t: any, i: number) => <p key={i} className="font-bold">{i + 1}. {t.you ? 'You' : t.name} ({t.reps})</p>)}</div>
      <div className="flex gap-3"><button onClick={() => setRun(!run)} className="flex-1 rounded-xl border border-line bg-white py-3 font-bold">{run ? 'Pause' : 'Resume'}</button><Btn onClick={finish} className="flex-1">Finish workout</Btn></div>
      <button onClick={done} className="w-full text-sm text-mid">Leave without saving</button></div></div>
}

function Creator() {
  const [l, setL] = useState<any>(null); const [f, setF] = useState<any>({ discipline: 'Strength' }); const [m, setM] = useState('')
  const load = () => api('ledger').then(setL); useEffect(() => { load() }, [])
  const add = async () => { const r = await api('addVideo', f); setM(r.error || 'Published. It’s live in the feed.'); if (!r.error) setF({ discipline: 'Strength' }) }
  const wd = async () => { const r = await api('withdraw'); setM(r.error || 'Cash-out requested.'); load() }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  return <div className="p-4"><h1 className="text-2xl font-black">My dashboard</h1>
    {l && <div className="my-3 rounded-xl border border-line bg-white p-4"><p>Gross revenue: <b>{l.gross} BDT</b> ({l.members} members)</p><p>Platform share (5%): <b>-{l.cut} BDT</b></p><p className="text-xl">Balance: <b>{l.net} BDT</b></p>
      <Btn className="mt-3" onClick={wd}>Cash out ({l.fee} BDT fee)</Btn></div>}
    <h2 className="mt-5 font-black">Add a workout</h2>
    <Inp placeholder="Paste YouTube link" value={f.url || ''} onChange={set('url')} /><Inp placeholder="Title" value={f.title || ''} onChange={set('title')} />
    <Inp placeholder="Minutes" type="number" value={f.minutes || ''} onChange={set('minutes')} />
    <select value={f.discipline} onChange={set('discipline')} className="mb-2 w-full rounded-xl border border-line bg-white p-3">{DISC.map(d => <option key={d}>{d}</option>)}</select>
    {m && <p className="mb-2 text-mid">{m}</p>}<Btn onClick={add}>Publish workout</Btn></div>
}
