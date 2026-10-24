import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { brandPage, loadBrand } from './brand.ts'
import { codeEmail } from './mail.ts'
import { renderRoadmap, ZERO2ONE_ROADMAP } from '../web/roadmap.ts'
import type { Report } from '../web/report.ts'

const BRANDS = new URL('./brands', import.meta.url).pathname
const html = readFileSync(new URL('./public/index.html', import.meta.url), 'utf8')
const template = readFileSync(new URL('../web/roadmap.template.html', import.meta.url), 'utf8')
const report: Report = {
  product: { name: 'Doorlist', who: 'club promoters', pitch: 'Ticketing where the promoter keeps the buyers' }, founder: { name: 'Ada' },
  problems: [], workarounds: [], jobs: [], features: [], stories: [], releases: [],
} as unknown as Report
const tokens = (page: string) => JSON.parse(page.match(/window\.BRAND = (\{.*?\}) \/\//)![1])

test('brands: every brand in the folder loads, with everything it needs', () => {
  for (const id of ['zero2one', 'igniter']) {
    const b = loadBrand(BRANDS, id)
    assert.equal(b.id, id)
    assert.ok(b.favicon.toString().includes('<svg'))
  }
})

test('brands: an unknown brand, or one with a field missing, stops the coach at boot', () => {
  assert.throws(() => loadBrand(BRANDS, 'nope'), /there is no/)
  assert.throws(() => loadBrand(BRANDS, '../etc'), /isn't a brand name/)
  const dir = mkdtempSync(join(tmpdir(), 'brands-'))
  cpSync(join(BRANDS, 'igniter'), join(dir, 'broken'), { recursive: true })
  const b = JSON.parse(readFileSync(join(dir, 'broken', 'brand.json'), 'utf8'))
  delete b.roadmap.accent; b.theme.mine = 'pink'
  writeFileSync(join(dir, 'broken', 'brand.json'), JSON.stringify(b))
  assert.throws(() => loadBrand(dir, 'broken'), /brand "broken": theme.mine must be a colour/)
})

test('zero2one: the page renders exactly what it always had', () => {
  const page = brandPage(html, loadBrand(BRANDS, 'zero2one'))
  assert.doesNotMatch(page, /\{\{brand/)
  assert.match(page, /<title>Roadmap-first coach · zero2one<\/title>/)
  assert.match(page, /<meta name="theme-color" content="#111111">/)
  assert.match(page, /--brand-ground:#111111;--brand-text:#EFEDE6;--brand-accent:#E68A5C/)
  assert.match(page, /<a class="mark" href="https:\/\/zero2one.ee" target="_blank" rel="noopener" aria-label="zero2one"><img src="\/brand-mark.svg" alt="zero2one"><\/a>/)
  assert.doesNotMatch(page, /family=Montserrat|body \.kiosk \.k-warm|class="word"|<small>with/, 'no wordmark font, no ember, no typeset mark, no byline')
  const t = tokens(page)
  assert.equal(t.name, 'Roadmap First')
  assert.equal(t.hint, 'roadmap-first coach · one question at a time · the answers are yours')
  assert.deepEqual(t.theme, { ground: '#141414', deep: '#050505', text: '#EFEDE6', dim: '#A8A8A8', faint: '#6E6E6E', mine: '#E68A5C', rule: '#2D2D2D', vignette: '#000000', flash: '#FFF4EC', shade: '#000000' })
  assert.equal(loadBrand(BRANDS, 'zero2one').favicon.toString(), readFileSync(join(BRANDS, 'zero2one', 'favicon.svg'), 'utf8'))
})

test('zero2one: the roadmap page and the login email are as they were', () => {
  const b = loadBrand(BRANDS, 'zero2one')
  assert.deepEqual(b.roadmap, ZERO2ONE_ROADMAP, 'the brand and the default for callers without one agree')
  const page = renderRoadmap(template, report, {}, '', b.roadmap)
  assert.equal(page, renderRoadmap(template, report, {}, ''), 'the same page as without a brand')
  assert.match(page, /--accent:#C15F3C/); assert.match(page, /--bg:#111111; --surface/); assert.match(page, /--accent:#E68A5C/)
  assert.match(page, /<span>zero<b>2<\/b>one · roadmap-first<\/span>/)
  assert.match(page, /<footer><span>Made with 021 · roadmap-first coach<\/span>/)
  assert.doesNotMatch(page, /__021_/)
  const e = codeEmail('ada@example.com', '123456', b.email)
  assert.deepEqual(e, codeEmail('ada@example.com', '123456'), 'the same email as before brands')
  assert.equal(e.subject, '123456 is your roadmap-first code')
  assert.match(e.text, /Your code for the roadmap-first coach: 123456/)
  assert.equal(b.email.from, 'Roadmap First <noreply@zero2one.ee>')
})

test('igniter: the page wears Igniter, quietly, with zero2one beside it', () => {
  const b = loadBrand(BRANDS, 'igniter'), page = brandPage(html, b)
  assert.match(page, /<title>Igniter coach · roadmap-first<\/title>/)
  assert.match(page, /--brand-accent:#E0117D/)
  assert.match(page, /<div class="mark" aria-label="Igniter"><span class="word">IGNITER<\/span><small>with zero2one<\/small><\/div>/)
  assert.match(page, /family=Montserrat:wght@900/)
  assert.match(page, /body \.kiosk \.k-warm\{[^}]*rgba\(200,16,46,/, 'the crimson ember')
  assert.equal(tokens(page).theme.mine, '#E0117D')
  assert.equal(tokens(page).theme.live, undefined, 'the working colours (features, finished) stay the kiosk’s')
  assert.equal(tokens(brandPage(html, b, 'Igniter Tallinn')).name, 'Igniter Tallinn', 'COACH_NAME still overrides')
})

test('igniter: the roadmap page and the login email are Igniter’s', () => {
  const b = loadBrand(BRANDS, 'igniter')
  const page = renderRoadmap(template, report, {}, '', b.roadmap)
  assert.match(page, /--accent:#B00C62/); assert.match(page, /--bg:#0B0507; --surface/); assert.match(page, /--accent:#E0117D/)
  assert.match(page, /<span><b>Igniter<\/b> · roadmap-first<\/span>/)
  assert.match(page, /<footer><span>Igniter · roadmap-first coach · with zero2one<\/span>/)
  assert.doesNotMatch(page, /#E68A5C|zero<b>2/)
  const e = codeEmail('ada@example.com', '123456', b.email)
  assert.equal(e.subject, '123456 is your Igniter code')
  assert.match(e.text, /Your code for the Igniter coach: 123456/)
  assert.equal(b.email.from, 'Igniter <noreply@zero2one.ee>')
})
