// The coach's state and the rules that decide what is still missing.
// Pure: no engine calls, so the tests and the render script use it as is.

export type Evidence = 'evidence' | 'assumption'
export type StageNo = 1 | 2 | 3 | 4
export type Column = StageNo | 'later'
export type PieceKind = 'screen' | 'prompt' | 'data' | 'service'

export type Job = { id: string; when: string; want: string; so: string }
export type Feature = {
  id: string
  job: string
  name: string
  pieces: string[]
  stage: Column | null
  argued?: { keep: boolean; reason: string }
  /** Features this one can't work without; drafted for the later stages. */
  needs?: string[]
}
export type Piece = { id: string; name: string; kind: PieceKind }
export type Step = { n: number; text: string; feature?: string }
export type Story = { step: number; feature: string; text: string; done: string }
export type Unknown = { id: string; text: string; test: string; from: string }
export type LogEntry = { at: string; station: number; q: string; a: string; ev: Evidence }
export type Move = { label: string; delta: number; kind: 'start' | 'add' | 'cut' }

export type Session = {
  version: 1
  name: string
  idea: { pitch: string; who: string } | null
  jobs: Job[]
  pays: { job: string; who: string; why: string; price: string } | null
  features: Feature[]
  journey: Step[]
  journeyEndsAtSo: boolean
  pieces: Piece[]
  piecesConfirmed: boolean
  stageNames: Partial<Record<StageNo, string>>
  stories: Story[]
  testCases: string
  smallEnough: boolean
  depsConfirmed: boolean
  sketchOrdered: boolean
  unknowns: Unknown[]
  parked: string[]
  moves: Move[]
  log: LogEntry[]
}

export const emptySession = (): Session => ({
  version: 1,
  name: '',
  idea: null,
  jobs: [],
  pays: null,
  features: [],
  journey: [],
  journeyEndsAtSo: false,
  pieces: [],
  piecesConfirmed: false,
  stageNames: {},
  stories: [],
  testCases: '',
  smallEnough: false,
  depsConfirmed: false,
  sketchOrdered: false,
  unknowns: [],
  parked: [],
  moves: [],
  log: [],
})

/** Reads a saved session, filling any field an older file lacks. */
export const loadSession = (text: string): Session => ({ ...emptySession(), ...(JSON.parse(text) as Partial<Session>) })

export type Station = { n: number; name: string; short: string; goal: string; done: string; minutes: number }

export const STATIONS: readonly Station[] = [
  { n: 0, name: 'Your idea', short: 'Idea', goal: 'Say the idea in one breath, and who it is for.', done: 'A one-line idea and the person it is for', minutes: 3 },
  { n: 1, name: 'Write the jobs', short: 'Jobs', goal: 'Write the jobs your customer wants done: When…, I want…, so….', done: '5 to 8 jobs, none of them a feature in disguise', minutes: 10 },
  { n: 2, name: 'Pick the job that pays', short: 'Pays', goal: 'Pick the one job someone would pay for first, and name them.', done: 'One job marked, with a real person who would pay today', minutes: 5 },
  { n: 3, name: 'Features and the journey', short: 'Journey', goal: 'Put features under each job, and write the journey for the job that pays.', done: 'Features under every job, and a journey that ends at the job’s “so”', minutes: 15 },
  { n: 4, name: 'Draft stage 1 and size it', short: 'Size', goal: 'Put every feature in a column, and count stage 1 in pieces.', done: 'Every feature has a column, and stage 1 has a confirmed piece count', minutes: 10 },
  { n: 5, name: 'Does it stand alone?', short: 'Walk', goal: 'Walk the journey touching only stage 1.', done: 'No journey step without a stage-1 feature', minutes: 5 },
  { n: 6, name: 'Argue it down', short: 'Argue', goal: 'For each stage-1 feature: would they still pay without it?', done: 'Every stage-1 feature kept or moved, with your reason', minutes: 10 },
  { n: 7, name: 'Write stage 1’s stories', short: 'Stories', goal: 'One story per journey step, each with “done when”.', done: 'Every step has a story, and every “done when” can be checked', minutes: 10 },
  { n: 8, name: 'Write the brief', short: 'Brief', goal: 'Fill in the brief and pass the facilitator’s check.', done: 'All six brief checks pass, and every unknown has a test', minutes: 5 },
  { n: 9, name: 'Sketch the rest', short: 'Sketch', goal: 'Group everything outside stage 1 into later stages, in pencil.', done: 'Every later stage is named, none needs a stage after it, and you chose the order', minutes: 5 },
]

/** The last station; a session past it is complete. */
export const LAST = STATIONS.length - 1
export const DONE = STATIONS.length

export const minutesLeft = (station: number): number =>
  STATIONS.filter(st => st.n >= station).reduce((sum, st) => sum + st.minutes, 0)

export type Gap = { station: number; code: string; text: string; why: string }

const VAGUE = /\b(works?( well)?|fast|quick(ly)?|easy|easily|good|properly|nice|intuitive|seamless(ly)?|user[- ]friendly|smooth(ly)?|better|robust)\b/i
const CONCRETE = /\d|\b(shows?|says?|quotes?|opens?|lists?|has|have|is used|are used|appears?|sends?|names?|counts?|copy|copies)\b/i

/** A “done when” nobody could check by looking at the result. */
export const vagueDoneWhen = (done: string): boolean =>
  done.trim().length < 12 || (VAGUE.test(done) && !CONCRETE.test(done))

export const stage1 = (s: Session): Feature[] => s.features.filter(f => f.stage === 1)

/** Pieces of a set of features, shared ones counted once. */
export const piecesOf = (s: Session, features: readonly Feature[]): Piece[] => {
  const ids = new Set(features.flatMap(f => f.pieces))
  return s.pieces.filter(p => ids.has(p.id))
}

export const pieceCount = (s: Session): number => piecesOf(s, stage1(s)).length

/** What cutting one feature would save: the pieces nothing else in stage 1 needs. */
export const savingOf = (s: Session, featureId: string): number => {
  const kept = new Set(stage1(s).filter(f => f.id !== featureId).flatMap(f => f.pieces))
  const f = s.features.find(x => x.id === featureId)
  return f ? new Set(f.pieces.filter(p => !kept.has(p))).size : 0
}

export const payingJob = (s: Session): Job | undefined => s.jobs.find(j => j.id === s.pays?.job)

/** Every gap, in the order the coach works them. Zero gaps means done. */
export function gaps(s: Session): Gap[] {
  const out: Gap[] = []
  const add = (station: number, code: string, text: string, why: string) => {
    if (!s.parked.includes(code)) out.push({ station, code, text, why })
  }

  // 0 · idea
  if (!s.idea?.pitch) add(0, 'idea', 'The idea in one sentence', 'Everything else hangs off it.')
  if (!s.idea?.who) add(0, 'who', 'Who it is for, as a real kind of person', 'Jobs are written from their side.')

  // 1 · jobs
  if (s.jobs.length < 3) add(1, 'jobs', `More jobs: ${s.jobs.length} so far, aim for 5 to 8`, 'You can only pick the job that pays from several.')
  for (const j of s.jobs) {
    if (!j.when || !j.want || !j.so) add(1, `job-shape:${j.id}`, `${j.id} needs all of When…, I want…, so…`, 'The “so” is where the journey has to end.')
  }

  // 2 · the job that pays
  if (!s.pays) add(2, 'pays', 'The one job someone would pay for first', 'Stage 1 is cut from this job.')
  else {
    if (!payingJob(s)) add(2, 'pays-job', 'The paying job has to be one of your jobs', 'It anchors the journey.')
    if (!s.pays.who) add(2, 'pays-who', 'A real person or business who would pay today', 'A named payer is evidence; “people” is a guess.')
    if (!s.pays.why) add(2, 'pays-why', 'Why they would pay, and what they do instead now', 'What they do now is your price’s competition.')
    if (!s.pays.price) add(2, 'pays-price', 'What they would pay, roughly', 'The brief needs it, and the price has to cover running costs.')
  }

  // 3 · features and the journey
  for (const j of s.jobs) {
    if (!s.features.some(f => f.job === j.id)) add(3, `features:${j.id}`, `Features under ${j.id}`, 'Every job needs at least one thing the product does.')
  }
  if (s.journey.length < 3) add(3, 'journey', `The journey for the paying job: ${s.journey.length} steps so far, aim for 5 to 10`, 'Stage 1 is whatever this journey needs.')
  else if (!s.journeyEndsAtSo) add(3, 'journey-end', 'Does the journey end at the job’s “so”? Ask: and then what happens?', 'It often ends one step past the obvious answer.')

  // 4 · columns and pieces
  for (const f of s.features) {
    if (f.stage === null) add(4, `column:${f.id}`, `A column for ${f.id} ${f.name}: stage 1, 2, 3 or later`, 'Everything left out has to name its stage.')
  }
  for (const f of stage1(s)) {
    if (f.pieces.length === 0) add(4, `pieces:${f.id}`, `The pieces ${f.id} ${f.name} needs`, 'A piece is one screen, prompt, kind of data or outside service.')
  }
  if (stage1(s).length > 0 && stage1(s).every(f => f.pieces.length > 0) && !s.piecesConfirmed) {
    add(4, 'pieces-confirm', `Confirm the piece count: ${pieceCount(s)} pieces`, 'Claude drafted the pieces; the count is yours to agree.')
  }

  // 5 · stands alone
  for (const st of s.journey) {
    const f = s.features.find(x => x.id === st.feature)
    if (!f) add(5, `step:${st.n}`, `Step ${st.n} (“${st.text}”) has no feature under it`, 'A step with nothing under it is a pink gap.')
    else if (f.stage !== 1) add(5, `step-out:${st.n}`, `Step ${st.n} needs ${f.id}, which is in ${columnName(f.stage)}`, 'Stage 1 has to work without anything after it.')
  }

  // 6 · argue it down: features no journey step touches first, they are the likeliest cuts
  const touched = new Set(s.journey.map(st => st.feature))
  const toArgue = stage1(s).filter(f => !f.argued)
  for (const f of [...toArgue.filter(f => !touched.has(f.id)), ...toArgue.filter(f => touched.has(f.id))]) {
    const untouched = !touched.has(f.id)
    add(6, `argue:${f.id}`, `Would they still pay without ${f.id} ${f.name}?${untouched ? ' (no journey step uses it)' : ''}`, untouched ? 'No step of the journey touches it, so it is the likeliest cut. A yes moves it out.' : 'A yes moves it out of stage 1.')
  }

  // 7 · stories
  for (const st of s.journey) {
    const story = s.stories.find(x => x.step === st.n)
    if (!story) add(7, `story:${st.n}`, `A story for step ${st.n}: As a…, I want to…, so that…`, 'Each story is one thing to build.')
    else if (vagueDoneWhen(story.done)) add(7, `done:${st.n}`, `A “done when” for step ${st.n} you could check by looking`, '“Works well” can’t be checked; “quotes the clause” can.')
  }

  // 8 · the brief and the facilitator's check
  if (!s.testCases) add(8, 'tests', 'The test cases you will run after every change', 'Three real examples, one of them nasty.')
  if (!s.smallEnough) add(8, 'small', `Small enough to build in a day? ${stage1(s).length} features, ${pieceCount(s)} pieces`, 'If not, argue it down again.')
  for (const u of s.unknowns) {
    if (!u.test) add(8, `test:${u.id}`, `How you would test: “${u.text}”`, 'An assumption with no test stays a guess.')
  }

  // 9 · sketch the rest: in pencil, but in an order that can be built
  const rest = s.features.filter(f => f.stage !== 1 && f.stage !== null)
  if (rest.length) {
    const used = ([2, 3, 4] as StageNo[]).filter(n => rest.some(f => f.stage === n))
    for (const n of used) {
      if (n > 2 && !used.includes((n - 1) as StageNo)) add(9, `stage-gap:${n - 1}`, `Stage ${n - 1} is empty but stage ${n} isn’t: move stage ${n} up, or fill stage ${n - 1}`, 'Stages are built in order, one after another.')
    }
    if (!s.depsConfirmed) add(9, 'deps', 'Confirm what each later feature needs before it can work (Claude drafts it)', 'A stage can only use what is built before it.')
    for (const f of rest) {
      for (const id of f.needs ?? []) {
        const g = s.features.find(x => x.id === id)
        if (g && rank(g.stage) > rank(f.stage)) add(9, `order:${f.id}:${g.id}`, `${f.id} ${f.name} (${columnName(f.stage)}) needs ${g.id} ${g.name}, which is in ${columnName(g.stage)}`, 'A stage that needs a later one can’t be built: move one of them.')
      }
    }
    const unnamed = used.filter(n => !s.stageNames[n])
    if (unnamed.length) add(9, 'stage-names', `Names for ${unnamed.map(n => `stage ${n} (${rest.filter(f => f.stage === n).map(f => f.name).join(', ')})`).join('; ')}, from the job each unlocks`, 'A stage is sold by what it lets customers do.')
    if (!s.sketchOrdered) add(9, 'sketch-order', 'Which of the later stages would customers pay for next?', 'The order is a bet on value, so it is yours to make.')
  }
  return out
}

/** Where a column sits in build order; no column sorts last. */
const rank = (c: Column | null): number => (c === null ? 99 : c === 'later' ? 5 : c)

/** The first station with a gap; DONE when every gap is filled. */
export const stationOf = (s: Session): number => gaps(s)[0]?.station ?? DONE

export const isComplete = (s: Session): boolean => gaps(s).length === 0

export type BriefCheck = { label: string; ok: boolean }

/** The facilitator's six sign-off checks, from the workshop. */
export function briefChecks(s: Session): BriefCheck[] {
  const g = gaps(s)
  const none = (prefix: string) => !g.some(x => x.code.startsWith(prefix))
  return [
    { label: 'A real person who pays', ok: !!s.pays?.who },
    { label: 'One job, and why they’d pay for it', ok: !!s.pays?.why && !!payingJob(s) },
    { label: 'Every journey step has a story', ok: s.journey.length > 0 && none('story:') },
    { label: 'Every story has a “done when”', ok: s.stories.length > 0 && none('done:') },
    { label: 'Everything left out names its stage', ok: s.features.length > 0 && none('column:') },
    { label: 'Small enough to build in a day', ok: s.smallEnough },
  ]
}

export const columnName = (c: Column | null): string => (c === null ? 'no column' : c === 'later' ? 'Later' : `Stage ${c}`)

// ── changes ────────────────────────────────────────────────────────────────

export type Change =
  | { op: 'name'; name: string }
  | { op: 'idea'; pitch?: string; who?: string }
  | { op: 'job'; id?: string; when: string; want: string; so: string }
  | { op: 'remove-job'; id: string }
  | { op: 'pays'; job: string; who?: string; why?: string; price?: string }
  | { op: 'feature'; id?: string; job: string; name: string; stage?: Column | null; pieces?: string[] }
  | { op: 'remove-feature'; id: string }
  | { op: 'journey'; steps: { text: string; feature?: string }[] }
  | { op: 'step'; n: number; text?: string; feature?: string }
  | { op: 'journey-ends-at-so'; value: boolean }
  | { op: 'piece'; id?: string; name: string; kind: PieceKind; features?: string[] }
  | { op: 'pieces-confirmed'; value: boolean }
  | { op: 'column'; feature: string; stage: Column }
  | { op: 'argue'; feature: string; keep: boolean; reason: string; stage?: Column }
  | { op: 'stage-name'; stage: StageNo; name: string }
  | { op: 'story'; step: number; text: string; done: string; feature?: string }
  | { op: 'test-cases'; text: string }
  | { op: 'small-enough'; value: boolean }
  | { op: 'unknown'; id?: string; text: string; test?: string }
  | { op: 'needs'; feature: string; needs: string[] }
  | { op: 'deps-confirmed'; value: boolean }
  | { op: 'sketch-ordered'; value: boolean }

export type Applied = { session: Session; events: string[]; errors: string[] }

const nextId = (prefix: string, taken: readonly string[]): string => {
  let n = 1
  while (taken.includes(prefix + n)) n += 1
  return prefix + n
}

const signed = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`)

/** Applies changes in order; a change that does not fit is reported and skipped. */
export function apply(prev: Session, changes: readonly Change[]): Applied {
  const s: Session = JSON.parse(JSON.stringify(prev)) as Session
  const events: string[] = []
  const errors: string[] = []
  const feature = (id: string) => s.features.find(f => f.id === id)
  // A move after the first count is recorded, so the page can show what each cut saved.
  const track = (label: string, before: number) => {
    const delta = pieceCount(s) - before
    if (delta && s.moves.length) s.moves.push({ label, delta, kind: delta > 0 ? 'add' : 'cut' })
    return delta
  }

  for (const c of changes) {
    switch (c.op) {
      case 'name':
        s.name = c.name.trim()
        break
      case 'idea':
        s.idea = { pitch: c.pitch ?? s.idea?.pitch ?? '', who: c.who ?? s.idea?.who ?? '' }
        break
      case 'job': {
        const id = c.id ?? nextId('J', s.jobs.map(j => j.id))
        const j = s.jobs.find(x => x.id === id)
        if (j) Object.assign(j, { when: c.when, want: c.want, so: c.so })
        else {
          s.jobs.push({ id, when: c.when, want: c.want, so: c.so })
          events.push(`🟨 ${id} is on the wall`)
        }
        break
      }
      case 'remove-job':
        if (s.features.some(f => f.job === c.id)) errors.push(`${c.id} still has features under it; move or remove them first`)
        else s.jobs = s.jobs.filter(j => j.id !== c.id)
        break
      case 'pays':
        if (!s.jobs.some(j => j.id === c.job)) { errors.push(`no job ${c.job}`); break }
        if (s.pays?.job !== c.job) events.push(`● The job that pays: ${c.job}`)
        s.pays = { job: c.job, who: c.who ?? s.pays?.who ?? '', why: c.why ?? s.pays?.why ?? '', price: c.price ?? s.pays?.price ?? '' }
        break
      case 'feature': {
        if (!s.jobs.some(j => j.id === c.job)) { errors.push(`no job ${c.job} for feature “${c.name}”`); break }
        const id = c.id ?? nextId('F', s.features.map(f => f.id))
        const f = feature(id)
        const before = pieceCount(s)
        if (f) {
          Object.assign(f, { job: c.job, name: c.name })
          if (c.stage !== undefined) f.stage = c.stage
          if (c.pieces) f.pieces = c.pieces
        } else {
          s.features.push({ id, job: c.job, name: c.name, pieces: c.pieces ?? [], stage: c.stage ?? null })
          events.push(`🟦 ${id} ${c.name} under ${c.job}`)
        }
        track('+ ' + c.name, before)
        break
      }
      case 'remove-feature':
        s.features = s.features.filter(f => f.id !== c.id)
        s.journey.forEach(st => { if (st.feature === c.id) delete st.feature })
        break
      case 'journey':
        s.journey = c.steps.map((st, i) => ({ n: i + 1, text: st.text, ...(st.feature ? { feature: st.feature } : {}) }))
        s.journeyEndsAtSo = false
        events.push(`The journey has ${s.journey.length} steps`)
        break
      case 'step': {
        const st = s.journey.find(x => x.n === c.n)
        if (!st) { errors.push(`no step ${c.n}`); break }
        if (c.text) st.text = c.text
        if (c.feature) {
          if (!feature(c.feature)) { errors.push(`no feature ${c.feature}`); break }
          st.feature = c.feature
        }
        break
      }
      case 'journey-ends-at-so':
        s.journeyEndsAtSo = c.value
        break
      case 'piece': {
        const id = c.id ?? nextId('P', s.pieces.map(p => p.id))
        const before = pieceCount(s)
        const p = s.pieces.find(x => x.id === id)
        if (p) Object.assign(p, { name: c.name, kind: c.kind })
        else s.pieces.push({ id, name: c.name, kind: c.kind })
        for (const fid of c.features ?? []) {
          const f = feature(fid)
          if (!f) errors.push(`no feature ${fid}`)
          else if (!f.pieces.includes(id)) f.pieces.push(id)
        }
        const delta = track('+ ' + c.name, before)
        if (!s.moves.length) s.piecesConfirmed = false
        else if (delta) events.push(`${c.name}: ${signed(delta)} piece`)
        break
      }
      case 'pieces-confirmed':
        s.piecesConfirmed = c.value
        if (c.value && !s.moves.length) {
          s.moves.push({ label: 'First draft', delta: pieceCount(s), kind: 'start' })
          events.push(`Stage 1 sized: ${pieceCount(s)} pieces`)
        }
        break
      case 'column': {
        const f = feature(c.feature)
        if (!f) { errors.push(`no feature ${c.feature}`); break }
        if (f.stage === c.stage) break
        const before = pieceCount(s)
        if (f.stage !== 1 && c.stage !== 1) s.sketchOrdered = false
        f.stage = c.stage
        const delta = track((c.stage === 1 ? '+ ' : '− ') + f.name, before)
        events.push(`${f.id} ${f.name} → ${columnName(c.stage)}${delta ? ` (${signed(delta)} pieces)` : ''}`)
        break
      }
      case 'argue': {
        const f = feature(c.feature)
        if (!f) { errors.push(`no feature ${c.feature}`); break }
        if (!c.reason) { errors.push(`${c.feature}: record the founder’s reason`); break }
        f.argued = { keep: c.keep, reason: c.reason }
        if (c.keep) { events.push(`${f.id} ${f.name} stays in stage 1`); break }
        const before = pieceCount(s)
        f.stage = c.stage ?? 2
        const delta = track('− ' + f.name, before)
        events.push(`${f.id} ${f.name} → ${columnName(f.stage)}${delta ? ` (${signed(delta)} pieces)` : ''}`)
        break
      }
      case 'stage-name':
        s.stageNames[c.stage] = c.name
        break
      case 'story': {
        const step = s.journey.find(st => st.n === c.step)
        if (!step) { errors.push(`no step ${c.step}`); break }
        const story = { step: c.step, feature: c.feature ?? step.feature ?? '', text: c.text, done: c.done }
        const i = s.stories.findIndex(x => x.step === c.step)
        if (i >= 0) s.stories[i] = story
        else { s.stories.push(story); events.push(`🟩 Story for step ${c.step}`) }
        s.stories.sort((a, b) => a.step - b.step)
        if (vagueDoneWhen(c.done)) errors.push(`step ${c.step}: “${c.done}” can’t be checked by looking; ask what they would see`)
        break
      }
      case 'test-cases':
        s.testCases = c.text
        break
      case 'small-enough':
        s.smallEnough = c.value
        break
      case 'unknown': {
        const id = c.id ?? nextId('U', s.unknowns.map(u => u.id))
        const u = s.unknowns.find(x => x.id === id)
        if (u) {
          u.text = c.text
          if (c.test !== undefined) u.test = c.test
        } else {
          s.unknowns.push({ id, text: c.text, test: c.test ?? '', from: '' })
          events.push(`? Unknown to test: ${c.text}`)
        }
        break
      }
      case 'needs': {
        const f = feature(c.feature)
        if (!f) { errors.push(`no feature ${c.feature}`); break }
        const missing = c.needs.filter(id => !feature(id))
        if (missing.length) { errors.push(`no feature ${missing.join(', ')}`); break }
        f.needs = c.needs.filter(id => id !== f.id)
        break
      }
      case 'deps-confirmed':
        s.depsConfirmed = c.value
        break
      case 'sketch-ordered':
        s.sketchOrdered = c.value
        if (c.value) events.push('✏️ The rest of the roadmap is sketched')
        break
      default:
        errors.push(`unknown change ${(c as { op: string }).op}`)
    }
  }
  return { session: s, events, errors }
}

/** Parks a gap as an unknown to test, so the walk can go on. */
export function park(prev: Session, code: string, note: string): Session {
  const s = JSON.parse(JSON.stringify(prev)) as Session
  if (!s.parked.includes(code)) s.parked.push(code)
  s.unknowns.push({ id: nextId('U', s.unknowns.map(u => u.id)), text: note, test: '', from: code })
  return s
}

/** Unparks a gap so the walk asks it again. */
export function unpark(prev: Session, code: string): Session {
  const s = JSON.parse(JSON.stringify(prev)) as Session
  s.parked = s.parked.filter(c => c !== code)
  return s
}

// ── reading it back ────────────────────────────────────────────────────────

export const progressDots = (station: number): string =>
  STATIONS.map(st => (st.n < station ? '●' : st.n === station ? '◉' : '○')).join('')

/** The whole session in a few lines, for the model. */
export function summary(s: Session): string {
  const st = stationOf(s)
  const lines = [
    `Station: ${st > LAST ? 'complete' : `${st} · ${STATIONS[st]!.name}`} ${progressDots(st)}`,
    `Stage 1: ${stage1(s).length} features, ${pieceCount(s)} pieces · gaps left: ${gaps(s).length}`,
  ]
  if (s.name) lines.push(`Name: ${s.name}`)
  if (s.idea?.pitch) lines.push(`Idea: ${s.idea.pitch}${s.idea.who ? ` (for ${s.idea.who})` : ''}`)
  if (s.jobs.length) lines.push('Jobs: ' + s.jobs.map(j => `${j.id}${j.id === s.pays?.job ? '●' : ''} When ${j.when}, I want ${j.want}, so ${j.so}`).join(' | '))
  if (s.pays) lines.push(`Pays: ${s.pays.job} · who: ${s.pays.who || '?'} · why: ${s.pays.why || '?'} · price: ${s.pays.price || '?'}`)
  if (s.features.length) lines.push('Features: ' + s.features.map(f => `${f.id}(${f.job}, ${columnName(f.stage)}${f.pieces.length ? ', pieces ' + f.pieces.join('+') : ''}${f.argued ? (f.argued.keep ? ', kept' : ', moved') : ''}${f.needs?.length ? ', needs ' + f.needs.join('+') : ''}) ${f.name}`).join(' | '))
  if (s.journey.length) lines.push('Journey: ' + s.journey.map(j => `${j.n}. ${j.text}${j.feature ? ` [${j.feature}]` : ''}`).join(' | ') + (s.journeyEndsAtSo ? ' (ends at the so)' : ''))
  if (s.pieces.length) lines.push('Pieces: ' + s.pieces.map(p => `${p.id} ${p.name} (${p.kind})`).join(' | ') + (s.piecesConfirmed ? ' (count confirmed)' : ''))
  if (s.stories.length) lines.push('Stories: ' + s.stories.map(x => `step ${x.step}: ${x.text} — done when ${x.done}`).join(' | '))
  if (s.unknowns.length) lines.push('Unknowns: ' + s.unknowns.map(u => `${u.id} ${u.text}${u.test ? ' — test: ' + u.test : ''}`).join(' | '))
  if (s.testCases) lines.push(`Test cases: ${s.testCases}`)
  return lines.join('\n')
}

/** What `/021 where` prints: the route, your place on it, and what comes next. */
export function whereText(s: Session): string {
  const st = stationOf(s)
  const g = gaps(s)
  const rows = STATIONS.map(x => `${x.n < st ? '✓' : x.n === st ? '▶' : '·'} ${x.n}  ${x.name}${x.n === st ? '   ← you are here' : ''}`)
  return [
    '021 · where you are',
    '',
    ...rows,
    '',
    st > LAST
      ? 'Every gap is filled. /021 view opens your roadmap, /021 brief shows the brief.'
      : `Now: ${STATIONS[st]!.goal}\nDone when: ${STATIONS[st]!.done}\nNext question is about: ${g[0]!.text}`,
    `Stage 1 so far: ${stage1(s).length} features, ${pieceCount(s)} pieces · ${g.length} gaps left · about ${minutesLeft(Math.min(st, LAST))} min to go`,
    '',
    'Stuck? Say “I don’t know” and the coach helps; /021 park sets the question aside as an unknown to test.',
  ].join('\n')
}

/** Stages after stage 1 that hold features, in build order. */
export function laterStages(s: Session): { label: string; features: string[] }[] {
  return ([2, 3, 4, 'later'] as Column[])
    .map(c => ({ c, features: s.features.filter(f => f.stage === c).map(f => f.name) }))
    .filter(x => x.features.length)
    .map(x => ({ label: x.c === 'later' ? 'Later' : `Stage ${x.c}${s.stageNames[x.c as StageNo] ? ' · ' + s.stageNames[x.c as StageNo] : ''}`, features: x.features }))
}

/** The stage-1 brief as markdown: the workshop's one page. */
export function briefMarkdown(s: Session): string {
  const job = payingJob(s)
  const s1 = stage1(s)
  const outLine = ([2, 3, 4, 'later'] as Column[])
    .map(c => ({ c, list: s.features.filter(f => f.stage === c).map(f => f.name.toLowerCase()) }))
    .filter(x => x.list.length)
    .map(x => `${x.list.join(', ')} (${x.c === 'later' ? 'later' : 'stage ' + x.c})`)
    .join('; ')
  return [
    `# Stage-1 brief · ${s.name || 'Untitled'}`,
    '',
    '## Who and why',
    `- **Who pays:** ${s.pays?.who || '—'}`,
    `- **The job:** ${job ? `When ${job.when}, I want ${job.want}, so ${job.so}.` : '—'}`,
    `- **Would they pay?** ${s.pays?.price ? `Yes: ${s.pays.price}. ${s.pays.why}` : s.pays?.why || '—'}`,
    '',
    '## In, and out',
    `- **In:** ${s1.map(f => f.name.toLowerCase()).join(', ') || '—'} (${pieceCount(s)} pieces)`,
    `- **Out:** ${outLine || '—'}`,
    `- **Test cases:** ${s.testCases || '—'}`,
    '',
    '## Stories, in journey order',
    ...(s.stories.length ? s.stories.map((st, i) => `${i + 1}. ${st.text}\n   *Done when:* ${st.done}`) : ['—']),
    '',
    ...(laterStages(s).length ? ['## The rest of the roadmap, in pencil', ...laterStages(s).map(x => `- **${x.label}:** ${x.features.join(', ')}`), '', '_A sketch: expect it to change once stage 1 meets customers._', ''] : []),
    '## Unknowns to test with customers',
    ...(s.unknowns.length ? s.unknowns.map(u => `- ${u.text}${u.test ? ` — **test:** ${u.test}` : ''}`) : ['- none recorded']),
    '',
    '## Facilitator check',
    ...briefChecks(s).map(c => `- [${c.ok ? 'x' : ' '}] ${c.label}`),
    '',
    '---',
    '',
    'Paste into Claude on build day:',
    '',
    '> I’m building stage 1 of a product. Here is the brief: [paste the brief]. Don’t write code yet. First give me a plan: the pieces you’ll build, in story order, and anything you need from me. Then wait for my go.',
    '',
  ].join('\n')
}

/** The shape the roadmap page draws from. */
export function view(s: Session) {
  const job = payingJob(s)
  const s1 = stage1(s)
  const savedBy = (name: string) => Math.abs(s.moves.filter(m => m.label === '− ' + name).reduce((a, m) => a + m.delta, 0))
  return {
    name: s.name || 'Your product',
    pitch: s.idea?.pitch ?? '',
    who: s.idea?.who ?? '',
    price: s.pays?.price ?? '',
    payer: s.pays?.who ?? '',
    why: s.pays?.why ?? '',
    jobs: s.jobs.map(j => ({ id: j.id, text: `When ${j.when}, I want ${j.want}, so ${j.so}.`, pays: j.id === s.pays?.job })),
    payingJob: job ? `When ${job.when}, I want ${job.want}, so ${job.so}.` : '',
    payingJobId: job?.id ?? '',
    features: s.features.map(f => ({ id: f.id, job: f.job, name: f.name, stage: f.stage === 'later' || f.stage === null ? 5 : f.stage, needs: f.needs ?? [] })),
    journey: s.journey.map(j => ({ n: j.n, text: j.text, f: j.feature ?? '' })),
    moves: [...s.moves, { label: 'Stage 1', delta: 0, kind: 'end' as const }],
    pieces: piecesOf(s, s1).map(p => ({ id: p.id, name: p.name, kind: p.kind === 'service' ? 'outside service' : p.kind, by: s1.filter(f => f.pieces.includes(p.id)).map(f => f.id) })),
    argued: s.features.filter(f => f.argued).map(f => ({ f: f.name, id: f.id, keep: f.argued!.keep, reason: f.argued!.reason, stage: columnName(f.stage), saves: f.argued!.keep ? 0 : savedBy(f.name) })),
    stages: ([1, 2, 3, 4] as StageNo[]).map(n => {
      const here = s.features.filter(f => f.stage === n)
      return {
        n,
        name: s.stageNames[n] ?? (n === 1 ? 'Sold first' : `Stage ${n}`),
        on: n === 1 ? 'Sold first' : `Builds on 1${n > 2 ? '–' + (n - 1) : ''}`,
        pieces: n === 1 ? pieceCount(s) : piecesOf(s, here).length,
        sketch: n > 1,
      }
    }),
    sketched: s.sketchOrdered,
    stories: s.stories.map(st => ({ step: `${st.step} · ${st.feature}`, s: st.text, done: st.done })),
    unknowns: s.unknowns.map(u => ({ k: u.from ? 'Parked' : 'Assumption', a: u.text, test: u.test })),
    log: s.log.map(l => ({ when: STATIONS[l.station]?.short ?? 'Brief', q: l.q, a: l.a, ev: l.ev === 'evidence' ? 'e' : 'a' })),
    counts: { features: s1.length, pieces: pieceCount(s), stages: Math.max(1, ...s.features.map(f => (typeof f.stage === 'number' ? f.stage : 1))) },
    testCases: s.testCases,
    checks: briefChecks(s),
    complete: isComplete(s),
    station: stationOf(s),
  }
}

const escapeHtml = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Fills the roadmap template: the data, and the libraries inlined so the page works offline. */
export function renderPage(template: string, s: Session, vendor: string, generated: string): string {
  const data = JSON.stringify({ ...view(s), generated }).replace(/</g, '\\u003c')
  return template
    .replace('/*__021_VENDOR__*/', () => vendor.replace(/<\/script/gi, '<\\/script'))
    .replace('"__021_DATA__"', () => data)
    .replace(/__021_TITLE__/g, () => escapeHtml(s.name || 'Your roadmap'))
}

/** A printable sheet of the session's notes, coloured and sized like post-its. */
export function printPage(s: Session): string {
  const note = (cls: string, tag: string, text: string) => `<div class="n ${cls}"><b>${escapeHtml(tag)}</b>${escapeHtml(text)}</div>`
  const notes = [
    ...s.jobs.map(j => note('y', j.id + (j.id === s.pays?.job ? ' ● pays' : ''), `When ${j.when}, I want ${j.want}, so ${j.so}.`)),
    ...s.features.map(f => note('b', `${f.id} · ${f.job} · ${columnName(f.stage)}`, f.name)),
    ...gaps(s).filter(g => g.station === 5).map(g => note('p', 'gap', g.text)),
    ...s.stories.map(st => note('g', `step ${st.step} · ${st.feature}`, `${st.text} Done when: ${st.done}`)),
  ]
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(s.name || '021')} notes</title>
<style>
@page{size:A4;margin:12mm}
body{font:14px/1.3 "Marker Felt","Comic Sans MS",cursive;margin:0;padding:12mm;color:#1d1b16;background:#fff}
h1{font:600 16px system-ui,sans-serif;margin:0 0 8mm}
.grid{display:grid;grid-template-columns:repeat(auto-fill,76mm);gap:6mm}
.n{width:76mm;height:76mm;padding:6mm;box-sizing:border-box;break-inside:avoid;border:1px dashed #0003}
.n b{display:block;font:600 10px ui-monospace,monospace;letter-spacing:.05em;margin-bottom:3mm;opacity:.7}
.y{background:#FFE45C}.b{background:#9AD6FF}.p{background:#FF9DBB}.g{background:#A6E8A8}
@media print{body{padding:0}h1{display:none}}
</style></head><body><h1>${escapeHtml(s.name || '021')} · ${notes.length} notes · print on A4 and cut along the dashes</h1><div class="grid">${notes.join('')}</div></body></html>`
}
