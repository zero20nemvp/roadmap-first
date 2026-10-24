import { describe, expect, test } from 'claude-code/testing'

import example from '../examples/ticketing/report'
import { billable, check, eta, fromIntake, renderReport, type Report } from '../web/report'

const ticketing = (): Report => structuredClone(example)

describe('release rules', () => {
  test('the worked example passes', () => {
    expect(check(ticketing())).toEqual({ errors: [], warnings: [] })
  })

  test('the first release is Ground Zero, then R1, R2…', () => {
    const r = ticketing()
    r.releases[0].id = 'R0'
    expect(check(r).errors).toContain('Release 1 is R0; it should be GZ')
  })

  test('every release completes a job', () => {
    const r = ticketing()
    r.releases[1].completes = []
    expect(check(r).errors.some(e => e.startsWith('R1 completes no job'))).toBe(true)
  })

  test('a completed job needs a shipped feature', () => {
    const r = ticketing()
    r.releases[0].completes = ['J2']
    expect(check(r).errors).toContain('GZ says it completes J2, but no feature for J2 has shipped by then')
  })

  test('releases carry a target month and stack in time', () => {
    const r = ticketing()
    r.releases[1].month = '2027-01-15'
    r.releases[2].month = '2026-10'
    const { errors } = check(r)
    expect(errors.some(e => e.startsWith('R1 needs a target month'))).toBe(true)
    expect(errors.some(e => e.startsWith('R2 (2026-10) comes before'))).toBe(true)
  })

  test('statuses are the four the flight plan knows', () => {
    const r = ticketing()
    r.releases[1].status = 'Failed' as never
    r.releases[2].status = 'Next'
    const { errors } = check(r)
    expect(errors.some(e => e.includes('"Failed" is not one of'))).toBe(true)
    expect(errors).toContain('Only one release can be Next: the one being built now')
  })

  test('a story ships once', () => {
    const r = ticketing()
    r.releases[1].stories.push('S1')
    expect(check(r).errors).toContain('S1 ships in both GZ and R1')
  })

  test('Ground Zero larger than one job is a warning, not an error', () => {
    const r = ticketing()
    r.releases[0].completes = ['J1', 'J2']
    r.releases[0].stories.push('S4')
    r.releases[1].stories = []
    r.releases[1].completes = ['J2']
    const { errors, warnings } = check(r)
    expect(errors).toEqual([])
    expect(warnings).toContain('Ground Zero completes 2 jobs; the smallest valid Ground Zero completes one')
  })
})

describe('report', () => {
  test('a paid workaround makes Ground Zero billable', () => {
    expect(billable(ticketing()).map(w => w.id)).toEqual(['W1'])
  })

  test('ends in a flight plan with waypoints, ETAs and statuses', () => {
    const html = renderReport(ticketing())
    const plan = html.slice(html.indexOf('id="flight-plan"'))
    expect(html.indexOf('id="flight-plan"')).toBeGreaterThan(html.indexOf('The jobs, and what'))
    for (const s of ['GZ', 'R3', 'Nov 2026', 'May 2027', 'Next', 'Planned', 'Done when']) expect(plan.includes(s)).toBe(true)
    expect(html.includes('Ground Zero</b> is billable')).toBe(true)
  })

  test('escapes what founders wrote', () => {
    const r = ticketing()
    r.problems[0].text = '<script>alert(1)</script>'
    expect(renderReport(r).includes('<script>alert')).toBe(false)
  })

  test('month names', () => {
    expect(eta('2027-01')).toBe('Jan 2027')
  })

  test('an intake seeds one item per line, and nothing more', () => {
    const r = fromIntake({
      name: 'Sam', email: 'sam@example.com', consent: true, product: 'Doorlist', who: 'promoters',
      problems: '- data stuck in the platform\n\nslow door', workarounds: 'pay 10%', jobs: '', features: 'checkout',
    })
    expect(r.problems.map(p => p.text)).toEqual(['data stuck in the platform', 'slow door'])
    expect(r.workarounds).toEqual([{ id: 'W1', problem: 'P1', text: 'pay 10%' }])
    expect(r.jobs).toEqual([])
    expect(r.releases).toEqual([])
  })
})
