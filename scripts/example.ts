// Builds the Redline example from the workshop's worked example, through the
// same changes the coach records, and renders its roadmap page and brief.
//   node scripts/example.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { apply, briefMarkdown, emptySession, gaps, renderPage, stationOf, type Change, type Evidence, type Session } from '../hooks/engine.ts'

const root = new URL('..', import.meta.url).pathname
let s: Session = emptySession()
let station = 0

function say(q: string, a: string, ev: Evidence, changes: Change[]) {
  const r = apply(s, changes)
  if (r.errors.length) throw new Error(r.errors.join('; '))
  s = r.session
  s.log.push({ at: '2026-10-22', station, q, a, ev })
}

station = 0
say('Say the idea in one breath. Who is it for?', 'An AI that reads the contract before you sign it, for freelancers.', 'evidence', [
  { op: 'name', name: 'Redline' },
  { op: 'idea', pitch: 'An AI that reads the contract before you sign it', who: 'Freelancers who sign client contracts' },
])

station = 1
say('When does Alex need this, and what does it get them?', 'When a client sends a contract, so they don’t sign something that costs money.', 'evidence', [
  { op: 'job', when: 'a client sends me a contract', want: 'to know which clauses could hurt me', so: 'I don’t sign something that costs me money' },
  { op: 'job', when: 'I’ve found a bad clause', want: 'wording to ask for instead', so: 'I can push back without a lawyer' },
  { op: 'job', when: 'I push back', want: 'an email that’s firm but friendly', so: 'I keep the client' },
  { op: 'job', when: 'I sign a lot of contracts', want: 'to see what I agreed to before', so: 'I stay consistent' },
  { op: 'job', when: 'the contract arrives as a PDF', want: 'to drop it in as it is', so: 'I don’t have to copy text' },
  { op: 'job', when: 'I work with a studio', want: 'my team to use it too', so: 'we all sign on the same terms' },
])

station = 2
say('Who would pay to have this done, today? Name them.', 'Alex, a freelance designer quoted £400 by a lawyer for a 20-page contract.', 'evidence', [
  { op: 'pays', job: 'J1', who: 'Alex, a freelance designer with a new client', why: 'One bad clause costs more than a check. Today it is £400 for a lawyer, or an evening of worry.' },
])
say('How much would Alex pay, per contract?', 'About £9 a contract, less than an hour of a lawyer.', 'assumption', [
  { op: 'pays', job: 'J1', price: '£9 a contract' },
  { op: 'unknown', text: 'Freelancers will pay £9 a contract.', test: 'Put a payment link in front of 10 freelancers. Do 3 pay?' },
])

station = 3
say('What does the product do, under each job?', 'Thirteen features across the six jobs.', 'evidence', [
  { op: 'feature', job: 'J1', name: 'Paste a contract' },
  { op: 'feature', job: 'J1', name: 'Tell it about you' },
  { op: 'feature', job: 'J1', name: 'Red-flag report' },
  { op: 'feature', job: 'J1', name: 'Pay per contract' },
  { op: 'feature', job: 'J2', name: 'What to ask for instead' },
  { op: 'feature', job: 'J3', name: 'Pushback email' },
  { op: 'feature', job: 'J4', name: 'Accounts and history' },
  { op: 'feature', job: 'J5', name: 'PDF upload' },
  { op: 'feature', job: 'J6', name: 'Team workspace' },
  { op: 'feature', job: 'J4', name: 'Your standard terms' },
  { op: 'feature', job: 'J1', name: 'Email me the report' },
  { op: 'feature', job: 'J4', name: 'Compare two versions' },
  { op: 'feature', job: 'J5', name: 'Browser extension' },
])
say('Walk me through J1, from the first thing Alex does.', 'Six steps, from opening Redline to copying what to ask for.', 'evidence', [
  { op: 'journey', steps: [
    { text: 'Opens Redline', feature: 'F1' },
    { text: 'Pastes the contract', feature: 'F1' },
    { text: 'Says their trade and country', feature: 'F2' },
    { text: 'Pays for this contract', feature: 'F4' },
    { text: 'Reads the red flags, worst first, and why each matters', feature: 'F3' },
    { text: 'Copies what to ask for instead, for each flag' },
  ] },
])
say('They’ve read the red flags. And then what happens?', 'They need to know what to ask for instead. That is where the job’s “so” is reached.', 'evidence', [
  { op: 'journey-ends-at-so', value: true },
])

station = 4
say('Which features does the journey need? Everything else, which column?', 'The room’s first draft: the AI can do it all anyway.', 'assumption', [
  ...['F1', 'F2', 'F3', 'F4', 'F6', 'F7', 'F8'].map(f => ({ op: 'column', feature: f, stage: 1 }) as Change),
  ...[['F11', 2], ['F10', 3], ['F12', 3], ['F9', 4], ['F13', 4]].map(([f, n]) => ({ op: 'column', feature: f, stage: n }) as Change),
  { op: 'piece', name: 'Paste screen', kind: 'screen', features: ['F1'] },
  { op: 'piece', name: 'Trade and country', kind: 'data', features: ['F2'] },
  { op: 'piece', name: 'Red-flag prompt', kind: 'prompt', features: ['F3'] },
  { op: 'piece', name: 'Report page', kind: 'screen', features: ['F3'] },
  { op: 'piece', name: 'Payment link', kind: 'service', features: ['F4'] },
  { op: 'piece', name: 'Pushback email prompt', kind: 'prompt', features: ['F6'] },
  { op: 'piece', name: 'Sign-in screen', kind: 'screen', features: ['F7'] },
  { op: 'piece', name: 'Account data', kind: 'data', features: ['F7'] },
  { op: 'piece', name: 'Sign-in service', kind: 'service', features: ['F7'] },
  { op: 'piece', name: 'Upload screen', kind: 'screen', features: ['F8'] },
  { op: 'piece', name: 'PDF reader', kind: 'service', features: ['F8'] },
])
say('That makes 11 pieces. Does that count look right to you?', 'Yes, 11.', 'evidence', [{ op: 'pieces-confirmed', value: true }])

station = 5
say('Walk it as Alex, touching only stage 1. Where do you get stuck?', 'Step 6: the report says what’s wrong, not what to ask for. Add F5 from J2.', 'evidence', [
  { op: 'column', feature: 'F5', stage: 1 },
  { op: 'piece', id: 'P4', name: 'Report page', kind: 'screen', features: ['F5'] },
  { op: 'piece', name: 'Wording prompt', kind: 'prompt', features: ['F5'] },
  { op: 'step', n: 6, feature: 'F5' },
])

writeFileSync(`${root}examples/redline/roadmap.json`, JSON.stringify(s, null, 2) + '\n')
console.log(`roadmap.json: station ${stationOf(s)}, ${gaps(s).length} gaps (the demo resumes here)`)

station = 6
say('Would Alex still pay without accounts?', 'Yes: pay per contract, no login needed.', 'assumption', [{ op: 'argue', feature: 'F7', keep: false, reason: 'Pay per contract, no login needed', stage: 3 }])
say('Would Alex still pay without PDF upload?', 'Yes: pasting the text works.', 'assumption', [
  { op: 'argue', feature: 'F8', keep: false, reason: 'Pasting the text works', stage: 2 },
  { op: 'unknown', text: 'Pasting text is fine; PDFs can wait.', test: 'Count how many people give up at the paste step.' },
])
say('Would Alex still pay without the pushback email?', 'Yes: the wording is the hard part; Alex can write the email.', 'evidence', [{ op: 'argue', feature: 'F6', keep: false, reason: 'The wording is the hard part; Alex can write the email', stage: 2 }])
say('Would Alex still pay without trade and country?', 'No: without them the flags are generic, and wrong.', 'evidence', [{ op: 'argue', feature: 'F2', keep: true, reason: 'Without trade and country the flags are generic, and wrong' }])
say('Would Alex still pay without the red-flag report?', 'No. It is the reason anyone pays.', 'evidence', [
  { op: 'argue', feature: 'F3', keep: true, reason: 'It is the reason anyone pays' },
  { op: 'argue', feature: 'F1', keep: true, reason: 'There is nothing to check without it' },
  { op: 'argue', feature: 'F4', keep: true, reason: 'It is how the job gets paid for' },
  { op: 'argue', feature: 'F5', keep: true, reason: 'The journey’s last step needs it' },
  { op: 'unknown', text: 'A plain-English why is enough to act on, without a lawyer.', test: 'After the report, ask: would you send a pushback based on this?' },
])
s.stageNames = { 1: 'Check a contract', 2: 'Push back', 3: 'Regulars', 4: 'Studios' }

station = 7
say('For each step: what would Alex see if it works?', 'Five stories, in journey order.', 'evidence', [
  { op: 'story', step: 1, text: 'As a freelancer, I want to open Redline and see where to paste, so that I can start without signing up.', done: 'The first screen has the paste box and nothing else to fill in.' },
  { op: 'story', step: 2, text: 'As a freelancer, I want to paste a contract’s text, so that I can check it without uploading files.', done: 'A 20-page contract pastes in whole.' },
  { op: 'story', step: 3, text: 'As a freelancer, I want to give my trade and country, so that the flags fit my work and my law.', done: 'Both are used in the check and shown on the report.' },
  { op: 'story', step: 4, text: 'As a freelancer, I want to pay for just this contract, so that I don’t need a subscription.', done: 'The report opens only after payment.' },
  { op: 'story', step: 5, text: 'As a freelancer, I want the risky clauses ranked worst first with a plain-English why, so that I know what matters.', done: 'Each flag quotes its clause and says why; the report says it isn’t legal advice.' },
  { op: 'story', step: 6, text: 'As a freelancer, I want wording to ask for instead of each flag, so that I can push back without a lawyer.', done: 'Every flag has a replacement clause to copy.' },
])

station = 8
say('Which contracts will you test with after every change?', 'Three sample contracts, one of them nasty.', 'evidence', [
  { op: 'test-cases', text: 'Three sample contracts, one of them nasty' },
])
say('Five features, six pieces. Small enough to build in a day?', 'Yes.', 'evidence', [{ op: 'small-enough', value: true }])

if (gaps(s).length) throw new Error('finished example still has gaps: ' + gaps(s).map(g => g.code).join(', '))
writeFileSync(`${root}examples/redline/finished.json`, JSON.stringify(s, null, 2) + '\n')

const vendor = ['three.min.js', 'd3.min.js', 'gsap.min.js', 'ScrollTrigger.min.js']
  .map(f => readFileSync(`${root}assets/vendor/${f}`, 'utf8'))
  .join('\n;\n')
const template = readFileSync(`${root}assets/roadmap.template.html`, 'utf8')
writeFileSync(`${root}examples/redline/roadmap.html`, renderPage(template, s, vendor, '22 Oct 2026'))
writeFileSync(`${root}examples/redline/brief.md`, briefMarkdown(s))
console.log('finished.json, roadmap.html and brief.md written')
