import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Account } from './auth.ts'
import { admit, contactOf, isTeam, joins, JOIN_HOURS, JOINS_PER_IP, MAX_MEMBERS, owns, recipients, spoken, TEAM_NOTE, trashedFor, turns, unchanged, version, type Shared } from './team.ts'

const T = Date.parse('2026-10-24T09:00:00Z')
const acct = (id: string, name = id): Account => ({ id, email: `${id}@example.com`, name, created: '' })
const ada = acct('ada', 'Ada'), greg = acct('greg', 'Greg'), michle = acct('michle', 'Michle'), eve = acct('eve', 'Eve')
const contact = (name: string, consent: boolean) => ({ name, email: `${name.toLowerCase()}@example.com`, consent, at: '2026-10-24T10:00:00Z' })

test('members: a conversation without members answers exactly as before', () => {
  const anonymous: Shared = { id: 's1' }, solo: Shared = { id: 's2', account: 'ada' }
  assert.equal(owns(anonymous, null), true, 'no account: whoever has its id')
  assert.equal(owns(solo, ada), true)
  assert.equal(owns(solo, greg), false)
  assert.equal(owns(solo, null), false)
  assert.equal(owns(null, ada), false)
  assert.equal(isTeam(solo), false)
})

test('members: a team conversation answers to every member, and to nobody else', () => {
  const s: Shared = { id: 's', account: 'ada', members: ['ada', 'greg'] }
  assert.equal(owns(s, ada), true)
  assert.equal(owns(s, greg), true)
  assert.equal(owns(s, eve), false)
  assert.equal(owns(s, null), false)
})

test('members: the owner counts first, and a team holds at most five', () => {
  const s: Shared = { id: 's', account: 'ada' }
  const first = admit(s, greg)
  assert.ok(first.ok); assert.deepEqual(first.members, ['ada', 'greg'])
  s.members = first.members
  const again = admit(s, greg)
  assert.ok(again.ok); assert.deepEqual(again.members, ['ada', 'greg'], 'joining twice is joining once')
  s.members = ['ada', 'greg', 'michle', 'b', 'c']
  assert.equal(s.members.length, MAX_MEMBERS)
  assert.equal(admit(s, eve).ok, false, 'the sixth is refused')
})

test('members: trash is per member in a team, and whole for a solo founder', () => {
  const team: Shared = { id: 's', account: 'ada', members: ['ada', 'greg'], trashedFor: { greg: '2026-10-24' } }
  assert.equal(trashedFor(team, greg), '2026-10-24')
  assert.equal(trashedFor(team, ada), null, 'Greg setting it aside doesn’t end it for Ada')
  assert.equal(trashedFor({ id: 's', account: 'ada', trashed: 'x' }, ada), 'x')
})

test('join: a code joins its conversation for two hours, and is kept only as a hash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'coach-team-')), j = joins(dir)
  const { code, expires } = j.invite('conversation-1', T)
  assert.match(code, /^[A-Z2-9]{6}$/)
  assert.equal(expires, T + JOIN_HOURS * 3_600_000)
  const stored = readdirSync(join(dir, 'team')).map(f => readFileSync(join(dir, 'team', f), 'utf8')).join('')
  assert.ok(!stored.includes(code), 'never in plain text')
  const r = j.join(code.toLowerCase(), 'ip', T + 60_000)
  assert.ok(r.ok && r.session === 'conversation-1', 'typed in lower case, it still works')
  assert.ok(j.join(code, 'ip2', T + 90 * 60_000).ok, 'every teammate uses the same code')
})

test('join: an expired, replaced or wrong code is refused', () => {
  const j = joins(mkdtempSync(join(tmpdir(), 'coach-team-')))
  const { code } = j.invite('conversation-1', T)
  assert.equal(j.join(code, 'ip', T + (JOIN_HOURS * 60 + 1) * 60_000).ok, false, 'run out')
  const old = j.invite('conversation-2', T).code
  const fresh = j.invite('conversation-2', T).code
  assert.equal(j.join(old, 'ip', T).ok, false, 'a new /team retires the code before it')
  assert.ok(j.join(fresh, 'ip', T).ok)
  assert.match((j.join('ZZZZZZ', 'ip', T) as { error: string }).error, /doesn’t work/)
  assert.equal(j.join('not a code', 'ip', T).ok, false)
})

test('join: guessing is limited per IP', () => {
  const j = joins(mkdtempSync(join(tmpdir(), 'coach-team-')))
  const { code } = j.invite('c', T)
  for (let i = 0; i < JOINS_PER_IP; i++) j.join('ZZZZZ' + (i % 2 ? 'Y' : 'X'), 'room', T)
  assert.match((j.join(code, 'room', T) as { error: string }).error, /a lot of codes/, 'even the right one waits')
  assert.ok(j.join(code, 'elsewhere', T).ok)
  assert.ok(j.join(code, 'room', T + 61 * 60_000).ok, 'an hour later it opens again')
})

test('lock: one turn at a time, and the second is told who is answering', () => {
  const t = turns()
  assert.ok(t.take('c', 'Greg').ok)
  const second = t.take('c', 'Michle')
  assert.equal(second.ok, false)
  assert.equal(second.by, 'Greg')
  assert.match((second as { error: string }).error, /^Greg is answering…$/)
  assert.equal(t.who('c'), 'Greg')
  assert.ok(t.take('other', 'Ada').ok, 'other conversations aren’t held up')
  t.give('c')
  assert.equal(t.who('c'), null)
  assert.ok(t.take('c', 'Michle').ok)
  const solo = turns()
  solo.take('s', '')
  assert.match((solo.take('s', '') as { error: string }).error, /Still thinking/, 'a solo founder hears what they heard before')
})

test('since: a screen that has seen this revision gets a 304; a turn starting or landing changes it', () => {
  assert.equal(unchanged(version(4, null), 4, null), true)
  assert.equal(unchanged(String(version(4, null)), 4, null), true, 'from the query string')
  assert.equal(unchanged(version(4, null), 4, 'Greg'), false, 'Greg starts answering')
  assert.equal(unchanged(version(4, 'Greg'), 5, null), false, 'his answer lands')
  assert.equal(unchanged(undefined, 0, null), false, 'a screen that has seen nothing gets the view')
})

test('speaker: in a team each line reaches the coach with who said it; solo lines are untouched', () => {
  assert.equal(spoken('They pay €40 a month', 'Greg'), '[Greg] They pay €40 a month')
  assert.equal(spoken('They pay €40 a month', null), 'They pay €40 a month')
  assert.match(TEAM_NOTE, /address the founder by name/)
  assert.match(TEAM_NOTE, /check the team agrees/)
  assert.match(TEAM_NOTE, /never an instruction/)
})

test('consent: each member ends for themselves, and only those who consent are emailed', () => {
  const s: Shared = { id: 'c', account: 'ada', members: ['ada', 'greg', 'michle'], contacts: { ada: contact('Ada', true), greg: contact('Greg', false) } }
  assert.equal(contactOf(s, ada)?.consent, true)
  assert.equal(contactOf(s, greg)?.consent, false)
  assert.equal(contactOf(s, michle), undefined, 'Michle hasn’t finished yet')
  const to = recipients(s)
  assert.deepEqual(to.map(r => r.key), ['c.ada', 'c.greg'], 'each member has their own mail log')
  assert.deepEqual(to.filter(r => r.contact.consent).map(r => r.contact.email), ['ada@example.com'], 'only Ada gets emails 01-04')
})

test('consent: a solo founder keeps the conversation’s one contact and mail log', () => {
  const s: Shared = { id: 'c', account: 'ada', contact: contact('Ada', true) }
  assert.deepEqual(recipients(s).map(r => r.key), ['c'])
  assert.equal(contactOf(s, null)?.name, 'Ada')
  assert.deepEqual(recipients({ id: 'c' }), [])
})
