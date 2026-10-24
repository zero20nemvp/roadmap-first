// The founder's roadmap as a website: the plugin's whiteboard page, in v2 words.
// problems → workarounds → jobs → features → stories → releases, ending in a flight plan from Ground Zero.
// Pure: the coach serves it, the report run and the tests use it as is.
import { billable, check, type Report } from './report.ts'

export type RoadmapExtras = {
  /** What the founder parked to test with real customers. */
  unknowns?: { id: string; text: string }[]
  /** The conversation, for the log: the coach's questions and the founder's answers. */
  chat?: { role: 'coach' | 'founder'; text: string }[]
  /** When it was made, as shown in the corner. */
  generated?: string
  /** Ground Zero argued down: each feature of its job, kept or moved later, with the founder's reason. */
  argued?: { feature: string; name: string; keep: boolean; reason: string }[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthName = (m: string) => /^\d{4}-\d{2}$/.test(m) ? `${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}` : m
const releaseName = (id: string) => id === 'GZ' ? 'Ground Zero' : `Release ${id.slice(1)}`
const cap = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : ''

/** Everything the page draws, worked out here so the page's script only lays it out. */
export function roadmapView(r: Report, x: RoadmapExtras = {}) {
  const job = new Map(r.jobs.map(j => [j.id, j]))
  const feature = new Map(r.features.map(f => [f.id, f]))
  const story = new Map(r.stories.map(s => [s.id, s]))
  const releaseOf = new Map<string, string>()
  for (const rel of r.releases) for (const s of rel.stories) releaseOf.set(s, rel.id)
  const featureRelease = (fid: string) => r.releases.find(rel => rel.stories.some(s => story.get(s)?.feature === fid))?.id ?? ''
  const jobText = (id: string) => { const j = job.get(id); return j ? `When ${j.when}, I want ${j.want}, so ${j.so}.` : '' }

  const gz = r.releases[0]
  const gzJobs = new Set(gz?.completes ?? [])
  const paid = billable(r)
  // what customers already pay for a way round the jobs a release completes
  const paysFor = (completes: string[]) => {
    const from = new Set(completes.map(j => job.get(j)?.from).filter(Boolean))
    return r.workarounds.filter(w => w.pays && from.has(w.id)).map(w => w.pays!).join('; ')
  }

  const releases = r.releases.map((rel, i) => {
    const shipped = [...new Set(rel.stories.map(s => story.get(s)?.feature).filter((f): f is string => !!f))]
    return {
      id: rel.id, name: releaseName(rel.id), month: rel.month, monthName: monthName(rel.month), status: rel.status,
      on: i ? `Builds on ${releaseName(r.releases[i - 1].id)}` : 'Built first',
      completes: rel.completes.map(id => ({ id, want: cap(job.get(id)?.want ?? id), text: jobText(id) })),
      features: shipped.map(id => {
        const mine = rel.stories.filter(s => story.get(s)?.feature === id)
        return { id, name: feature.get(id)?.name ?? id, stories: mine.length, storyTexts: mine.map(s => story.get(s)!.text) }
      }),
      stories: rel.stories.length,
      price: rel.price ?? '',
      paysToday: paysFor(rel.completes),
    }
  })

  const problems = r.problems.map(p => {
    const ws = r.workarounds.filter(w => w.problem === p.id)
    const wids = new Set(ws.map(w => w.id))
    return {
      id: p.id, text: p.text,
      workarounds: ws.map(w => ({ id: w.id, text: w.text, pays: w.pays ?? '' })),
      jobs: r.jobs.filter(j => j.from && wids.has(j.from)).map(j => ({ id: j.id, text: jobText(j.id), gz: gzJobs.has(j.id) })),
    }
  })

  const unknowns = (x.unknowns ?? []).map(u => ({ k: 'Parked', a: u.text, test: '' }))
  if (gz && !paid.length) unknowns.push({
    k: 'Assumption',
    a: `Customers will pay for Ground Zero: ${gz.completes.map(id => job.get(id)?.want).filter(Boolean).join('; ')}.`,
    test: 'Ask five of them to pre-pay, or what they pay today for a way round it.',
  })

  const chat = x.chat ?? []
  const log = chat.flatMap((m, i) => m.role === 'coach' && chat[i + 1]?.role === 'founder' ? [{ q: m.text, a: chat[i + 1].text }] : [])
    .map((l, i) => ({ when: `Q${i + 1}`, ...l }))

  const gzStories = (gz?.stories ?? []).map(id => story.get(id)).filter((s): s is NonNullable<typeof s> => !!s)
  const rules = check(r)
  const checks = [
    { label: 'Who it’s for is named', ok: !!r.product.who },
    { label: 'Every problem has a workaround', ok: r.problems.length > 0 && r.problems.every(p => r.workarounds.some(w => w.problem === p.id)) },
    { label: 'Every job is when, want and so', ok: r.jobs.length > 0 && r.jobs.every(j => j.when && j.want && j.so) },
    { label: 'Every job has a feature', ok: r.jobs.every(j => r.features.some(f => f.job === j.id)) },
    { label: 'Ground Zero gets one job done, end to end', ok: !!gz && gz.completes.length === 1 && !rules.errors.length },
    { label: 'Every story has a “done when”', ok: r.stories.length > 0 && r.stories.every(s => !!s.done) },
    { label: 'Someone already pays for a way round it', ok: paid.length > 0 },
  ]

  return {
    name: r.product.name || 'Your roadmap',
    pitch: r.product.pitch, who: r.product.who, founder: r.founder.name,
    generated: x.generated ?? '',
    gz: gz ? {
      month: monthName(gz.month), jobId: gz.completes[0] ?? '', job: jobText(gz.completes[0] ?? ''),
      price: paid.map(w => w.pays).join('; '), features: releases[0].features.length, stories: gz.stories.length,
    } : null,
    counts: {
      problems: r.problems.length, workarounds: r.workarounds.length, jobs: r.jobs.length,
      features: r.features.length, stories: r.stories.length, releases: r.releases.length,
    },
    problems,
    jobs: r.jobs.map(j => ({ id: j.id, text: jobText(j.id), gz: gzJobs.has(j.id) })),
    features: r.features.map(f => ({ id: f.id, job: f.job, name: f.name, release: featureRelease(f.id) })),
    releases,
    stories: gzStories.map(s => ({ id: s.id, featureId: s.feature, feature: feature.get(s.feature)?.name ?? s.feature, text: s.text, done: s.done })),
    unknowns, log, checks,
    argued: x.argued ?? [],
    complete: !rules.errors.length,
  }
}

const escapeHtml = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** The page's brand: its accents (dark and light), dark ground, the line at the top (trusted HTML) and the footer. */
export type RoadmapBrand = { accent: string; accentLight: string; bg: string; line: string; footer: string }
/** zero2one's, as the page always was: what the report run and every caller without a brand get. */
export const ZERO2ONE_ROADMAP: RoadmapBrand = { accent: '#E68A5C', accentLight: '#C15F3C', bg: '#111111', line: 'zero<b>2</b>one · roadmap-first', footer: 'Made with 021 · roadmap-first coach' }

/** Fills the roadmap template. vendor is either the libraries inlined (works offline) or script tags that load them. */
export function renderRoadmap(template: string, r: Report, x: RoadmapExtras, vendor: string, brand: RoadmapBrand = ZERO2ONE_ROADMAP): string {
  const data = JSON.stringify(roadmapView(r, x)).replace(/</g, '\\u003c')
  return template
    .replace('<!--__021_VENDOR__-->', () => vendor)
    .replace('"__021_DATA__"', () => data)
    .replace(/__021_TITLE__/g, () => escapeHtml(r.product.name || 'Your'))
    .replace(/__021_ACCENT_LIGHT__/g, () => brand.accentLight)
    .replace(/__021_ACCENT__/g, () => brand.accent)
    .replace(/__021_BG__/g, () => brand.bg)
    .replace(/__021_BRAND_LINE__/g, () => brand.line)
    .replace(/__021_FOOTER__/g, () => escapeHtml(brand.footer))
}

/** The libraries as one inline script, for a page that has to work offline. */
export const inlineVendor = (sources: string[]) => `<script>${sources.join('\n;\n').replace(/<\/script/gi, '<\\/script')}</script>`
