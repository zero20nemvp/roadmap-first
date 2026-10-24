// The v2 workshop coach as a web app: one page, one conversation per founder,
// the Claude API on the server. Free while the daily budget lasts.
//   ANTHROPIC_API_KEY=… ADMIN_KEY=… node server.ts
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import type { Report } from '../web/report.ts'
import { apply, CUT_SCHEMA, CUT_SYSTEM, cutPrompt, emptyWall, fromCut, GREETING, STEP_NAMES, summary, SYSTEM, toReport, TOOLS, type Cut, type Wall } from './coach.ts'

const here = dirname(fileURLToPath(import.meta.url))
const DATA = process.env.DATA_DIR ?? join(here, 'data')
const PORT = Number(process.env.PORT ?? 3000)
const MODEL = 'claude-opus-5-5'
const ADMIN_KEY = process.env.ADMIN_KEY ?? ''
const DAILY_USD = Number(process.env.DAILY_USD ?? 40)
const MAX_TURNS = 80
const MAX_CHARS = 2000
const NEW_PER_HOUR = 6 // per browser
const NEW_PER_HOUR_IP = 60 // per IP: a venue's wifi puts a whole room behind one
// $ per token, Claude Opus 5.5
const PRICE = { input: 4e-6, output: 20e-6, cacheWrite: 5e-6, cacheRead: 0.2e-6 }

for (const d of ['sessions', 'intakes', 'plans', 'usage']) mkdirSync(join(DATA, d), { recursive: true })
const client = new Anthropic()
const page = readFileSync(join(here, 'public', 'index.html'), 'utf8')
// The kiosk kit (~/Code/kiosk-pattern), vendored beside the page
const assets: Record<string, [string, Buffer]> = {
  '/kiosk.js': ['text/javascript; charset=utf-8', readFileSync(join(here, 'public', 'kiosk.js'))],
  '/kiosk.css': ['text/css; charset=utf-8', readFileSync(join(here, 'public', 'kiosk.css'))],
}

type Session = {
  id: string
  created: string
  updated: string
  turns: number
  usd: number
  wall: Wall
  messages: Anthropic.Beta.BetaMessageParam[]
  /** What the founder saw, for resuming the page and for the facilitator. */
  chat: { role: 'coach' | 'founder'; text: string }[]
  contact?: { name: string; email: string; consent: boolean; at: string }
}

const sessionPath = (id: string) => join(DATA, 'sessions', `${id}.json`)
const validId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{22}$/.test(id)
const load = (id: string): Session | null => existsSync(sessionPath(id)) ? JSON.parse(readFileSync(sessionPath(id), 'utf8')) : null
const save = (s: Session) => { s.updated = new Date().toISOString(); writeFileSync(sessionPath(s.id), JSON.stringify(s)) }

const today = () => new Date().toISOString().slice(0, 10)
const usagePath = () => join(DATA, 'usage', `${today()}.json`)
const spent = (): number => existsSync(usagePath()) ? JSON.parse(readFileSync(usagePath(), 'utf8')).usd : 0
const spend = (usd: number) => writeFileSync(usagePath(), JSON.stringify({ usd: spent() + usd }))
const cost = (u: Anthropic.Beta.BetaUsage) =>
  u.input_tokens * PRICE.input + u.output_tokens * PRICE.output +
  (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite + (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead

const created = new Map<string, number[]>()
/** New conversations are counted per browser (its id from the page), with a looser ceiling per IP. */
function allowNew(browser: unknown, ip: string) {
  const hour = Date.now() - 3600_000
  const b = 'b:' + (typeof browser === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(browser) ? browser : ip)
  const recent = (key: string) => (created.get(key) ?? []).filter(t => t > hour)
  const mine = recent(b), room = recent('ip:' + ip)
  if (mine.length >= NEW_PER_HOUR || room.length >= NEW_PER_HOUR_IP) return false
  created.set(b, [...mine, Date.now()])
  created.set('ip:' + ip, [...room, Date.now()])
  return true
}
const busy = new Set<string>()

function view(s: Session) {
  return {
    id: s.id, step: s.wall.step, steps: STEP_NAMES, wall: s.wall, chat: s.chat, done: s.wall.step === 5,
    contacted: !!s.contact, consent: !!s.contact?.consent, plan: s.contact ? readPlan(s.id) : null,
  }
}

/* ---------- the flight plan the founder sees at the end ---------- */
const planPath = (id: string) => join(DATA, 'plans', `${id}.json`)
const readPlan = (id: string): Report | null => existsSync(planPath(id)) ? JSON.parse(readFileSync(planPath(id), 'utf8')).report : null

/** What the facilitator's report run starts from: the wall, and the flight plan the founder saw when there is one. */
function writeIntake(id: string) {
  const s = load(id)
  if (!s?.contact) return
  const { name, email, consent } = s.contact
  const plan = readPlan(id)
  writeFileSync(join(DATA, 'intakes', `${id}.json`), JSON.stringify({
    consent, report: toReport(s.wall, { name, email }), unknowns: s.wall.unknowns,
    ...(plan ? { plan: { ...plan, founder: { name, email } } } : {}),
  }, null, 2))
}

/** Cut stories and releases from a finished wall, checked against the release rules; one retry with the broken rules. */
async function cutPlan(s: Session): Promise<Report | null> {
  if (existsSync(planPath(s.id))) return readPlan(s.id)
  if (spent() >= DAILY_USD) return null
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: cutPrompt(s.wall) }]
  let usd = 0
  for (let round = 0; round < 2; round++) {
    const msg = await client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: CUT_SCHEMA } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: CUT_SYSTEM,
      messages,
    }).finalMessage()
    usd += cost(msg.usage)
    spend(cost(msg.usage))
    if (msg.stop_reason !== 'end_turn') break
    const text = msg.content.flatMap(b => b.type === 'text' ? [b.text] : []).join('')
    const { report, errors } = fromCut(s.wall, JSON.parse(text) as Cut, { name: '', email: '' })
    if (!errors.length) {
      writeFileSync(planPath(s.id), JSON.stringify({ usd, at: new Date().toISOString(), report }))
      writeIntake(s.id)
      return report
    }
    messages.push({ role: 'assistant', content: msg.content }, { role: 'user', content: `That breaks the release rules:\n${errors.join('\n')}\nCut it again, fixing these.` })
  }
  console.error(s.id, 'no valid flight plan')
  return null
}

const cutting = new Map<string, Promise<Report | null>>()
/** The flight plan, cut once: started as the founder reaches the end, awaited when they leave their email. */
function planFor(s: Session) {
  let p = cutting.get(s.id)
  if (!p) {
    p = cutPlan(s).catch(err => { console.error(s.id, 'cut', err); return null }).finally(() => cutting.delete(s.id))
    cutting.set(s.id, p)
  }
  return p
}

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 20_000) throw new Error('too large')
  }
  return raw ? JSON.parse(raw) : {}
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
  res.end(JSON.stringify(data))
}

/** One founder turn: stream the coach's words, apply its tool calls, loop until it asks its question. */
async function turn(s: Session, text: string, send: (event: object) => void) {
  s.messages.push({ role: 'user', content: text })
  s.chat.push({ role: 'founder', text })
  let said = ''
  for (let round = 0; round < 8; round++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      cache_control: { type: 'ephemeral' },
      system: SYSTEM,
      tools: TOOLS,
      messages: s.messages,
    })
    stream.on('text', delta => { said += delta; send({ type: 'text', delta }) })
    const msg = await stream.finalMessage()
    // Append the whole response, thinking blocks included, unchanged.
    s.messages.push({ role: 'assistant', content: msg.content })
    const usd = cost(msg.usage)
    s.usd += usd
    spend(usd)
    if (msg.stop_reason === 'refusal') {
      const sorry = 'Sorry, I can’t help with that one. Let’s get back to your customer: what’s the problem you most want to solve for them?'
      said += sorry
      send({ type: 'text', delta: sorry })
      break
    }
    if (msg.stop_reason !== 'tool_use') break
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = []
    for (const block of msg.content) {
      if (block.type !== 'tool_use') continue
      const r = apply(s.wall, block.name, block.input as Record<string, unknown>)
      results.push({
        type: 'tool_result',
        tool_use_id: block.id,
        is_error: !r.ok,
        content: `${r.ok ? r.note : r.error}\n\nThe wall now:\n${summary(s.wall)}`,
      })
    }
    s.messages.push({ role: 'user', content: results })
    send({ type: 'wall', ...view(s) })
    if (said && !said.endsWith('\n')) { said += '\n\n'; send({ type: 'text', delta: '\n\n' }) }
  }
  s.chat.push({ role: 'coach', text: said.trim() })
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://local')
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim()
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      return res.end(page)
    }
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true })
    if (req.method === 'GET' && assets[url.pathname]) {
      const [type, data] = assets[url.pathname]
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' })
      return res.end(data)
    }

    if (req.method === 'POST' && url.pathname === '/api/session') {
      const { id, browser } = await body(req)
      const existing = validId(id) ? load(id) : null
      if (existing) return json(res, 200, view(existing))
      if (!allowNew(browser, ip)) return json(res, 429, { error: 'Too many new conversations from here. Try again in an hour.' })
      const now = new Date().toISOString()
      const s: Session = {
        id: randomBytes(16).toString('base64url'), created: now, updated: now, turns: 0, usd: 0,
        wall: emptyWall(), messages: [], chat: [{ role: 'coach', text: GREETING }],
      }
      save(s)
      return json(res, 200, view(s))
    }

    if (req.method === 'POST' && url.pathname === '/api/turn') {
      const { id, text } = await body(req)
      const s = validId(id) ? load(id) : null
      if (!s) return json(res, 404, { error: 'That conversation has gone. Reload to start again.' })
      const said = String(text ?? '').trim().slice(0, MAX_CHARS)
      if (!said) return json(res, 400, { error: 'Say something first.' })
      if (s.wall.step === 5) return json(res, 400, { error: 'You’re done: leave your name and email for your report.', code: 'contact' })
      if (s.turns >= MAX_TURNS) return json(res, 429, { error: 'That’s as long as one conversation can go. Leave your name and email and we’ll pick it up from your report.', code: 'contact' })
      if (spent() >= DAILY_USD) return json(res, 503, { error: 'The coach is resting for today: it’s free while our tokens last. Come back tomorrow; your conversation is saved.' })
      if (busy.has(s.id)) return json(res, 409, { error: 'Still thinking about your last answer.' })
      busy.add(s.id)
      res.writeHead(200, { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store', 'x-accel-buffering': 'no' })
      const send = (e: object) => res.write(JSON.stringify(e) + '\n')
      try {
        s.turns++
        await turn(s, said, send)
        send({ type: 'end', ...view(s) })
        // the turn may have moved the wall on to the end
        if ((s.wall.step as number) === 5) void planFor(s)
      } catch (err) {
        console.error(s.id, err)
        // Drop the unanswered founder message so the conversation stays well-formed.
        while (s.messages.length && s.messages.at(-1)!.role === 'user') s.messages.pop()
        if (s.chat.at(-1)?.role === 'founder') s.chat.pop()
        s.turns--
        send({ type: 'error', error: err instanceof Anthropic.RateLimitError ? 'The coach is busy. Try again in a minute.' : 'Something went wrong on our side. Send that again.' })
      } finally {
        busy.delete(s.id)
        save(s)
        res.end()
      }
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/contact') {
      const { id, name, email, consent } = await body(req)
      const s = validId(id) ? load(id) : null
      if (!s) return json(res, 404, { error: 'That conversation has gone.' })
      const n = String(name ?? '').trim().slice(0, 120), e = String(email ?? '').trim().slice(0, 200)
      if (!n || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return json(res, 400, { error: 'Add your name and an email we can send your report to.' })
      s.contact = { name: n, email: e, consent: consent === true, at: new Date().toISOString() }
      save(s)
      writeIntake(s.id)
      // The thinking holds while the flight plan is cut, if it isn't ready yet; past two minutes it shows up on their next visit.
      if (s.wall.step === 5) await Promise.race([planFor(s), new Promise(r => setTimeout(r, 120_000))])
      return json(res, 200, view(s))
    }

    if (url.pathname.startsWith('/admin')) return admin(url, res)
    json(res, 404, { error: 'Not found' })
  } catch (err) {
    console.error(err)
    if (!res.headersSent) json(res, 400, { error: 'Bad request' })
    else res.end()
  }
})

function admin(url: URL, res: ServerResponse) {
  const key = Buffer.from(url.searchParams.get('key') ?? '')
  const want = Buffer.from(ADMIN_KEY)
  if (!ADMIN_KEY || key.length !== want.length || !timingSafeEqual(key, want)) return json(res, 403, { error: 'Forbidden' })
  const m = url.pathname.match(/^\/admin\/(session|intake|plan)\/([A-Za-z0-9_-]{22})\.json$/)
  if (m) {
    const file = m[1] === 'session' ? sessionPath(m[2]) : m[1] === 'plan' ? planPath(m[2]) : join(DATA, 'intakes', `${m[2]}.json`)
    if (!existsSync(file)) return json(res, 404, { error: 'Not found' })
    res.writeHead(200, { 'content-type': 'application/json', 'content-disposition': `attachment; filename="${m[2]}.${m[1]}.json"` })
    return res.end(readFileSync(file))
  }
  const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
  const k = encodeURIComponent(url.searchParams.get('key')!)
  const rows = readdirSync(join(DATA, 'sessions')).map(f => load(f.slice(0, -5))!).filter(Boolean)
    .sort((a, b) => b.updated.localeCompare(a.updated))
    .map(s => `<tr><td>${esc(s.updated.slice(0, 16).replace('T', ' '))}</td><td>${esc(s.contact?.name ?? '—')}<br><small>${esc(s.contact?.email ?? '')}${s.contact?.consent ? ' ✓ consent' : ''}</small></td>
      <td>${esc(s.wall.product?.name ?? '—')}</td><td>${s.wall.step} ${STEP_NAMES[s.wall.step]}</td><td>${s.turns}</td><td>$${s.usd.toFixed(2)}</td>
      <td><a href="/admin/session/${s.id}.json?key=${k}">transcript</a>${s.contact ? ` · <a href="/admin/intake/${s.id}.json?key=${k}">intake</a>` : ''}${existsSync(planPath(s.id)) ? ` · <a href="/admin/plan/${s.id}.json?key=${k}">flight plan</a>` : ''}</td></tr>`).join('')
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
  res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Coach Admin</title>
<style>body{font:15px/1.5 system-ui;margin:24px;color:#141C26;background:#fff}table{border-collapse:collapse;width:100%}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}small{color:#56636F}
@media (prefers-color-scheme:dark){body{background:#0E1319;color:#E7ECF1}td,th{border-color:#2A3542}small{color:#97A4B1}a{color:#7D9CFF}}</style>
<h1>Coach conversations</h1><p>Spent today: $${spent().toFixed(2)} of $${DAILY_USD}.</p>
<table><tr><th>Updated</th><th>Founder</th><th>Product</th><th>Step</th><th>Turns</th><th>Cost</th><th></th></tr>${rows}</table>`)
}

server.listen(PORT, () => console.log(`coach on :${PORT}, model ${MODEL}, $${DAILY_USD}/day`))
