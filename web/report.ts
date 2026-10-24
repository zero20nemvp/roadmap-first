// The v2 founder report: problems → workarounds → jobs → features → stories → releases,
// ending in a flight plan. Pure: the CLI, the tests and the report run use it as is.

export type Status = 'Reached' | 'Next' | 'Planned' | 'Delayed'
export const STATUSES: Status[] = ['Reached', 'Next', 'Planned', 'Delayed']

export type Problem = { id: string; text: string }
/** What the customer does about a problem today. `pays` marks a workaround they already pay for. */
export type Workaround = { id: string; problem: string; text: string; pays?: string }
export type Job = { id: string; when: string; want: string; so: string; from?: string }
export type Feature = { id: string; job: string; name: string }
export type Story = { id: string; feature: string; text: string; done: string }
/** One waypoint. `completes` names the jobs it makes doable end to end; `stories` what ships in it. */
export type Release = {
  id: string
  month: string
  status: Status
  completes: string[]
  stories: string[]
  price?: string
}

export type Report = {
  version: 2
  founder: { name: string; email?: string }
  product: { name: string; pitch: string; who: string }
  problems: Problem[]
  workarounds: Workaround[]
  jobs: Job[]
  features: Feature[]
  stories: Story[]
  releases: Release[]
}

/** What a founder submits on the intake page, before the report run adds stories and releases. */
export type Intake = {
  name: string
  email: string
  consent: boolean
  product: string
  who: string
  problems: string
  workarounds: string
  jobs: string
  features: string
  submittedAt?: string
}

export type Check = { errors: string[]; warnings: string[] }

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

/** The release rules from the v2 spec. Errors stop a render; warnings are for the facilitator. */
export function check(r: Report): Check {
  const errors: string[] = []
  const warnings: string[] = []
  const ids = (xs: { id: string }[]) => new Set(xs.map(x => x.id))
  const problems = ids(r.problems), jobs = ids(r.jobs), features = ids(r.features), stories = ids(r.stories)

  for (const w of r.workarounds) if (!problems.has(w.problem)) errors.push(`${w.id} names unknown problem ${w.problem}`)
  for (const f of r.features) if (!jobs.has(f.job)) errors.push(`${f.id} names unknown job ${f.job}`)
  for (const s of r.stories) if (!features.has(s.feature)) errors.push(`${s.id} names unknown feature ${s.feature}`)

  if (!r.releases.length) errors.push('There are no releases: a flight plan starts at Ground Zero')
  const featureOf = new Map(r.stories.map(s => [s.id, s.feature]))
  const jobOf = new Map(r.features.map(f => [f.id, f.job]))
  const shippedIn = new Map<string, string>()
  const shippedFeatures = new Set<string>()
  let reachedOpen = true
  let prevMonth = ''

  r.releases.forEach((rel, i) => {
    const want = i === 0 ? 'GZ' : `R${i}`
    if (rel.id !== want) errors.push(`Release ${i + 1} is ${rel.id}; it should be ${want}`)
    if (!MONTH.test(rel.month)) errors.push(`${rel.id} needs a target month as YYYY-MM, not "${rel.month}"`)
    else if (prevMonth && rel.month < prevMonth) errors.push(`${rel.id} (${rel.month}) comes before ${prevMonth}: releases stack, so they can't go back in time`)
    else prevMonth = rel.month
    if (!STATUSES.includes(rel.status)) errors.push(`${rel.id} status "${rel.status}" is not one of ${STATUSES.join(', ')}`)
    if (rel.status === 'Reached' && !reachedOpen) errors.push(`${rel.id} is Reached but an earlier release isn't: releases stack`)
    if (rel.status !== 'Reached') reachedOpen = false

    for (const s of rel.stories) {
      if (!stories.has(s)) { errors.push(`${rel.id} ships unknown story ${s}`); continue }
      if (shippedIn.has(s)) errors.push(`${s} ships in both ${shippedIn.get(s)} and ${rel.id}`)
      shippedIn.set(s, rel.id)
      shippedFeatures.add(featureOf.get(s)!)
    }
    if (!rel.completes.length) errors.push(`${rel.id} completes no job: every release completes at least one job end to end`)
    for (const j of rel.completes) {
      if (!jobs.has(j)) { errors.push(`${rel.id} completes unknown job ${j}`); continue }
      const doable = [...shippedFeatures].some(f => jobOf.get(f) === j)
      if (!doable) errors.push(`${rel.id} says it completes ${j}, but no feature for ${j} has shipped by then`)
    }
  })

  if (r.releases.filter(x => x.status === 'Next').length > 1) errors.push('Only one release can be Next: the one being built now')
  const gz = r.releases[0]
  if (gz && gz.completes.length > 1) warnings.push(`Ground Zero completes ${gz.completes.length} jobs; the smallest valid Ground Zero completes one`)
  if (gz) {
    const gzJobs = new Set(gz.completes)
    for (const s of gz.stories) {
      const j = jobOf.get(featureOf.get(s) ?? '')
      if (j && !gzJobs.has(j)) warnings.push(`${s} ships in Ground Zero but serves ${j}, a job Ground Zero doesn't complete`)
    }
  }
  for (const s of r.stories) if (!shippedIn.has(s.id)) warnings.push(`${s.id} isn't in any release`)
  return { errors, warnings }
}

/** Ground Zero is billable when a workaround for one of its jobs is already paid for. */
export function billable(r: Report): Workaround[] {
  const gz = new Set(r.releases[0]?.completes ?? [])
  const fromWorkaround = new Set(r.jobs.filter(j => gz.has(j.id) && j.from).map(j => j.from!))
  return r.workarounds.filter(w => w.pays && (fromWorkaround.size === 0 || fromWorkaround.has(w.id)))
}

/** Seeds a report from an intake: one line per item, nothing invented. Stories and releases come from the run. */
export function fromIntake(i: Intake): Report {
  const lines = (s: string) => s.split('\n').map(x => x.replace(/^\s*[-*•\d.)]+\s*/, '').trim()).filter(Boolean)
  const problems = lines(i.problems).map((text, n) => ({ id: `P${n + 1}`, text }))
  return {
    version: 2,
    founder: { name: i.name, email: i.email },
    product: { name: i.product, pitch: '', who: i.who },
    problems,
    workarounds: lines(i.workarounds).map((text, n) => ({ id: `W${n + 1}`, problem: problems[Math.min(n, problems.length - 1)]?.id ?? 'P1', text })),
    jobs: lines(i.jobs).map((text, n) => ({ id: `J${n + 1}`, when: '', want: text, so: '' })),
    features: lines(i.features).map((name, n) => ({ id: `F${n + 1}`, job: 'J1', name })),
    stories: [],
    releases: [],
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const eta = (m: string) => MONTH.test(m) ? `${MONTHS[+m.slice(5) - 1]} ${m.slice(0, 4)}` : m
const jobLine = (j: Job) => [j.when && `When ${j.when}`, j.want && `I want ${j.want}`, j.so && `so ${j.so}`].filter(Boolean).join(', ')

/** The whole report as one self-contained HTML document. */
export function renderReport(r: Report): string {
  const job = new Map(r.jobs.map(j => [j.id, j]))
  const feature = new Map(r.features.map(f => [f.id, f]))
  const story = new Map(r.stories.map(s => [s.id, s]))
  const paid = billable(r)

  const problems = r.problems.map(p => {
    const ws = r.workarounds.filter(w => w.problem === p.id)
    return `<li class="pw"><div class="note p"><span class="tag">${esc(p.id)} · problem</span>${esc(p.text)}</div>
      <div class="ws">${ws.map(w => `<div class="note y"><span class="tag">${esc(w.id)} · today they</span>${esc(w.text)}${w.pays ? `<span class="pays">pays ${esc(w.pays)}</span>` : ''}</div>`).join('') || '<p class="muted">No workaround yet.</p>'}</div></li>`
  }).join('')

  const jobs = r.jobs.map(j => {
    const fs = r.features.filter(f => f.job === j.id)
    return `<li class="job"><div class="note y"><span class="tag">${esc(j.id)} · job</span>${esc(jobLine(j))}</div>
      <ul class="fs">${fs.map(f => `<li class="note b"><span class="tag">${esc(f.id)}</span>${esc(f.name)}</li>`).join('')}</ul></li>`
  }).join('')

  const rows = r.releases.map(rel => {
    const main = rel.completes.map(id => job.get(id)).filter(Boolean) as Job[]
    const fids = [...new Set(rel.stories.map(s => story.get(s)?.feature).filter(Boolean) as string[])]
    const detail = fids.map(fid => {
      const f = feature.get(fid)!
      const ss = rel.stories.map(s => story.get(s)!).filter(s => s?.feature === fid)
      return `<div class="wf"><h4>${esc(f.name)} <span class="muted">${esc(f.id)} · ${esc(f.job)}</span></h4>
        <ul>${ss.map(s => `<li><b>${esc(s.text)}</b><span>Done when ${esc(s.done)}</span></li>`).join('')}</ul></div>`
    }).join('')
    return `<tr class="st-${rel.status.toLowerCase()}"><td class="mono wp">${esc(rel.id)}</td>
      <td><details><summary>${esc(main.map(j => j.want || jobLine(j)).join(' · ') || '—')}${rel.price ? ` <span class="muted">· ${esc(rel.price)}</span>` : ''}</summary>
        <div class="open">${detail || '<p class="muted">No stories yet.</p>'}</div></details></td>
      <td class="mono">${esc(eta(rel.month))}</td><td><span class="status">${esc(rel.status)}</span></td></tr>`
  }).join('')

  const reached = r.releases.filter(x => x.status === 'Reached').length
  const title = r.product.name || 'Your product'

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)} Flight Plan</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&family=Kalam:wght@400&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
:root{
  --bg:#EDF0F3; --surface:#FFFFFF; --ink:#141C26; --muted:#56636F; --line:#D2D9E0;
  --accent:#1F4FE0; --flag:#D93A3F; --ok:#1E8A4C; --warn:#B26A00;
  --yellow:#FFE45C; --blue:#9AD6FF; --pink:#FF9DBB; --green:#A6E8A8; --note-ink:#1D1B16;
  --f-display:"Bricolage Grotesque", "Avenir Next", system-ui, sans-serif;
  --f-body:"Instrument Sans", "Helvetica Neue", system-ui, sans-serif;
  --f-hand:"Kalam", "Comic Sans MS", "Marker Felt", cursive;
  --f-mono:"JetBrains Mono", ui-monospace, Menlo, monospace;
  --shadow:0 1px 1px rgba(20,28,38,.08), 0 6px 14px -6px rgba(20,28,38,.28);
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  --bg:#0E1319; --surface:#161D26; --ink:#E7ECF1; --muted:#97A4B1; --line:#2A3542;
  --accent:#7D9CFF; --flag:#FF6E72; --ok:#5BD08B; --warn:#F2B25C;
  --shadow:0 1px 1px rgba(0,0,0,.4), 0 8px 18px -6px rgba(0,0,0,.7); color-scheme:dark}}
:root[data-theme="dark"]{
  --bg:#0E1319; --surface:#161D26; --ink:#E7ECF1; --muted:#97A4B1; --line:#2A3542;
  --accent:#7D9CFF; --flag:#FF6E72; --ok:#5BD08B; --warn:#F2B25C;
  --shadow:0 1px 1px rgba(0,0,0,.4), 0 8px 18px -6px rgba(0,0,0,.7); color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 var(--f-body);
  background-image:radial-gradient(color-mix(in srgb,var(--ink) 9%,transparent) 1px,transparent 1px);background-size:22px 22px;overflow-x:hidden}
.wrap{max-width:1040px;margin:0 auto;padding:0 max(16px,env(safe-area-inset-left,0px))}
section{padding-block:56px 8px}
h1,h2,h4{font-family:var(--f-display);letter-spacing:-.02em;margin:0;text-wrap:balance}
h1{font-size:clamp(44px,9vw,104px);line-height:.92;font-weight:800}
h2{font-size:clamp(26px,4vw,40px);line-height:1.05;font-weight:800;margin-bottom:6px}
h4{font-size:17px}
p{margin:0}
ul{list-style:none;margin:0;padding:0}
.eyebrow{font:600 12px/1 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:14px}
.eyebrow b{color:var(--accent)}
.lede{color:var(--muted);max-width:62ch;margin-bottom:24px}
.muted{color:var(--muted);font-weight:400}
.mono{font-family:var(--f-mono);font-variant-numeric:tabular-nums}
.note{background:var(--c,var(--yellow));color:var(--note-ink);font:400 17px/1.3 var(--f-hand);padding:12px 14px 16px;box-shadow:var(--shadow);border-radius:2px 2px 6px 2px;min-width:0;overflow-wrap:anywhere}
.note .tag{font:600 11px/1 var(--f-mono);letter-spacing:.06em;opacity:.7;display:block;margin-bottom:6px}
.note.y{--c:var(--yellow)} .note.b{--c:var(--blue)} .note.p{--c:var(--pink)} .note.g{--c:var(--green)}
.pays{display:inline-block;margin-top:8px;font:600 12px/1 var(--f-mono);background:var(--note-ink);color:var(--yellow);padding:5px 7px;border-radius:4px}
header{padding-block:48px 8px}
.sub{font-size:clamp(18px,2.2vw,22px);margin-top:14px;max-width:40ch}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
.chip{font:600 13px/1 var(--f-mono);padding:8px 10px;border:1px solid var(--line);background:var(--surface);border-radius:999px}
.chip b{color:var(--accent)}
.pw{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:16px;margin-bottom:18px}
.ws{display:grid;gap:12px}
.job{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:16px;margin-bottom:18px}
.fs{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;align-content:start}
.board{background:#0B1118;color:#E7ECF1;border-radius:12px;padding:8px;box-shadow:var(--shadow);overflow-x:auto}
table{width:100%;border-collapse:collapse;min-width:560px}
th{font:600 11px/1 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;color:#97A4B1;text-align:left;padding:14px 12px}
td{padding:14px 12px;border-top:1px solid #222D39;vertical-align:top}
td.wp{font-weight:600;color:#FFE45C;width:64px}
summary{cursor:pointer;font-weight:600}
summary:focus-visible{outline:2px solid #7D9CFF;outline-offset:3px}
.open{margin-top:12px;display:grid;gap:14px}
.wf h4{font-size:15px;color:#E7ECF1}
.wf .muted{color:#97A4B1;font:400 12px/1 var(--f-mono)}
.wf li{margin-top:8px;padding-left:12px;border-left:2px solid #2A3542;display:grid}
.wf li span{color:#97A4B1;font-size:14px}
.status{font:600 12px/1 var(--f-mono);padding:6px 8px;border-radius:4px;background:#222D39;white-space:nowrap}
.st-reached .status{background:#1E8A4C;color:#fff}
.st-next .status{background:#FFE45C;color:#1D1B16}
.st-delayed .status{background:#B26A00;color:#fff}
.rules{margin-top:20px;display:grid;gap:8px;color:var(--muted);max-width:70ch}
.rules b{color:var(--ink)}
footer{padding-block:56px 40px;color:var(--muted);font-size:14px}
@media (max-width:720px){.pw,.job{grid-template-columns:minmax(0,1fr)}}
</style>
</head>
<body>
<div class="wrap">
<header>
  <p class="eyebrow"><b>021</b> · roadmap-first report for ${esc(r.founder.name || 'you')}</p>
  <h1>${esc(title)}</h1>
  ${r.product.pitch || r.product.who ? `<p class="sub">${esc(r.product.pitch)}${r.product.who ? `${r.product.pitch ? ', for ' : 'For '}${esc(r.product.who)}` : ''}</p>` : ''}
  <div class="chips">
    <span class="chip"><b>${r.problems.length}</b> problems</span>
    <span class="chip"><b>${r.jobs.length}</b> jobs</span>
    <span class="chip"><b>${r.features.length}</b> features</span>
    <span class="chip"><b>${r.releases.length}</b> releases</span>
    ${paid.length ? '<span class="chip"><b>Ground Zero</b> is billable</span>' : ''}
  </div>
</header>

<section>
  <p class="eyebrow"><b>1–2</b> · problems and workarounds</p>
  <h2>What hurts, and what they do about it today</h2>
  <p class="lede">A workaround is the job in disguise.${paid.length ? ' Your customer already pays for one, so Ground Zero is billable.' : ''}</p>
  <ul>${problems}</ul>
</section>

<section>
  <p class="eyebrow"><b>3–4</b> · jobs and features</p>
  <h2>The jobs, and what your product needs to do them</h2>
  <p class="lede">Jobs are the linchpin: jobs give features, features give stories.</p>
  <ul>${jobs}</ul>
</section>

<section id="flight-plan">
  <p class="eyebrow"><b>5–6</b> · stories and releases</p>
  <h2>Flight plan</h2>
  <p class="lede">Your product's route, one waypoint per release, starting at Ground Zero. ${reached} of ${r.releases.length} reached. Open a waypoint to see its features and stories.</p>
  <div class="board"><table>
    <thead><tr><th>Waypoint</th><th>Release (job completed)</th><th>ETA</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  <div class="rules">
    <p><b>Every release completes at least one job end to end.</b> It need not ship every feature for that job, but the job must be doable.</p>
    <p><b>Releases stack.</b> Each builds on the one before and needs it to exist.</p>
    <p><b>Target months, not dates.</b> Delayed means moved: honest, not failure.</p>
    <p><b>Grandfather pricing.</b> Join at a release and keep that price forever; cancel and you lose it.</p>
  </div>
</section>

<footer>Made with the roadmap-first method: problems → workarounds → jobs → features → stories → releases.</footer>
</div>
</body>
</html>
`
}
