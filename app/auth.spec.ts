import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { accountId, auth, CODE_TRIES, CODES_PER_EMAIL, readCookie, setCookie } from './auth.ts'

const fresh = () => { const dir = mkdtempSync(join(tmpdir(), 'coach-auth-')); return { dir, a: auth(dir) } }
const T = Date.parse('2026-10-24T09:00:00Z')

test('a code proves an email once, and is never kept in plain text', () => {
  const { dir, a } = fresh()
  const s = a.start('ada@example.com', '1.2.3.4', T)
  assert.ok(s.ok && /^\d{6}$/.test(s.code))
  const stored = readdirSync(join(dir, 'codes')).map(f => readFileSync(join(dir, 'codes', f), 'utf8')).join('')
  assert.ok(!stored.includes(s.code))
  assert.equal(a.verify('ada@example.com', ` ${s.code.slice(0, 3)} ${s.code.slice(3)} `, T + 60_000).ok, true, 'spaces pasted with it are fine')
  assert.equal(a.verify('ada@example.com', s.code, T + 60_000).ok, false, 'single use')
})

test('a code runs out after fifteen minutes, or after its tries', () => {
  const { a } = fresh()
  const s = a.start('ada@example.com', 'ip', T)
  assert.ok(s.ok)
  assert.equal(a.verify('ada@example.com', s.code, T + 16 * 60_000).ok, false)

  const t = a.start('ada@example.com', 'ip', T)
  assert.ok(t.ok)
  const wrong = t.code === '000000' ? '111111' : '000000'
  for (let i = 1; i < CODE_TRIES; i++) assert.match((a.verify('ada@example.com', wrong, T) as { error: string }).error, /left/)
  assert.match((a.verify('ada@example.com', wrong, T) as { error: string }).error, /last try/)
  assert.equal(a.verify('ada@example.com', t.code, T).ok, false, 'burnt, even with the right code')
})

test('codes are rate-limited per email', () => {
  const { a } = fresh()
  for (let i = 0; i < CODES_PER_EMAIL; i++) assert.ok(a.start('ada@example.com', 'ip' + i, T).ok)
  assert.equal(a.start('ada@example.com', 'another', T).ok, false)
  assert.ok(a.start('ada@example.com', 'another', T + 61 * 60_000).ok, 'an hour later it opens again')
  assert.equal(a.start('not an email', 'ip', T).ok, false)
})

test('an account is found by its email; a login keeps it for a year and rolls forward', () => {
  const { a } = fresh()
  const acct = a.account('ada@example.com', 'Ada', T)
  assert.equal(acct.id, accountId('ADA@example.com '))
  assert.equal(a.account('ada@example.com', 'Someone else', T).name, 'Ada', 'a name, once given, stays')
  const token = a.login(acct.id, T)
  assert.equal(a.whoIs(token, T + 300 * 86_400_000)?.email, 'ada@example.com', 'rolled forward on use')
  assert.equal(a.whoIs(token, T + 600 * 86_400_000)?.email, 'ada@example.com', 'still in, because it was used')
  assert.equal(a.whoIs(token, T + 1000 * 86_400_000), null, 'a year unused and it has gone')
  assert.equal(a.whoIs('nonsense'), null)
  const again = a.login(acct.id, T)
  a.logout(again)
  assert.equal(a.whoIs(again, T), null)
})

test('the cookie is httpOnly and reads back', () => {
  const c = setCookie('tok', true)
  assert.match(c, /HttpOnly/); assert.match(c, /SameSite=Lax/); assert.match(c, /Secure/)
  assert.equal(readCookie('a=b; coach_auth=tok; c=d'), 'tok')
  assert.equal(readCookie(undefined), undefined)
})
