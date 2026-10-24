// Accounts by an emailed code, with no passwords. A founder proves their email with a six-digit
// code, and stays logged in by a cookie whose token the server keeps only as a hash.
// Codes, accounts and logins are files under the data directory; the rate limits are in memory.
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const CODE_MINUTES = 15
export const CODE_TRIES = 5
export const CODES_PER_EMAIL = 3 // an hour
export const CODES_PER_IP = 60 // an hour: a venue’s wifi puts a whole room of teams behind one (AX-ROADMAP-FIRST-00065)
export const LOGIN_DAYS = 365
export const COOKIE = 'coach_auth'

const MINUTE = 60_000, HOUR = 3_600_000, DAY = 86_400_000

export type Account = { id: string; email: string; name: string; created: string }
type Code = { hash: string; expires: number; tries: number }
type Login = { account: string; expires: number; rolled: number }
export type Result<T> = ({ ok: true } & T) | { ok: false; error: string }

const sha = (s: string) => createHash('sha256').update(s).digest('base64url')
export const normalEmail = (e: unknown) => String(e ?? '').trim().toLowerCase().slice(0, 200)
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
/** An account's id comes from its email, so finding one needs no index. */
export const accountId = (email: string) => sha('account:' + normalEmail(email)).slice(0, 22)

export function auth(dir: string) {
  for (const d of ['codes', 'accounts', 'logins']) mkdirSync(join(dir, d), { recursive: true })
  const read = <T>(f: string): T | null => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null
  const codePath = (email: string) => join(dir, 'codes', `${sha('code:' + email)}.json`)
  const accountPath = (id: string) => join(dir, 'accounts', `${id}.json`)
  const loginPath = (token: string) => join(dir, 'logins', `${sha('login:' + token)}.json`)
  const sent = new Map<string, number[]>()

  return {
    /** A fresh code for this email, replacing any before it, unless it or this IP has asked too often. */
    start(email: string, ip: string, now = Date.now()): Result<{ code: string }> {
      if (!validEmail(email)) return { ok: false, error: 'That doesn’t look like an email. Try it again.' }
      const recent = (k: string) => (sent.get(k) ?? []).filter(t => t > now - HOUR)
      const mine = recent('e:' + email), room = recent('ip:' + ip)
      if (mine.length >= CODES_PER_EMAIL || room.length >= CODES_PER_IP) return { ok: false, error: 'That’s a lot of codes. Use the last one we sent, or try again in an hour.' }
      sent.set('e:' + email, [...mine, now]); sent.set('ip:' + ip, [...room, now])
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
      writeFileSync(codePath(email), JSON.stringify({ hash: sha(email + ':' + code), expires: now + CODE_MINUTES * MINUTE, tries: 0 } satisfies Code))
      return { ok: true, code }
    },

    /** Checks a code: single use, gone after its time or its tries. */
    verify(email: string, code: unknown, now = Date.now()): Result<{}> {
      const f = codePath(email), c = read<Code>(f)
      if (!c || c.expires < now || c.tries >= CODE_TRIES) {
        if (c) rmSync(f)
        return { ok: false, error: 'That code has run out. Type /login to get a new one.' }
      }
      const given = Buffer.from(sha(email + ':' + String(code ?? '').replace(/\D/g, ''))), want = Buffer.from(c.hash)
      if (given.length === want.length && timingSafeEqual(given, want)) { rmSync(f); return { ok: true } }
      c.tries++
      if (c.tries >= CODE_TRIES) { rmSync(f); return { ok: false, error: 'That’s not it, and that was the last try. Type /login to get a new code.' } }
      writeFileSync(f, JSON.stringify(c))
      return { ok: false, error: `That’s not the code. ${CODE_TRIES - c.tries} tr${CODE_TRIES - c.tries === 1 ? 'y' : 'ies'} left.` }
    },

    /** The account for a proven email, made the first time; a name given later fills an empty one. */
    account(email: string, name = '', now = Date.now()): Account {
      const id = accountId(email), f = accountPath(id)
      const a = read<Account>(f) ?? { id, email, name: '', created: new Date(now).toISOString() }
      if (name && !a.name) a.name = name.slice(0, 120)
      writeFileSync(f, JSON.stringify(a))
      return a
    },

    byId: (id: string) => /^[A-Za-z0-9_-]{22}$/.test(id) ? read<Account>(accountPath(id)) : null,

    /** A login for an account: the token goes in the cookie, its hash stays here. */
    login(account: string, now = Date.now()): string {
      const token = randomBytes(32).toString('base64url')
      writeFileSync(loginPath(token), JSON.stringify({ account, expires: now + LOGIN_DAYS * DAY, rolled: now } satisfies Login))
      return token
    },

    /** Who a token belongs to; a login in use rolls forward, at most once a day. */
    whoIs(token: string | undefined, now = Date.now()): Account | null {
      if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null
      const f = loginPath(token), l = read<Login>(f)
      if (!l) return null
      if (l.expires < now) { rmSync(f); return null }
      if (now - l.rolled > DAY) writeFileSync(f, JSON.stringify({ ...l, expires: now + LOGIN_DAYS * DAY, rolled: now }))
      return read<Account>(accountPath(l.account))
    },

    logout(token: string | undefined) {
      if (token && /^[A-Za-z0-9_-]{43}$/.test(token) && existsSync(loginPath(token))) rmSync(loginPath(token))
    },
  }
}

export const readCookie = (header: string | undefined, name = COOKIE) =>
  (header ?? '').split(/;\s*/).find(c => c.startsWith(name + '='))?.slice(name.length + 1)
export const setCookie = (token: string, secure: boolean) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${LOGIN_DAYS * 86_400}${secure ? '; Secure' : ''}`
export const clearCookie = (secure: boolean) => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`
