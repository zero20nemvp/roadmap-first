// The emails: the founder's series (docs/emails, 01 to 04) and a note to the facilitator for each
// finished conversation. Pure: the series and its schedule, and each email as text and HTML.
// The server sends them through the smtp container's relay.

export type Template = { key: string; subject: string; body: string }
/** What each founder has been sent, kept beside their conversation. */
export type MailLog = { sent: Record<string, string>; stopped?: string; facilitator?: string }

/** The series: email 01 once the flight plan is ready, then each after the one before, by days. */
export const SERIES: { key: string; after: number }[] = [
  { key: '01', after: 0 },
  { key: '02', after: 3 },
  { key: '03', after: 4 },
  { key: '04', after: 4 },
]

const DAY = 86_400_000

/** The next email this founder is due, if any, at `now`. */
export function due(log: MailLog, now: number): string | null {
  if (log.stopped) return null
  for (let i = 0; i < SERIES.length; i++) {
    const { key, after } = SERIES[i]
    if (log.sent[key]) continue
    if (i === 0) return key
    const before = log.sent[SERIES[i - 1].key]
    return before && now - Date.parse(before) >= after * DAY ? key : null
  }
  return null
}

/** Reads a docs/emails file: the front matter goes, the **Subject:** line becomes the subject. */
export function parseTemplate(key: string, md: string): Template {
  const body = md.replace(/^---\n[\s\S]*?\n---\n/, '').trim()
  const m = body.match(/^\*\*Subject:\*\*\s*(.+)\n+/)
  if (!m) throw new Error(`email ${key} has no **Subject:** line`)
  return { key, subject: m[1].trim(), body: body.slice(m[0].length).trim() }
}

export const fill = (s: string, vars: Record<string, string>) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** The small markdown the emails use, as plain text: links written out, bold dropped. */
export function toText(md: string): string {
  return md.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1: $2')
}

/** The same, as simple HTML: paragraphs, numbered and bulleted lists, bold and links. */
export function toHtml(md: string): string {
  const inline = (s: string) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${u}" style="color:#1F4FE0">${t}</a>`)
    .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" style="color:#1F4FE0">$2</a>')
    .replace(/\n/g, '<br>')
  const blocks = md.split(/\n\s*\n/).map(b => {
    const lines = b.split('\n')
    if (lines.every(l => /^\d+\.\s/.test(l))) return `<ol>${lines.map(l => `<li>${inline(l.replace(/^\d+\.\s/, ''))}</li>`).join('')}</ol>`
    if (lines.every(l => /^[-*]\s/.test(l))) return `<ul>${lines.map(l => `<li>${inline(l.replace(/^[-*]\s/, ''))}</li>`).join('')}</ul>`
    return `<p>${inline(b)}</p>`
  })
  return `<div style="font:16px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#141C26;max-width:560px">${blocks.join('\n')}</div>`
}

export type Email = { to: string; subject: string; text: string; html: string }

/** One email of the series for one founder, with a way to stop the rest. */
export function seriesEmail(t: Template, to: string, vars: Record<string, string>, stopLink: string): Email {
  const body = fill(t.body, vars)
  const stop = `Don't want the rest of these? [Stop them here](${stopLink}).`
  return {
    to,
    subject: fill(t.subject, vars),
    text: `${toText(body)}\n\n--\n${toText(stop)}\n`,
    html: `${toHtml(body)}\n<p style="font:13px/1.5 sans-serif;color:#56636F;margin-top:28px;border-top:1px solid #D2D9E0;padding-top:12px">${toHtml(stop).replace(/^<div[^>]*>|<\/div>$/g, '').replace(/^<p>|<\/p>$/g, '')}</p>`,
  }
}

/** The facilitator's note when a founder leaves their email: who, what, and where to look. */
export function facilitatorEmail(to: string, f: { name: string; email: string; consent: boolean; product: string; reportLink: string; adminLink: string; hasPlan: boolean }): Email {
  const md = [
    `**${f.name}** (${f.email}) finished the coach for **${f.product || 'their product'}**.`,
    f.consent ? 'They said yes to the emails: email 01, their report, goes out as soon as the flight plan is ready, and the follow-ups after it.' : 'They said no to the emails, so nothing goes to them.',
    f.hasPlan ? `Their roadmap: [${f.reportLink}](${f.reportLink})` : 'Their flight plan isn’t cut yet; it will be on the roadmap link once it is.',
    `Everything, with the intake for the report run: [admin](${f.adminLink})`,
  ].join('\n\n')
  return { to, subject: `Roadmap finished: ${f.product || f.name}`, text: toText(md), html: toHtml(md) }
}

/** The login code: short and plain, with nothing in it worth forwarding. */
export function codeEmail(to: string, code: string): Email {
  const md = [
    `Your code for the roadmap-first coach: **${code}**`,
    'Type or paste it where the coach asked for it. It works once, for the next 15 minutes.',
    'If you didn’t ask for it, ignore this email: nothing happens without the code.',
  ].join('\n\n')
  return { to, subject: `${code} is your roadmap-first code`, text: toText(md), html: toHtml(md) }
}
