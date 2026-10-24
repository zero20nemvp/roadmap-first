// A coach's brand (AX-ROADMAP-FIRST-00067): a folder under brands/ with brand.json, a favicon and an
// optional mark, chosen per container by BRAND. It changes how the coach looks and what it is called,
// never what it does (00070), and a brand with something missing stops the coach at boot (00071).
// Pure apart from reading the folder.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RoadmapBrand } from '../web/roadmap.ts'

const HEX = /^#[0-9A-Fa-f]{6}$/
/** The kiosk theme's tokens, as kiosk.js names them. */
const THEME_KEYS = ['ground', 'deep', 'text', 'dim', 'faint', 'mine', 'live', 'warn', 'bad', 'rule', 'vignette', 'flash', 'shade']

export type Brand = {
  /** The folder it came from. */
  id: string
  /** What the coach is called on the page; COACH_NAME overrides it. */
  name: string
  title: string
  /** The quiet line under the prompt. */
  hint: string
  /** The page around the kiosk: its ground, the text on it, the accent of the team sheet's link, and an optional
      ember: a faint glow in the kiosk's lower corner (Igniter's smoke), without touching the kiosk's working colours. */
  page: { ground: string; text: string; accent: string; ember?: string }
  /** The kiosk's colours (kiosk.js theme tokens). */
  theme: Record<string, string>
  /** The corner mark: an SVG in the folder, or a word set in a font with a gradient; href may be empty. */
  mark: { svg?: string; text?: string; font?: string; fonts?: string; gradient?: [string, string]; href: string; label: string }
  /** A small line under the mark, e.g. "with zero2one"; empty for none. */
  byline: string
  roadmap: RoadmapBrand
  /** The login email: who it is from, what the coach is called in it, and the word before "code" in its subject. */
  email: { from: string; coach: string; code: string }
  favicon: Buffer
  markSvg: Buffer | null
}

/** Loads and checks a brand; anything missing or malformed throws, naming the brand and the field. */
export function loadBrand(dir: string, id: string): Brand {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`BRAND "${id}" isn't a brand name`)
  const folder = join(dir, id), file = join(folder, 'brand.json')
  if (!existsSync(file)) throw new Error(`brand "${id}": there is no ${file}`)
  const b = JSON.parse(readFileSync(file, 'utf8'))
  const fail = (what: string) => { throw new Error(`brand "${id}": ${what}`) }
  const text = (v: unknown, at: string, empty = false) => { if (typeof v !== 'string' || (!empty && !v.trim())) fail(`${at} must be ${empty ? 'a string' : 'some text'}`); return v as string }
  const hex = (v: unknown, at: string) => { if (typeof v !== 'string' || !HEX.test(v)) fail(`${at} must be a colour like #E68A5C`); return v as string }

  text(b.name, 'name'); text(b.title, 'title'); text(b.hint, 'hint'); text(b.byline, 'byline', true)
  for (const k of ['ground', 'text', 'accent']) hex(b.page?.[k], `page.${k}`)
  if (b.page.ember !== undefined) hex(b.page.ember, 'page.ember')
  if (!b.theme || typeof b.theme !== 'object') fail('theme is missing')
  for (const k of ['ground', 'deep', 'text', 'mine']) hex(b.theme[k], `theme.${k}`)
  for (const [k, v] of Object.entries(b.theme)) { if (!THEME_KEYS.includes(k)) fail(`theme.${k} isn't a kiosk colour`); hex(v, `theme.${k}`) }
  const m = b.mark ?? fail('mark is missing')
  text(m.label, 'mark.label'); text(m.href, 'mark.href', true)
  if (!!m.svg === !!m.text) fail('mark needs an svg file or a text, not both')
  if (m.text) { text(m.font, 'mark.font'); if (!Array.isArray(m.gradient) || m.gradient.length !== 2) fail('mark.gradient must be two colours'); m.gradient.forEach((c: unknown, i: number) => hex(c, `mark.gradient[${i}]`)) }
  if (m.fonts !== undefined && !/^https:\/\/fonts\.googleapis\.com\//.test(String(m.fonts))) fail('mark.fonts must be a Google Fonts URL')
  for (const k of ['accent', 'accentLight', 'bg']) hex(b.roadmap?.[k], `roadmap.${k}`)
  text(b.roadmap.line, 'roadmap.line'); text(b.roadmap.footer, 'roadmap.footer')
  text(b.email?.from, 'email.from'); text(b.email.coach, 'email.coach'); text(b.email.code, 'email.code')
  if (!/<[^@\s]+@[^>\s]+>$/.test(b.email.from)) fail('email.from must read Name <address>')

  const read = (f: string, at: string) => { const p = join(folder, f); if (!existsSync(p)) fail(`${at}: there is no ${f}`); return readFileSync(p) }
  return { ...b, id, favicon: read('favicon.svg', 'favicon'), markSvg: m.svg ? read(m.svg, 'mark.svg') : null }
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)

/** The page's head: its title and theme colour, the mark's font, and the page's colours as CSS variables. */
export const pageHead = (b: Brand) => [
  `<meta name="theme-color" content="${b.page.ground}">`,
  `<title>${esc(b.title)}</title>`,
  ...(b.mark.fonts ? [`<link rel="stylesheet" href="${esc(b.mark.fonts)}">`] : []),
  `<style>:root{--brand-ground:${b.page.ground};--brand-text:${b.page.text};--brand-accent:${b.page.accent}${b.mark.gradient ? `;--brand-mark-a:${b.mark.gradient[0]};--brand-mark-b:${b.mark.gradient[1]};--brand-mark-font:'${b.mark.font}'` : ''}}${b.page.ember ? emberCss(b.page.ember) : ''}</style>`,
].join('\n')

/** The ember: the kiosk's warm corner glow, made the brand's colour and a little stronger. */
const emberCss = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  // body first: the head's brand style comes before kiosk.css, so it needs the stronger selector
  return `body .kiosk .k-warm{background:radial-gradient(circle calc(760*var(--u)) at 95% 104%,rgba(${r},${g},${b},.16),transparent)}`
}

/** The mark in the corner: the brand's SVG, or its word set in its font; a link when it has one, and the byline under it. */
export function pageMark(b: Brand) {
  const inner = b.markSvg ? `<img src="/brand-mark.svg" alt="${esc(b.mark.label)}">` : `<span class="word">${esc(b.mark.text!)}</span>`
  const by = b.byline ? `<small>${esc(b.byline)}</small>` : ''
  return b.mark.href
    ? `<a class="mark" href="${esc(b.mark.href)}" target="_blank" rel="noopener" aria-label="${esc(b.mark.label)}">${inner}${by}</a>`
    : `<div class="mark" aria-label="${esc(b.mark.label)}">${inner}${by}</div>`
}

/** What the page's script reads as window.BRAND: a JSON literal, with < escaped so it can't close the tag. */
export const pageScript = (b: Brand, name = b.name) =>
  JSON.stringify({ id: b.id, name, hint: b.hint, theme: b.theme, page: b.page }).replace(/</g, '\\u003c')

/** public/index.html in this brand: its head, its corner mark and window.BRAND filled in. */
export const brandPage = (html: string, b: Brand, name = b.name) => html
  .replace('{{brand_head}}', () => pageHead(b))
  .replace('{{brand_mark}}', () => pageMark(b))
  .replace('{{brand}}', () => pageScript(b, name))
