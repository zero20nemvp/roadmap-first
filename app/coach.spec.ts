import assert from 'node:assert/strict'
import { test } from 'node:test'
import { check } from '../web/report.ts'
import { apply, emptyWall, gaps, summary, toReport, TOOLS } from './coach.ts'

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

test('remove refuses to orphan, and ids are never reused', () => {
  const w = walked()
  assert.equal(apply(w, 'remove', { id: 'J1' }).ok, false)
  assert.equal(apply(w, 'remove', { id: 'F1' }).ok, true)
  assert.equal(apply(w, 'remove', { id: 'J1' }).ok, true)
  apply(w, 'add_job', { when: 'a', want: 'b', so: 'c', from: null })
  assert.equal(w.jobs[0].id, 'J2')
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
