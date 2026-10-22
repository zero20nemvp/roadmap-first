import { describe, expect, test } from 'claude-code/testing'

import { coachSection } from '../hooks/coach'
import { apply, briefChecks, emptySession, gaps, park, pieceCount, savingOf, stationOf, vagueDoneWhen, type Change, type Session } from '../hooks/engine'

const run = (s: Session, changes: Change[]) => {
  const r = apply(s, changes)
  expect(r.errors).toEqual([])
  return r.session
}

/** Redline up to the walk: 8 stage-1 features, 12 pieces, nothing argued. */
function redline(): Session {
  let s = run(emptySession(), [
    { op: 'name', name: 'Redline' },
    { op: 'idea', pitch: 'An AI that reads the contract before you sign it', who: 'Freelancers' },
    { op: 'job', when: 'a client sends me a contract', want: 'to know which clauses could hurt me', so: 'I don’t sign something that costs me money' },
    { op: 'job', when: 'I’ve found a bad clause', want: 'wording to ask for instead', so: 'I can push back' },
    { op: 'job', when: 'I push back', want: 'a firm email', so: 'I keep the client' },
    { op: 'pays', job: 'J1', who: 'Alex, a freelance designer', why: 'A lawyer costs £400', price: '£9 a contract' },
    { op: 'feature', job: 'J1', name: 'Paste a contract' },
    { op: 'feature', job: 'J1', name: 'Red-flag report' },
    { op: 'feature', job: 'J2', name: 'What to ask for instead' },
    { op: 'feature', job: 'J3', name: 'Pushback email' },
    { op: 'journey', steps: [{ text: 'Pastes the contract', feature: 'F1' }, { text: 'Reads the red flags', feature: 'F2' }, { text: 'Copies what to ask for' }] },
    { op: 'journey-ends-at-so', value: true },
  ])
  s = run(s, [
    { op: 'column', feature: 'F1', stage: 1 },
    { op: 'column', feature: 'F2', stage: 1 },
    { op: 'column', feature: 'F3', stage: 2 },
    { op: 'column', feature: 'F4', stage: 1 },
    { op: 'piece', name: 'Paste screen', kind: 'screen', features: ['F1'] },
    { op: 'piece', name: 'Red-flag prompt', kind: 'prompt', features: ['F2'] },
    { op: 'piece', name: 'Report page', kind: 'screen', features: ['F2', 'F3', 'F4'] },
    { op: 'piece', name: 'Email prompt', kind: 'prompt', features: ['F4'] },
    { op: 'piece', name: 'Wording prompt', kind: 'prompt', features: ['F3'] },
  ])
  return s
}

describe('the route', () => {
  test('a new session starts at the idea, and asks for it first', () => {
    const g = gaps(emptySession())
    expect(stationOf(emptySession())).toBe(0)
    expect(g[0]?.code).toBe('idea')
  })

  test('the station is the first one with a gap', () => {
    const s = redline()
    expect(stationOf(s)).toBe(4)
    expect(gaps(s)[0]?.code).toBe('pieces-confirm')
  })

  test('a parked gap stops blocking, and comes back as an unknown that needs a test', () => {
    const s = park(emptySession(), 'idea', 'Not sure what it is yet')
    expect(gaps(s).some(g => g.code === 'idea')).toBe(false)
    expect(gaps(s).some(g => g.code === 'test:U1')).toBe(true)
  })
})

describe('pieces', () => {
  test('shared pieces count once', () => {
    // F1 paste, F2 prompt + report, F4 email + report (shared): 4, not 5
    expect(pieceCount(redline())).toBe(4)
  })

  test('a cut saves only the pieces nothing else needs', () => {
    const s = redline()
    expect(savingOf(s, 'F4')).toBe(1)
    expect(savingOf(s, 'F2')).toBe(1)
  })

  test('each move after the first count is recorded with its price', () => {
    let s = run(redline(), [{ op: 'pieces-confirmed', value: true }])
    expect(s.moves).toEqual([{ label: 'First draft', delta: 4, kind: 'start' }])
    s = run(s, [{ op: 'column', feature: 'F3', stage: 1 }])
    expect(s.moves.at(-1)).toEqual({ label: '+ What to ask for instead', delta: 1, kind: 'add' })
    s = run(s, [{ op: 'argue', feature: 'F4', keep: false, reason: 'The wording is the hard part', stage: 2 }])
    expect(s.moves.at(-1)).toEqual({ label: '− Pushback email', delta: -1, kind: 'cut' })
    expect(pieceCount(s)).toBe(4)
  })
})

describe('stands alone', () => {
  test('a step with no feature is a pink gap, and one that needs a later stage too', () => {
    const s = run(redline(), [{ op: 'pieces-confirmed', value: true }])
    expect(stationOf(s)).toBe(5)
    expect(gaps(s).filter(g => g.station === 5).map(g => g.code)).toEqual(['step:3'])
    const moved = run(s, [{ op: 'step', n: 3, feature: 'F3' }])
    expect(gaps(moved).filter(g => g.station === 5).map(g => g.code)).toEqual(['step-out:3'])
    const fixed = run(moved, [{ op: 'column', feature: 'F3', stage: 1 }])
    expect(stationOf(fixed)).toBe(6)
  })
})

describe('arguing and stories', () => {
  const ready = () => run(redline(), [{ op: 'pieces-confirmed', value: true }, { op: 'step', n: 3, feature: 'F3' }, { op: 'column', feature: 'F3', stage: 1 }])

  test('every stage-1 feature has to be argued, with a reason', () => {
    const r = apply(ready(), [{ op: 'argue', feature: 'F1', keep: true, reason: '' }])
    expect(r.errors.length).toBe(1)
    expect(gaps(ready()).filter(g => g.station === 6).length).toBe(4)
  })

  test('a vague done-when is refused, a visible one passes', () => {
    expect(vagueDoneWhen('It works well')).toBe(true)
    expect(vagueDoneWhen('Fast and easy')).toBe(true)
    expect(vagueDoneWhen('Each flag quotes its clause and says why')).toBe(false)
  })

  test('a finished session has no gaps and passes the six checks', () => {
    let s = ready()
    s = run(s, ['F1', 'F2', 'F3'].map(f => ({ op: 'argue', feature: f, keep: true, reason: 'Needed for the journey' }) as Change))
    s = run(s, [{ op: 'argue', feature: 'F4', keep: false, reason: 'Alex can write the email', stage: 2 }])
    s = run(s, [
      { op: 'story', step: 1, text: 'As a freelancer, I want to paste a contract, so that I can check it.', done: 'A 20-page contract pastes in whole.' },
      { op: 'story', step: 2, text: 'As a freelancer, I want the red flags worst first, so that I know what matters.', done: 'Each flag quotes its clause and says why.' },
      { op: 'story', step: 3, text: 'As a freelancer, I want wording to ask for, so that I can push back.', done: 'Every flag has a replacement clause to copy.' },
      { op: 'test-cases', text: 'Three sample contracts, one nasty' },
      { op: 'small-enough', value: true },
    ])
    expect(gaps(s)).toEqual([])
    expect(stationOf(s)).toBe(9)
    expect(briefChecks(s).every(c => c.ok)).toBe(true)
  })
})

describe('the coach section', () => {
  test('it names the station and the one next gap', () => {
    const text = coachSection(redline(), 0)
    expect(text).toContain('exercise 4 of 8')
    expect(text).toContain('Confirm the piece count')
  })

  test('the stuck ladder climbs, and ends at parking', () => {
    expect(coachSection(redline(), 1)).toContain('simpler words')
    expect(coachSection(redline(), 9)).toContain('mcp__021__park')
  })

  test('exercise 6 makes Claude the visiting table', () => {
    const s = run(redline(), [{ op: 'pieces-confirmed', value: true }, { op: 'step', n: 3, feature: 'F3' }, { op: 'column', feature: 'F3', stage: 1 }])
    expect(coachSection(s, 0)).toContain('visiting table')
  })
})
