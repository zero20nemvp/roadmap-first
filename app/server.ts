// The v2 workshop coach as a web app: one page, one conversation per founder,
// the Claude API on the server. Free while the daily budget lasts.
//   ANTHROPIC_API_KEY=… ADMIN_KEY=… node server.ts
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import Anthropic from '@anthropic-ai/sdk'
import nodemailer from 'nodemailer'
import type { Report } from '../web/report.ts'
import { renderRoadmap } from '../web/roadmap.ts'
import { type Account, auth, clearCookie, normalEmail, readCookie, setCookie, validEmail } from './auth.ts'
import { apply, CUT_SCHEMA, CUT_SYSTEM, cutPrompt, DONE, emptyWall, fromCut, GREETING, groundZero, live, migrate, settle, STEP_NAMES, summary, SYSTEM, toReport, TOOLS, trash, untrash, type Cut, type Wall } from './coach.ts'
import { codeEmail, due, type Email, facilitatorEmail, type MailLog, parseTemplate, seriesEmail, SERIES, type Template } from './mail.ts'
import QRCode from 'qrcode'
import { brandPage, loadBrand } from './brand.ts'
import { admit, contactOf, type Contact, isMember, isTeam, joins, owns, recipients, spoken, TEAM_NOTE, trashedFor, turns, unchanged, validCode, version } from './team.ts'

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
// Email goes out through the smtp container's relay; with no SMTP_HOST nothing is sent.
const SMTP_HOST = process.env.SMTP_HOST ?? ''
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 25)
const FACILITATOR = process.env.FACILITATOR ?? 'Delaney'
const FACILITATOR_EMAIL = process.env.FACILITATOR_EMAIL ?? 'db@zero2one.ee'
const MAIL_FROM = process.env.MAIL_FROM ?? `${FACILITATOR} <${FACILITATOR_EMAIL}>`
const PUBLIC_URL = (process.env.PUBLIC_URL ?? 'https://roadmap.zero2one.ee').replace(/\/$/, '')
// The coach's brand, one per container (AX-ROADMAP-FIRST-00067): brands/<BRAND>; a broken one stops it here, at boot.
const BRAND = loadBrand(join(here, 'brands'), process.env.BRAND ?? 'zero2one')
// login codes come from an address nobody answers
const CODE_FROM = process.env.CODE_FROM ?? BRAND.email.from
const SECURE = PUBLIC_URL.startsWith('https:')
const BOOKING_LINK = process.env.BOOKING_LINK ?? ''
// what this coach calls itself on the page; the brand's name unless the container says otherwise
const COACH_NAME = process.env.COACH_NAME ?? BRAND.name

for (const d of ['sessions', 'intakes', 'plans', 'usage', 'mail']) mkdirSync(join(DATA, d), { recursive: true })
const client = new Anthropic()
const accounts = auth(DATA)
const page = brandPage(readFileSync(join(here, 'public', 'index.html'), 'utf8'), BRAND, COACH_NAME)
// The kiosk kit (~/Code/kiosk-pattern), vendored beside the page
const assets: Record<string, [string, Buffer]> = {
  '/kiosk.js': ['text/javascript; charset=utf-8', readFileSync(join(here, 'public', 'kiosk.js'))],
  '/kiosk.css': ['text/css; charset=utf-8', readFileSync(join(here, 'public', 'kiosk.css'))],
  // the brand's tab icon, and its mark in the kiosk's corner when it is a drawing
  '/favicon.svg': ['image/svg+xml', BRAND.favicon],
  ...(BRAND.markSvg ? { '/brand-mark.svg': ['image/svg+xml', BRAND.markSvg] as [string, Buffer] } : {}),
  // the roadmap website's libraries (three.js, GSAP, ScrollTrigger, d3), as one cached script
  '/roadmap-vendor.js': ['text/javascript; charset=utf-8', Buffer.from(['three.min.js', 'gsap.min.js', 'ScrollTrigger.min.js', 'd3.min.js']
    .map(f => readFileSync(join(here, '..', 'assets', 'vendor', f), 'utf8')).join('\n;\n'))],
}
const vendorGz = gzipSync(assets['/roadmap-vendor.js'][1])
const roadmapTemplate = readFileSync(join(here, '..', 'web', 'roadmap.template.html'), 'utf8')

type Session = {
  id: string
  created: string
  updated: string
  turns: number
  usd: number
  wall: Wall
  messages: Anthropic.Beta.BetaMessageParam[]
  /** What the founder saw, for resuming the page and for the facilitator; in a team, who said each founder line. */
  chat: { role: 'coach' | 'founder'; text: string; by?: string }[]
  /** The end; in a team, the first member to finish, and each member's own in contacts. */
  contact?: Contact
  contacts?: Record<string, Contact>
  /** The founder's account, once they have proven their email; the conversation then answers only to its login and its team's. */
  account?: string
  /** Its team's accounts, once someone has typed /team. */
  members?: string[]
  /** Set aside by the founder: kept, and listed in their trash; in a team, set aside per member. */
  trashed?: string
  trashedFor?: Record<string, string>
  /** What the founder changed on the wall themselves, for the coach to hear on the next turn. */
  notes?: string[]
  /** Counts every save, so a team's screens poll for what changed. */
  rev?: number
}

const sessionPath = (id: string) => join(DATA, 'sessions', `${id}.json`)
const validId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{22}$/.test(id)
const load = (id: string): Session | null => {
  if (!existsSync(sessionPath(id))) return null
  const s: Session = JSON.parse(readFileSync(sessionPath(id), 'utf8'))
  migrate(s.wall)
  return s
}
const save = (s: Session, touch = true) => { if (touch) s.updated = new Date().toISOString(); s.rev = (s.rev ?? 0) + 1; writeFileSync(sessionPath(s.id), JSON.stringify(s)) }
/** Nothing said in it yet: not worth keeping under an account. */
const empty = (s: Session) => s.chat.length <= 1

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
/** One turn at a time per conversation, with who is taking it (AX-ROADMAP-FIRST-00053). */
const lock = turns()
const team = joins(DATA)

/** Who this request is logged in as, if anyone. */
const whoIs = (req: IncomingMessage): Account | null => accounts.whoIs(readCookie(req.headers.cookie))
/** Every conversation under an account: its own, and the teams it has joined. */
const mine = (who: Account) => readdirSync(join(DATA, 'sessions')).map(f => load(f.slice(0, -5))).filter((s): s is Session => !!s && (s.account === who.id || isMember(s, who)))
const me = (who: Account | null) => who ? { email: who.email, name: who.name } : null
/** What a member is called in the room: their name, else their email before the @. */
const nameOf = (id: string) => { const a = accounts.byId(id); return a ? a.name || a.email.split('@')[0] : '' }

/** The conversation as one person sees it: in a team, their own end and their own trash. */
function view(s: Session, who: Account | null) {
  const mineEnd = contactOf(s, who), answering = lock.who(s.id)
  return {
    id: s.id, step: s.wall.step, steps: STEP_NAMES, wall: s.wall, chat: s.chat, done: s.wall.step === DONE, trashed: trashedFor(s, who),
    contacted: !!mineEnd, consent: !!mineEnd?.consent, plan: s.contact ? readPlan(s.id) : null,
    team: isTeam(s) ? s.members!.map(nameOf) : null, answering, v: version(s.rev ?? 0, answering),
  }
}

/* ---------- the flight plan the founder sees at the end ---------- */
const planPath = (id: string) => join(DATA, 'plans', `${id}.json`)
const readPlan = (id: string): Report | null => existsSync(planPath(id)) ? JSON.parse(readFileSync(planPath(id), 'utf8')).report : null
const planIsFresh = (id: string) => existsSync(planPath(id)) && !JSON.parse(readFileSync(planPath(id), 'utf8')).stale
/** The founder changed a wall the plan was cut from: it is cut again, and served as it was until then. */
function stalePlan(id: string) {
  if (!existsSync(planPath(id))) return
  const p = JSON.parse(readFileSync(planPath(id), 'utf8'))
  writeFileSync(planPath(id), JSON.stringify({ ...p, stale: true }))
}

/** Ground Zero as the founder argued it down, a row per feature, for the roadmap page and the intake. */
const arguedRows = (w: Wall) => groundZero(w).features.flatMap(f => {
  const a = w.groundZero.argued[f.id]
  return a ? [{ feature: f.id, name: f.name, keep: a.keep, reason: a.reason }] : []
})

/** A team's names together, for the report: "Ada, Greg and Michle". */
const together = (names: string[]) => names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0] ?? ''
/** Who the roadmap is for: the founder, or every member of the team who has finished. */
const founderOf = (s: Session) => isTeam(s) ? together(recipients(s).map(r => r.contact.name)) : s.contact?.name ?? ''

/** What the facilitator's report run starts from: the wall, and the flight plan the founder saw when there is one. A team's is one intake, listing every member. */
function writeIntake(id: string) {
  const s = load(id)
  if (!s?.contact) return
  const { email, consent } = s.contact, name = founderOf(s)
  const plan = readPlan(id)
  writeFileSync(join(DATA, 'intakes', `${id}.json`), JSON.stringify({
    consent, report: toReport(s.wall, { name, email }), unknowns: live(s.wall).unknowns, argued: arguedRows(s.wall),
    ...(isTeam(s) ? { members: recipients(s).map(r => ({ name: r.contact.name, email: r.contact.email, consent: r.contact.consent })) } : {}),
    ...(plan ? { plan: { ...plan, founder: { name, email } } } : {}),
  }, null, 2))
}

/** Cut stories and releases from a finished wall, checked against the release rules; one retry with the broken rules. */
async function cutPlan(s: Session): Promise<Report | null> {
  if (planIsFresh(s.id)) return readPlan(s.id)
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
      // the plan it replaces is kept beside it
      if (existsSync(planPath(s.id))) writeFileSync(planPath(s.id).replace(/\.json$/, `.${Date.now()}.json`), readFileSync(planPath(s.id)))
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
    p = cutPlan(s).catch(err => { console.error(s.id, 'cut', err); return null }).finally(() => { cutting.delete(s.id); void sendMail() })
    cutting.set(s.id, p)
  }
  return p
}

/* ---------- email: the founder's series, and a note to the facilitator ---------- */
const transport = SMTP_HOST ? nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT, secure: false, ignoreTLS: true }) : null
const templates: Template[] = SERIES.map(({ key }) => {
  const file = readdirSync(join(here, '..', 'docs', 'emails')).find(f => f.startsWith(key + '-'))!
  const t = parseTemplate(key, readFileSync(join(here, '..', 'docs', 'emails', file), 'utf8'))
  // with no booking link, email 04 asks them to reply instead
  return BOOKING_LINK ? t : { ...t, body: t.body.replace(/book 30 minutes with me: \{\{booking_link\}\}/, 'reply to this email and we’ll find 30 minutes') }
})
const mailPath = (id: string) => join(DATA, 'mail', `${id}.json`)
const readMail = (id: string): MailLog => existsSync(mailPath(id)) ? JSON.parse(readFileSync(mailPath(id), 'utf8')) : { sent: {} }
const writeMail = (id: string, m: MailLog) => writeFileSync(mailPath(id), JSON.stringify(m))
// Only founders who leave their email after mail was switched on get it, so nobody from before is surprised.
const sincePath = join(DATA, 'mail', 'since')
const MAIL_SINCE = transport ? (existsSync(sincePath) ? readFileSync(sincePath, 'utf8').trim() : (writeFileSync(sincePath, new Date().toISOString()), new Date().toISOString())) : ''

async function deliver(e: Email, extra: Record<string, string> = {}) {
  await transport!.sendMail({ from: MAIL_FROM, replyTo: FACILITATOR_EMAIL, to: e.to, subject: e.subject, text: e.text, html: e.html, headers: extra })
}

let mailing = false
/** Sends whatever is due: run every ten minutes, and as soon as a founder leaves their email or their plan lands. */
async function sendMail() {
  if (!transport || mailing) return
  mailing = true
  try {
    for (const f of readdirSync(join(DATA, 'sessions'))) {
      const s = load(f.slice(0, -5))
      if (!s) continue
      const plan = readPlan(s.id), reportLink = `${PUBLIC_URL}/roadmap/${s.id}`
      // a solo founder, or each member of a team, with their own log and their own way to stop
      for (const { key: mailKey, account, contact } of recipients(s)) {
        if (contact.at < MAIL_SINCE) continue
        const log = readMail(mailKey)
        const { name, email, consent } = contact
        try {
          if (!log.facilitator) {
            await deliver(facilitatorEmail(FACILITATOR_EMAIL, { name, email, consent, product: s.wall.product?.name ?? '', reportLink, adminLink: `${PUBLIC_URL}/admin`, hasPlan: !!plan }))
            log.facilitator = new Date().toISOString(); writeMail(mailKey, log)
          }
          const key = consent && plan ? due(log, Date.now()) : null // email 01 waits for the flight plan it links to
          if (!key) continue
          const stopLink = `${PUBLIC_URL}/stop/${s.id}${account ? '/' + account : ''}`
          const vars = { name: name.split(/\s+/)[0], product: s.wall.product?.name ?? 'your product', report_link: reportLink, facilitator: FACILITATOR, booking_link: BOOKING_LINK }
          await deliver(seriesEmail(templates.find(t => t.key === key)!, email, vars, stopLink), { 'List-Unsubscribe': `<${stopLink}>` })
          log.sent[key] = new Date().toISOString(); writeMail(mailKey, log)
          console.log(mailKey, 'sent email', key)
        } catch (err) {
          console.error(mailKey, 'mail', err)
        }
      }
    }
  } finally {
    mailing = false
  }
}
if (transport) { setInterval(() => void sendMail(), 10 * 60_000); setTimeout(() => void sendMail(), 5_000) }

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 20_000) throw new Error('too large')
  }
  return raw ? JSON.parse(raw) : {}
}

function json(res: ServerResponse, status: number, data: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers })
  res.end(JSON.stringify(data))
}

/** One founder turn: stream the coach's words, apply its tool calls, loop until it asks its question. In a team, `by` is who spoke. */
async function turn(s: Session, text: string, send: (event: object) => void, who: Account | null) {
  const by = isTeam(s) && who ? nameOf(who.id) : null
  // what the founder changed on the wall themselves comes first, so the coach isn't surprised by it
  const notes = s.notes?.length ? `(Since your last question, the founder changed the wall themselves: ${s.notes.join(' ')} The wall now:\n${summary(s.wall)})` : ''
  const said = spoken(text, by)
  s.messages.push({ role: 'user', content: notes ? [{ type: 'text', text: notes }, { type: 'text', text: said }] : said })
  s.chat.push({ role: 'founder', text, ...(by ? { by } : {}) })
  let reply = ''
  for (let round = 0; round < 8; round++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      cache_control: { type: 'ephemeral' },
      system: isTeam(s) ? SYSTEM + TEAM_NOTE : SYSTEM,
      tools: TOOLS,
      messages: s.messages,
    })
    stream.on('text', delta => { reply += delta; send({ type: 'text', delta }) })
    const msg = await stream.finalMessage()
    // Append the whole response, thinking blocks included, unchanged.
    s.messages.push({ role: 'assistant', content: msg.content })
    const usd = cost(msg.usage)
    s.usd += usd
    spend(usd)
    if (msg.stop_reason === 'refusal') {
      const sorry = 'Sorry, I can’t help with that one. Let’s get back to your customer: what’s the problem you most want to solve for them?'
      reply += sorry
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
    send({ type: 'wall', ...view(s, who) })
    if (reply && !reply.endsWith('\n')) { reply += '\n\n'; send({ type: 'text', delta: '\n\n' }) }
  }
  s.chat.push({ role: 'coach', text: reply.trim() })
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://local')
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim()
  try {
    // the page, and the same page at a team's join link: it reads the code from its address
    if (req.method === 'GET' && (url.pathname === '/' || /^\/join\/[A-Za-z0-9]{6}$/.test(url.pathname))) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', ...(url.pathname === '/' ? {} : { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }) })
      return res.end(page)
    }
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true })
    if (req.method === 'GET' && assets[url.pathname]) {
      const [type, data] = assets[url.pathname]
      // the roadmap's libraries are a megabyte: gzipped, and cached for a day
      if (url.pathname === '/roadmap-vendor.js') {
        const gz = /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''))
        res.writeHead(200, { 'content-type': type, 'cache-control': 'public, max-age=86400', vary: 'accept-encoding', ...(gz ? { 'content-encoding': 'gzip' } : {}) })
        return res.end(gz ? vendorGz : data)
      }
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' })
      return res.end(data)
    }

    // The founder's roadmap as a website (web/roadmap.ts, the plugin's whiteboard page in v2 words); the conversation's id is the key to it.
    const roadmap = req.method === 'GET' && url.pathname.match(/^\/roadmap\/([A-Za-z0-9_-]{22})$/)
    if (roadmap) {
      const s = load(roadmap[1]), plan = s?.contact ? readPlan(s.id) : null
      if (!s?.contact || !plan) return json(res, 404, { error: 'No roadmap here yet.' })
      const generated = new Date(s.contact.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'SAMEORIGIN', 'referrer-policy': 'no-referrer' })
      return res.end(renderRoadmap(roadmapTemplate, { ...plan, founder: { name: founderOf(s) } },
        { unknowns: live(s.wall).unknowns, argued: arguedRows(s.wall), chat: s.chat, generated }, '<script src="/roadmap-vendor.js"></script>', BRAND.roadmap))
    }

    // a team's screens, every 3 seconds: the view only if something changed since the one they have (AX-ROADMAP-FIRST-00052)
    const polled = req.method === 'GET' && url.pathname.match(/^\/api\/session\/([A-Za-z0-9_-]{22})$/)
    if (polled) {
      const s = load(polled[1]), who = whoIs(req)
      if (!owns(s, who)) return json(res, 404, { error: 'That conversation has gone.' })
      if (unchanged(url.searchParams.get('since'), s.rev ?? 0, lock.who(s.id))) { res.writeHead(304, { 'cache-control': 'no-store' }); return res.end() }
      return json(res, 200, { ...view(s, who), me: me(who) })
    }

    if (req.method === 'POST' && url.pathname === '/api/session') {
      const { id, browser, fresh } = await body(req)
      const who = whoIs(req)
      let existing = validId(id) ? load(id) : null
      if (!owns(existing, who) || trashedFor(existing, who) || (who && !existing.account && empty(existing))) existing = null
      // logged in on a browser with nothing open: their latest conversation
      if (!existing && who && fresh !== true) existing = mine(who).filter(s => !trashedFor(s, who)).sort((a, b) => b.updated.localeCompare(a.updated))[0] ?? null
      if (existing) {
        // a conversation this browser started before logging in is theirs
        if (who && !existing.account) { existing.account = who.id; save(existing, false) }
        return json(res, 200, { ...view(existing, who), me: me(who) })
      }
      if (!allowNew(browser, ip)) return json(res, 429, { error: 'Too many new conversations from here. Try again in an hour.' })
      const now = new Date().toISOString()
      const s: Session = {
        id: randomBytes(16).toString('base64url'), created: now, updated: now, turns: 0, usd: 0,
        wall: emptyWall(), messages: [], chat: [{ role: 'coach', text: GREETING }], ...(who ? { account: who.id } : {}),
      }
      save(s)
      return json(res, 200, { ...view(s, who), me: me(who) })
    }

    // /team: a join code for this conversation, as a link and a QR code; whoever types it becomes its first member (AX-ROADMAP-FIRST-00051, 00064)
    if (req.method === 'POST' && url.pathname === '/api/team') {
      const { id } = await body(req)
      const who = whoIs(req), s = validId(id) ? load(id) : null
      if (!who) return json(res, 401, { error: 'Your email needs its code first.', code: 'login' })
      if (!owns(s, who) || trashedFor(s, who)) return json(res, 404, { error: 'That conversation has gone.' })
      if (s.wall.step === DONE) return json(res, 400, { error: 'This conversation is finished: a team joins one that’s still going. Type /new, then /team.' })
      const claim = !s.account, a = admit({ ...s, account: s.account ?? who.id }, who)
      if (!a.ok) return json(res, 400, { error: a.error })
      // a fresh code for a team already made changes nothing the others' screens show
      if (claim || a.members.length !== (s.members?.length ?? 0)) { s.account ??= who.id; s.members = a.members; save(s, false) }
      const { code, expires } = team.invite(s.id)
      const link = `${PUBLIC_URL}/join/${code}`
      const qr = await QRCode.toString(link, { type: 'svg', margin: 1, color: { dark: '#EFEDE6', light: '#00000000' } })
      return json(res, 200, { code, link, qr, expires: new Date(expires).toISOString(), ...view(s, who), me: me(who) })
    }

    // the join link: a teammate who has proven their email becomes a member (AX-ROADMAP-FIRST-00061)
    if (req.method === 'POST' && url.pathname === '/api/team/join') {
      const { code } = await body(req)
      const who = whoIs(req)
      if (!who) return json(res, 401, { error: 'Your email needs its code first.', code: 'login' })
      const j = team.join(code, ip)
      if (!j.ok) return json(res, 400, { error: j.error })
      const s = load(j.session)
      if (!s || s.trashed) return json(res, 404, { error: 'That conversation has gone.' })
      const a = admit(s, who)
      if (!a.ok) return json(res, 400, { error: a.error })
      s.members = a.members
      if (s.trashedFor?.[who.id]) delete s.trashedFor[who.id] // joining again brings it back for them
      save(s, false)
      return json(res, 200, { ...view(s, who), me: me(who) })
    }

    // /login, and the code step at the end: a code to the email, then the code back
    if (req.method === 'POST' && url.pathname === '/api/login/start') {
      const email = normalEmail((await body(req)).email)
      const r = accounts.start(email, ip)
      if (!r.ok) return json(res, 400, { error: r.error })
      if (transport) await transport.sendMail({ from: CODE_FROM, to: email, ...codeEmail(email, r.code, BRAND.email) })
      else console.log(`login code for ${email}: ${r.code}`) // no relay: running locally
      return json(res, 200, { ok: true })
    }

    if (req.method === 'POST' && url.pathname === '/api/login/verify') {
      const { email: e, code, id, name } = await body(req)
      const email = normalEmail(e)
      const r = accounts.verify(email, code)
      if (!r.ok) return json(res, 400, { error: r.error })
      const who = accounts.account(email, String(name ?? '').trim())
      // proving the email claims this browser's conversation, and any left with that email before
      const here = validId(id) ? load(id) : null
      for (const s of [here, ...readdirSync(join(DATA, 'sessions')).map(f => load(f.slice(0, -5)))]) {
        if (s && !s.account && ((s.id === here?.id && !empty(s)) || normalEmail(s.contact?.email) === email)) { s.account = who.id; save(s, false) }
      }
      return json(res, 200, { me: me(who) }, { 'set-cookie': setCookie(accounts.login(who.id), SECURE) })
    }

    if (req.method === 'POST' && url.pathname === '/api/logout') {
      accounts.logout(readCookie(req.headers.cookie))
      return json(res, 200, { ok: true }, { 'set-cookie': clearCookie(SECURE) })
    }

    if (req.method === 'GET' && url.pathname === '/api/conversations') {
      const who = whoIs(req)
      if (!who) return json(res, 401, { error: 'Log in to see your conversations: type /login.' })
      return json(res, 200, {
        me: me(who),
        conversations: mine(who).sort((a, b) => b.updated.localeCompare(a.updated)).map(s => ({
          id: s.id, product: s.wall.product?.name ?? '', step: s.wall.step, stepName: STEP_NAMES[s.wall.step],
          updated: s.updated, created: s.created, done: !!contactOf(s, who), trashed: trashedFor(s, who), team: isTeam(s) ? s.members!.length : 0,
        })),
      })
    }

    // trash or bring back a whole conversation: it is never deleted; in a team, only for the member who asks (AX-ROADMAP-FIRST-00057)
    if (req.method === 'POST' && url.pathname === '/api/conversation') {
      const { id, trashed } = await body(req)
      const who = whoIs(req), s = validId(id) ? load(id) : null
      if (!who || !s || !(s.account === who.id || isMember(s, who))) return json(res, 404, { error: 'That conversation isn’t one of yours.' })
      if (isTeam(s)) {
        if (trashed === true) (s.trashedFor ??= {})[who.id] ??= new Date().toISOString()
        else if (s.trashedFor) delete s.trashedFor[who.id]
      } else if (trashed === true) s.trashed ??= new Date().toISOString()
      else delete s.trashed
      save(s)
      return json(res, 200, { ok: true, trashed: trashedFor(s, who) })
    }

    // the founder trashing or bringing back an item on their wall; the coach hears about it next turn
    if (req.method === 'POST' && url.pathname === '/api/wall') {
      const { id, item, trashed } = await body(req)
      const who = whoIs(req), s = validId(id) ? load(id) : null
      if (!owns(s, who)) return json(res, 404, { error: 'That conversation has gone.' })
      if (lock.has(s.id)) return json(res, 409, { error: lock.who(s.id) ? `${lock.who(s.id)} is answering…` : 'Still thinking about your last answer.', code: 'busy' })
      const r = trashed === true ? trash(s.wall, String(item ?? '')) : untrash(s.wall, String(item ?? ''))
      if (!r.ok) return json(res, 400, { error: r.error })
      settle(s.wall)
      ;(s.notes ??= []).push(r.note.replace(/; the founder can bring (it|them) back\.$/, '.'))
      stalePlan(s.id)
      save(s)
      if (s.contact) { writeIntake(s.id); if (s.wall.step === DONE) void planFor(s) }
      return json(res, 200, view(s, who))
    }

    if (req.method === 'POST' && url.pathname === '/api/turn') {
      const { id, text } = await body(req)
      const who = whoIs(req), s = validId(id) ? load(id) : null
      if (!owns(s, who)) return json(res, 404, { error: 'That conversation has gone. Reload to start again.' })
      if (trashedFor(s, who)) return json(res, 400, { error: 'This conversation is in your trash. Bring it back from /trash to carry on.' })
      const said = String(text ?? '').trim().slice(0, MAX_CHARS)
      if (!said) return json(res, 400, { error: 'Say something first.' })
      if (s.wall.step === DONE) return json(res, 400, s.contact ? { error: 'You’re done with this one: type /roadmap to see it, or /new to start another.' } : { error: 'You’re done: leave your name and email for your report.', code: 'contact' })
      if (s.turns >= MAX_TURNS) return json(res, 429, { error: 'That’s as long as one conversation can go. Leave your name and email and we’ll pick it up from your report.', code: 'contact' })
      if (spent() >= DAILY_USD) return json(res, 503, { error: 'The coach is resting for today: it’s free while our tokens last. Come back tomorrow; your conversation is saved.' })
      // in a team the others are told who is answering; a solo founder's turn holds it without a name
      const took = lock.take(s.id, isTeam(s) && who ? nameOf(who.id) : '')
      if (!took.ok) return json(res, 409, { error: took.error, code: 'busy', by: took.by ?? null })
      res.writeHead(200, { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store', 'x-accel-buffering': 'no' })
      const send = (e: object) => res.write(JSON.stringify(e) + '\n')
      try {
        s.turns++
        await turn(s, said, send, who)
        delete s.notes
        send({ type: 'end', ...view(s, who) })
        // the turn may have moved the wall on to the end
        if ((s.wall.step as number) === DONE) void planFor(s)
      } catch (err) {
        console.error(s.id, err)
        // Drop the unanswered founder message so the conversation stays well-formed.
        while (s.messages.length && s.messages.at(-1)!.role === 'user') s.messages.pop()
        if (s.chat.at(-1)?.role === 'founder') s.chat.pop()
        s.turns--
        send({ type: 'error', error: err instanceof Anthropic.RateLimitError ? 'The coach is busy. Try again in a minute.' : 'Something went wrong on our side. Send that again.' })
      } finally {
        lock.give(s.id)
        // a teammate may have joined, or set it aside for themselves, while the turn ran: keep what they did
        const now = load(s.id)
        if (now) Object.assign(s, { members: now.members, trashedFor: now.trashedFor, rev: Math.max(s.rev ?? 0, now.rev ?? 0) })
        save(s)
        res.end()
      }
      return
    }

    // the end: the email is the account's, proven by its code; only the name and the consent are asked
    if (req.method === 'POST' && url.pathname === '/api/contact') {
      const { id, name, consent } = await body(req)
      const who = whoIs(req), s = validId(id) ? load(id) : null
      if (!who) return json(res, 401, { error: 'Your email needs its code first.', code: 'login' })
      if (!s || !(s.account === who.id || isMember(s, who))) return json(res, 404, { error: 'That conversation has gone.' })
      const before = contactOf(s, who)
      const n = String(name ?? '').trim().slice(0, 120) || who.name || before?.name || ''
      if (!n) return json(res, 400, { error: 'Add your name, for the report.' })
      accounts.account(who.email, n)
      const mine: Contact = { name: n, email: who.email, consent: consent === true, at: before?.at ?? new Date().toISOString() }
      // in a team each member ends for themselves; the first to finish stands for the conversation (AX-ROADMAP-FIRST-00054)
      if (isTeam(s)) { (s.contacts ??= {})[who.id] = mine; s.contact ??= mine }
      else s.contact = mine
      save(s)
      writeIntake(s.id)
      // The thinking holds while the flight plan is cut, if it isn't ready yet; past two minutes it shows up on their next visit.
      if (s.wall.step === DONE) await Promise.race([planFor(s), new Promise(r => setTimeout(r, 120_000))])
      void sendMail()
      return json(res, 200, { ...view(s, who), me: me(accounts.byId(who.id)) })
    }

    // The link at the foot of every email: no more of the series. A team member's carries their account, and stops only theirs.
    const stop = req.method === 'GET' && url.pathname.match(/^\/stop\/([A-Za-z0-9_-]{22})(?:\/([A-Za-z0-9_-]{22}))?$/)
    if (stop) {
      const s = load(stop[1])
      const r = s ? recipients(s).find(r => (r.account ?? null) === (stop[2] ?? null)) : null
      if (r) { const log = readMail(r.key); log.stopped ??= new Date().toISOString(); writeMail(r.key, log) }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      return res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Emails Stopped</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:${BRAND.page.ground};color:${BRAND.page.text};font:300 22px/1.5 'IBM Plex Sans',system-ui,sans-serif;padding:16px}p{max-width:30em}small{display:block;margin-top:14px;font:400 13px/1.4 ui-monospace,monospace;color:#A8A8A8}</style>
<p>Done: you won’t get any more of these emails.<small>Your roadmap is still yours at the link you have.</small></p>`)
    }

    if (url.pathname.startsWith('/admin')) return admin(url, res)
    json(res, 404, { error: 'Not found' })
  } catch (err) {
    console.error(err)
    if (!res.headersSent) json(res, 400, { error: 'Bad request' })
    else res.end()
  }
})

/** What the founder has been emailed, for the admin page. */
function mailNote(id: string) {
  const log = readMail(id), sent = Object.keys(log.sent)
  return (sent.length ? `<br>emailed ${sent.join(', ')}` : '') + (log.stopped ? ' · stopped' : '')
}

/** A team's row on the admin page: every member, each with their own end and emails. */
function teamCell(s: Session, esc: (s: string) => string) {
  return `team of ${s.members!.length}` + s.members!.map(id => {
    const a = accounts.byId(id), c = s.contacts?.[id]
    return `<br><small>${esc(c?.name ?? a?.name ?? '')} ${esc(a?.email ?? '')}${s.trashedFor?.[id] ? ' · trashed' : ''}${c ? (c.consent ? ' ✓ consent' : ' · finished') : ''}${c ? mailNote(`${s.id}.${id}`) : ''}</small>`
  }).join('')
}

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
    .map(s => `<tr><td>${esc(s.updated.slice(0, 16).replace('T', ' '))}</td><td>${isTeam(s) ? teamCell(s, esc) : `${esc(s.contact?.name ?? '—')}<br><small>${esc(s.contact?.email ?? (s.account ? accounts.byId(s.account)?.email ?? '' : ''))}${s.account ? ' · account' : ''}${s.trashed ? ' · trashed' : ''}${s.contact?.consent ? ' ✓ consent' : ''}${mailNote(s.id)}</small>`}</td>
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
