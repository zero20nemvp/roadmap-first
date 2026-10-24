import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { check } from '../web/report.ts'
import { renderRoadmap } from '../web/roadmap.ts'
import { apply, CUT_SCHEMA, cutPrompt, emptyWall, fromCut, gaps, live, settle, summary, toReport, TOOLS, trash, untrash } from './coach.ts'

test('the end of a conversation renders as the roadmap website, in v2 words only', () => {
  const template = readFileSync(new URL('../web/roadmap.template.html', import.meta.url), 'utf8')
  assert.doesNotMatch(template, /stage 1|pieces/i)
  const w = walked()
  const { report } = fromCut(w, {
    pitch: 'Ticketing where the promoter keeps the data',
    stories: [{ id: 'S1', feature: 'F1', text: 'A buyer can pay for a ticket', done: 'a test payment lands' }],
    releases: [{ id: 'GZ', month: '2026-11', completes: ['J1'], stories: ['S1'], price: null }],
  }, { name: 'Ada', email: 'ada@example.com' })
  const html = renderRoadmap(template, report, { unknowns: w.unknowns, chat: [] }, '<script src="/roadmap-vendor.js"></script>')
  assert.match(html, /<title>Doorlist Roadmap<\/title>/)
  assert.match(html, /<script src="\/roadmap-vendor.js"><\/script>/)
  assert.doesNotMatch(html, /__021_/)
  assert.doesNotMatch(html, /ada@example\.com/, 'the email stays off the page')
})

test('a cut flight plan becomes a checked report: Ground Zero next, the rest planned', () => {
  const w = walked()
  const founder = { name: 'Ada', email: 'ada@example.com' }
  const good = fromCut(w, {
    pitch: 'Doorlist sells tickets for independent promoters, who keep their buyers.',
    stories: [{ id: 'S1', feature: 'F1', text: 'A buyer can pay for a ticket', done: 'a test payment lands' }],
    releases: [{ id: 'GZ', month: '2026-11', completes: ['J1'], stories: ['S1'], price: 'they pay 10% per ticket today' }],
  }, founder)
  assert.deepEqual(good.errors, [])
  assert.equal(good.report.releases[0].status, 'Next')
  assert.equal(good.report.releases[0].price, 'they pay 10% per ticket today')
  assert.equal(good.report.product.pitch.startsWith('Doorlist'), true)

  const bad = fromCut(w, { pitch: '', stories: [], releases: [{ id: 'GZ', month: 'soon', completes: ['J9'], stories: [], price: null }] }, founder)
  assert.ok(bad.errors.length >= 2, 'a bad month and an unknown job are caught')
  assert.equal('price' in bad.report.releases[0], false)
})

test('the cut starts next month and its schema is strict', () => {
  assert.match(cutPrompt(walked(), new Date('2026-12-15')), /Ground Zero can start in 2027-01/)
  const walk = (s: Record<string, unknown>): void => {
    if (s.type === 'object') { assert.equal(s.additionalProperties, false); assert.deepEqual(s.required, Object.keys(s.properties as object)); Object.values(s.properties as object).forEach(walk) }
    if (s.type === 'array') walk(s.items as Record<string, unknown>)
  }
  walk(CUT_SCHEMA as unknown as Record<string, unknown>)
})

function walked() {
  const w = emptyWall()
  apply(w, 'set_product', { name: 'Doorlist', who: 'independent promoters' })
  apply(w, 'add_problem', { text: 'The platform keeps the guest list' })
  apply(w, 'add_workaround', { problem: 'P1', text: 'Pay a big platform and export what they allow', pays: '10% per ticket' })
  apply(w, 'add_job', { when: 'I announce an event', want: 'to sell tickets', so: 'I keep the buyers', from: 'W1' })
  apply(w, 'add_feature', { job: 'J1', name: 'Ticket checkout' })
  return w
}

test('steps open in order, and only when the one before is done', () => {
  const w = emptyWall()
  assert.equal(apply(w, 'go_to_step', { step: 1 }).ok, false)
  apply(w, 'set_product', { name: 'Doorlist', who: 'promoters' })
  assert.equal(apply(w, 'go_to_step', { step: 1 }).ok, true)
  apply(w, 'add_problem', { text: 'slow door' })
  assert.equal(apply(w, 'go_to_step', { step: 3 }).ok, false, 'a problem without a workaround holds step 2')
  apply(w, 'add_workaround', { problem: 'P1', text: 'a printed list', pays: null })
  assert.equal(apply(w, 'go_to_step', { step: 3 }).ok, true)
  apply(w, 'add_job', { when: 'guests arrive', want: '', so: 'the queue moves', from: null })
  assert.deepEqual(gaps(w, 3), ['J1 needs all three parts: when, want and so.'])
  assert.equal(apply(w, 'go_to_step', { step: 4 }).ok, false)
  apply(w, 'revise', { id: 'J1', text: null, when: null, want: 'to check them in', so: null, pays: null })
  assert.equal(apply(w, 'go_to_step', { step: 5 }).ok, false, 'a job with no feature holds the end')
  apply(w, 'add_feature', { job: 'J1', name: 'QR scan' })
  assert.equal(apply(w, 'go_to_step', { step: 5 }).ok, true)
  assert.equal(apply(w, 'go_to_step', { step: 2 }).ok, true, 'going back is always allowed')
})

test('links must point at something that exists', () => {
  const w = emptyWall()
  assert.equal(apply(w, 'add_workaround', { problem: 'P9', text: 'x', pays: null }).ok, false)
  assert.equal(apply(w, 'add_feature', { job: 'J1', name: 'x' }).ok, false)
  assert.equal(apply(w, 'add_job', { when: 'a', want: 'b', so: 'c', from: 'W3' }).ok, false)
})

test('a paid workaround is flagged as billable', () => {
  const w = emptyWall()
  apply(w, 'add_problem', { text: 'p' })
  const r = apply(w, 'add_workaround', { problem: 'P1', text: 'an agency', pays: '£400 a month' })
  assert.ok(r.ok && r.note.includes('billable'))
})

test('nothing on the wall is deleted: remove puts it in the trash with what hangs off it', () => {
  const w = walked()
  const r = apply(w, 'remove', { id: 'J1' })
  assert.ok(r.ok && r.note.includes('J1, F1'))
  assert.equal(w.jobs.length, 1, 'still on the wall, set aside')
  assert.ok(w.jobs[0].trashed && w.jobs[0].trashed === w.features[0].trashed, 'stamped alike')
  assert.equal(live(w).jobs.length, 0)
  assert.equal(live(w).features.length, 0)
  assert.equal(apply(w, 'add_feature', { job: 'J1', name: 'x' }).ok, false, 'nothing hangs from the trash')
  assert.equal(apply(w, 'revise', { id: 'J1', text: null, when: 'x', want: null, so: null, pays: null }).ok, false)
  apply(w, 'add_job', { when: 'a', want: 'b', so: 'c', from: null })
  assert.equal(w.jobs[1].id, 'J2', 'ids are never reused')
})

test('untrash brings back exactly what went with it', () => {
  const w = walked()
  apply(w, 'add_workaround', { problem: 'P1', text: 'a spreadsheet', pays: null })
  trash(w, 'W2', '2026-10-24T08:00:00.000Z')
  trash(w, 'P1', '2026-10-24T09:00:00.000Z')
  assert.deepEqual(w.workarounds.map(x => x.trashed), ['2026-10-24T09:00:00.000Z', '2026-10-24T08:00:00.000Z'])
  assert.equal(untrash(w, 'W1').ok, false, 'its problem is in the trash')
  assert.ok(untrash(w, 'P1').ok)
  assert.equal(w.problems[0].trashed, undefined)
  assert.equal(w.workarounds[0].trashed, undefined, 'W1 went with P1, so it comes back with it')
  assert.ok(w.workarounds[1].trashed, 'W2 was trashed on its own before, so it stays')
  assert.equal(untrash(w, 'P1').ok, false, 'not in the trash')
  assert.equal(trash(w, 'P9').ok, false)
})

test('the coach, the gates and the report see only what is not in the trash', () => {
  const w = walked()
  trash(w, 'W1')
  assert.deepEqual(gaps(w, 2), ['P1 has no workaround yet. If they put up with it, record that as the workaround; if the founder can\'t say, park it.'])
  assert.match(summary(w), /In the trash.*W1 Pay a big platform/)
  assert.doesNotMatch(summary(w), /W1 workaround/)
  const r = toReport(w, { name: 'Sam', email: 'sam@example.com' })
  assert.equal(r.workarounds.length, 0)
  assert.equal(r.jobs[0].from, undefined, 'the link to a trashed workaround is dropped from the report')
  assert.equal(w.jobs[0].from, 'W1', 'but kept on the wall, for when it comes back')
  assert.doesNotMatch(cutPrompt(w), /trash|W1/, 'the flight plan is cut from what is left')
})

test('a wall the founder changes steps back to the first step that is open again', () => {
  const w = walked()
  apply(w, 'go_to_step', { step: 5 })
  assert.equal(w.step, 5)
  trash(w, 'F1')
  settle(w)
  assert.equal(w.step, 4)
  untrash(w, 'F1')
  settle(w)
  assert.equal(w.step, 4, 'moving on again is the coach\'s, with the founder')
})

test('revise clears a price with an empty string', () => {
  const w = walked()
  apply(w, 'revise', { id: 'W1', text: null, when: null, want: null, so: null, pays: '' })
  assert.equal(w.workarounds[0].pays, undefined)
})

test('the wall summary names what is still open', () => {
  const w = emptyWall()
  apply(w, 'set_product', { name: 'Doorlist', who: 'promoters' })
  apply(w, 'go_to_step', { step: 1 })
  assert.match(summary(w), /Still open on this step: No problem is recorded yet/)
})

test('a finished wall becomes a report the report run can take', () => {
  const r = toReport(walked(), { name: 'Sam', email: 'sam@example.com' })
  assert.equal(r.version, 2)
  assert.equal(r.workarounds[0].pays, '10% per ticket')
  assert.equal(r.jobs[0].from, 'W1')
  // No releases yet: the report run adds stories and releases.
  assert.deepEqual(check(r).errors, ['There are no releases: a flight plan starts at Ground Zero'])
})

test('every tool is strict, with every property required', () => {
  for (const t of TOOLS) {
    assert.equal(t.strict, true)
    assert.deepEqual(t.input_schema.required, Object.keys(t.input_schema.properties))
    assert.equal(t.input_schema.additionalProperties, false)
  }
})
