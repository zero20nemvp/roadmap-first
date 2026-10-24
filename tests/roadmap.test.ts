import { describe, expect, test } from 'claude-code/testing'

import example from '../examples/ticketing/report'
import { type Report } from '../web/report'
import { renderRoadmap, roadmapView } from '../web/roadmap'

const ticketing = (): Report => structuredClone(example)
const template = '<title>__021_TITLE__ Roadmap</title><!--__021_VENDOR__--><script>const R = "__021_DATA__";</script>'

describe('the roadmap website', () => {
  test('Ground Zero leads: its job, month and stories', () => {
    const v = roadmapView(ticketing())
    expect(v.releases[0].name).toBe('Ground Zero')
    expect(v.gz?.jobId).toBe(ticketing().releases[0].completes[0])
    expect(v.gz?.stories).toBe(ticketing().releases[0].stories.length)
    expect(v.stories.length).toBe(ticketing().releases[0].stories.length)
  })

  test('each problem is traced to the jobs drawn out of its workarounds', () => {
    const r = ticketing(), v = roadmapView(r)
    for (const p of v.problems) for (const j of p.jobs) {
      const from = r.jobs.find(x => x.id === j.id)!.from!
      expect(r.workarounds.find(w => w.id === from)!.problem).toBe(p.id)
    }
  })

  test('a release is billable when a workaround behind its job is paid for', () => {
    const r = ticketing(), v = roadmapView(r)
    const paid = r.workarounds.filter(w => w.pays).map(w => w.id)
    for (const rel of v.releases) {
      const behind = rel.completes.map(c => r.jobs.find(j => j.id === c.id)!.from)
      expect(!!rel.paysToday).toBe(behind.some(f => f && paid.includes(f)))
    }
  })

  test('the conversation becomes the log, question then answer', () => {
    const v = roadmapView(ticketing(), { chat: [
      { role: 'coach', text: 'What are you building?' }, { role: 'founder', text: 'Doorlist' },
      { role: 'coach', text: 'Who for?' }, { role: 'founder', text: 'Promoters' }, { role: 'coach', text: 'Thanks' },
    ] })
    expect(v.log).toEqual([{ when: 'Q1', q: 'What are you building?', a: 'Doorlist' }, { when: 'Q2', q: 'Who for?', a: 'Promoters' }])
  })

  test('the page carries its data safely', () => {
    const r = ticketing()
    r.problems[0].text = '</script><script>alert(1)</script>'
    const html = renderRoadmap(template, r, {}, '<script src="/v.js"></script>')
    expect(html.includes('</script><script>alert(1)')).toBe(false)
    expect(html.includes('"__021_DATA__"')).toBe(false)
    expect(html.includes('<script src="/v.js"></script>')).toBe(true)
  })
})
