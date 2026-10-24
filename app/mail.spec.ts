import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { due, facilitatorEmail, parseTemplate, seriesEmail, SERIES, toHtml } from './mail.ts'

const DAY = 86_400_000
const at = (d: number) => new Date(Date.UTC(2026, 9, 24) + d * DAY).toISOString()

test('the series: 01 first, then each after the one before, by its days', () => {
  const now = Date.parse(at(0))
  assert.equal(due({ sent: {} }, now), '01')
  assert.equal(due({ sent: { '01': at(0) } }, Date.parse(at(2.9))), null)
  assert.equal(due({ sent: { '01': at(0) } }, Date.parse(at(3))), '02')
  assert.equal(due({ sent: { '01': at(0), '02': at(3) } }, Date.parse(at(6))), null)
  assert.equal(due({ sent: { '01': at(0), '02': at(3) } }, Date.parse(at(7))), '03')
  assert.equal(due({ sent: { '01': at(0), '02': at(3), '03': at(7), '04': at(11) } }, Date.parse(at(30))), null)
  assert.equal(due({ sent: {}, stopped: at(0) }, now), null, 'stopped means stopped')
})

test('every email in docs/emails reads, and fills with no placeholder left over', () => {
  const dir = new URL('../docs/emails/', import.meta.url)
  const files = readdirSync(dir).filter(f => f.endsWith('.md')).sort()
  assert.deepEqual(files.map(f => f.slice(0, 2)), SERIES.map(s => s.key))
  for (const f of files) {
    const t = parseTemplate(f.slice(0, 2), readFileSync(new URL(f, dir), 'utf8'))
    const e = seriesEmail(t, 'ada@example.com', { name: 'Ada', product: 'Doorlist', report_link: 'https://x/roadmap/abc', facilitator: 'Delaney', booking_link: 'https://x/book' }, 'https://x/stop/abc')
    assert.doesNotMatch(e.subject + e.text + e.html, /\{\{|\}\}|^---/m, f)
    assert.match(e.text, /https:\/\/x\/stop\/abc/, `${f} can be stopped`)
    assert.match(e.html, /href="https:\/\/x\/stop\/abc"/)
  }
})

test('email 01 links the founder’s roadmap', () => {
  const t = parseTemplate('01', readFileSync(new URL('../docs/emails/01-your-report.md', import.meta.url), 'utf8'))
  const e = seriesEmail(t, 'ada@example.com', { name: 'Ada', product: 'Doorlist', report_link: 'https://x/roadmap/abc', facilitator: 'Delaney', booking_link: '' }, 'https://x/stop/abc')
  assert.equal(e.subject, 'Your roadmap-first report: Doorlist')
  assert.match(e.html, /<a href="https:\/\/x\/roadmap\/abc"[^>]*>open your flight plan<\/a>/)
  assert.match(e.text, /Hi Ada,/)
})

test('what founders wrote is escaped in HTML', () => {
  assert.match(toHtml('**<script>x</script>**'), /<b>&lt;script&gt;x&lt;\/script&gt;<\/b>/)
  const f = facilitatorEmail('db@zero2one.ee', { name: '<b>Ada</b>', email: 'ada@example.com', consent: true, product: 'Doorlist', reportLink: 'https://x/r', adminLink: 'https://x/admin', hasPlan: true })
  assert.doesNotMatch(f.html, /<b><b>Ada/)
})
