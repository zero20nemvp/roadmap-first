import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { LADDER, RECORD_DESCRIPTION, RECORD_SCHEMA, coachSection } from './coach'
import {
  STATIONS,
  apply,
  briefChecks,
  briefMarkdown,
  emptySession,
  gaps,
  loadSession,
  minutesLeft,
  park,
  pieceCount,
  printPage,
  progressDots,
  renderPage,
  stage1,
  stationOf,
  whereText,
  type Change,
  type Evidence,
  type Session,
} from './engine'

const P = '021'
const PANE = '021-wall'
const DIR = '021'
const VENDOR = ['three.min.js', 'd3.min.js', 'gsap.min.js', 'ScrollTrigger.min.js']

const saved = atom({ plugin: '021', key: 'session' } as const, '')
const stuck = atom({ plugin: '021', key: 'stuck' } as const, { code: '', n: 0 })
const isMuted = atom({ plugin: '021', key: 'isMuted' } as const, false)

const NOTE = { yellow: '#FFE45C', blue: '#9AD6FF', pink: '#FF9DBB', green: '#A6E8A8', ink: '#1D1B16' }
const ACCENT = '#7D9CFF'
const FAILED = '021 could not record that just now. Carry on with the next question; the session so far is saved in 021/roadmap.json.'

const LOST = /\b(where am i|i'?m lost|lost|confused|what now|what next|what('?s| is) next|help)\b/i
const STUCK = /\b(i don'?t know|dont know|not sure|no idea|idk|stuck|unsure|can'?t think|no clue)\b/i

const SUBCOMMANDS = [
  ['roadmap', 'Start, or pick up where you left off'],
  ['where', 'Where you are, what’s done, what’s next'],
  ['why', 'Why this question is being asked'],
  ['back <n>', 'Go back to an exercise and change an answer'],
  ['park [note]', 'Don’t know yet? Park it as an unknown to test'],
  ['photo <image>', 'Read a photo of your post-it wall'],
  ['map', 'Open the wall pane'],
  ['view', 'Write and open your roadmap page'],
  ['brief', 'Write and show the one-page brief'],
  ['print', 'Write a printable sheet of your notes as post-its'],
  ['demo', 'Load the Redline example, ready at exercise 6'],
  ['mute', 'Turn the station chime off or on'],
] as const

// The project the session runs in; set at session.start.
let cwd = ''
const file = (name: string) => `${cwd}/${DIR}/${name}`

async function current($: EngineInterface): Promise<Session | null> {
  const text = await read($, saved)
  return text ? loadSession(text) : null
}

async function save($: EngineInterface, s: Session) {
  const text = JSON.stringify(s, null, 2)
  await update($, saved, () => text)
  await $.fs.write(file('roadmap.json'), text + '\n')
  paintStatus($, s)
}

function paintStatus($: EngineInterface, s: Session) {
  const st = stationOf(s)
  $.ui.status(st > 8
    ? `021 ▸ stage 1 ready · ${stage1(s).length} features · ${pieceCount(s)} pieces · /021 view`
    : `021 ▸ ${st}/8 ${STATIONS[st]!.short} · ${pieceCount(s)} pieces · ${gaps(s).length} gaps`)
}

async function chime($: EngineInterface) {
  if (await read($, isMuted)) return
  await $.audio.play({ asset: 'assets/chime.wav' }).catch(() => undefined)
}

async function openFile($: EngineInterface, path: string): Promise<boolean> {
  for (const argv of [['open', path], ['xdg-open', path], ['cmd', '/c', 'start', '', path]]) {
    const ran = await $.process.run(argv).catch(() => null)
    if (ran && ran.exitCode === 0) return true
  }
  return false
}

async function writeOutputs($: EngineInterface, s: Session) {
  const root = $.plugin.root
  const template = await $.fs.read(`${root}/assets/roadmap.template.html`)
  const vendor = (await Promise.all(VENDOR.map(f => $.fs.read(`${root}/assets/vendor/${f}`)))).join('\n;\n')
  const today = new Date(await $.clock.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  await $.fs.write(file('roadmap.html'), renderPage(template, s, vendor, today))
  await $.fs.write(file('brief.md'), briefMarkdown(s))
}

async function begin($: EngineInterface, s: Session, prompt: string) {
  await save($, s)
  void $.ui.open({ id: PANE, title: '021 wall' })
  void $.prompt.submit({ text: prompt })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    cwd = e.cwd
    await $.command.register({ name: P, description: 'Roadmap-first coach: /021 roadmap to start, /021 where if you’re lost', argumentHint: '[roadmap|where|why|back|park|photo|map|view|brief|print|demo|mute]' })
    await $.tool.register({ name: 'record', description: RECORD_DESCRIPTION, inputSchema: RECORD_SCHEMA, isDeferred: false })
    await $.tool.register({ name: 'park', description: 'Park the current 021 question as an unknown to test, when the founder doesn’t know yet and agrees to come back to it.', inputSchema: { type: 'object', properties: { note: { type: 'string', description: 'One line: what is unknown' } }, required: ['note'] }, isDeferred: false })
    await $.tool.register({ name: 'where', description: 'Read the 021 roadmap session: the station, the gaps left in order, and everything recorded so far.', isDeferred: false })

    const path = file('roadmap.json')
    if (await $.fs.exists(path)) {
      const s = loadSession(await $.fs.read(path))
      await update($, saved, () => JSON.stringify(s, null, 2))
      paintStatus($, s)
      const st = stationOf(s)
      $.ui.toast(st > 8 ? `021: ${s.name || 'your roadmap'} is complete. /021 view opens it.` : `021: welcome back. You were at exercise ${st}, ${STATIONS[st]!.name}. /021 roadmap carries on.`)
    }
    return next(e)
  })

  // ── the model's tools ────────────────────────────────────────────────────

  on('tool.call', { tool: 'mcp__021__record' }, async ($, e) => {
    const s = await current($)
    if (!s) return { result: 'No 021 session is running here. Ask the founder to run /021 roadmap.' }
    const changes = (Array.isArray(e.changes) ? e.changes : []) as Change[]
    const before = stationOf(s)
    let applied
    try {
      applied = apply(s, changes)
    } catch (err) {
      return { result: `Nothing was recorded: a change was malformed (${String(err)}). Check the fields against the tool description and call again.` }
    }
    const next = applied.session
    next.log.push({
      at: new Date(await $.clock.now()).toISOString(),
      station: Math.min(before, 8),
      q: String(e.question ?? ''),
      a: String(e.answer ?? ''),
      ev: (e.evidence === 'assumption' ? 'assumption' : 'evidence') as Evidence,
    })
    await save($, next)

    const after = stationOf(next)
    const g = gaps(next)
    for (const ev of applied.events.slice(0, 3)) $.ui.toast(ev)
    if (applied.events.length > 3) $.ui.toast(`…and ${applied.events.length - 3} more on the wall`)

    // the rung resets once the gap they were stuck on closes
    const rung = await read($, stuck)
    if (rung.code && rung.code !== g[0]?.code) await update($, stuck, () => ({ code: '', n: 0 }))

    const lines: string[] = []
    if (applied.errors.length) lines.push('Not recorded (ask about these): ' + applied.errors.join('; '))
    if (after > before) {
      for (let st = before; st < Math.min(after, 9); st++) $.ui.toast(`✓ Exercise ${st} done: ${STATIONS[st]!.name}`)
      void chime($)
      lines.push(after > 8 ? '✓ Every gap is filled. Stage 1 is ready.' : `✓ Exercise ${before} is done. Now exercise ${after}: ${STATIONS[after]!.name}. Say so in one line.`)
    } else if (g.length > gaps(s).length) {
      lines.push(`The answer opened ${g.length - gaps(s).length} new gap(s). That is the process working; tell them so.`)
    }
    if (after > 8) {
      await writeOutputs($, next)
      lines.push(`The roadmap page and brief are written to ${DIR}/roadmap.html and ${DIR}/brief.md. Tell them; /021 view opens the page.`)
    } else {
      lines.push(`Next gap (exercise ${g[0]!.station}): ${g[0]!.text}. Why: ${g[0]!.why}`)
      lines.push(`${g.length} gaps left · stage 1: ${stage1(next).length} features, ${pieceCount(next)} pieces.`)
    }
    return { result: lines.join('\n') }
  }).catch(() => ({ result: FAILED }))

  on('tool.call', { tool: 'mcp__021__park' }, async ($, e) => {
    const s = await current($)
    const gap = s && gaps(s)[0]
    if (!s || !gap) return { result: 'Nothing to park.' }
    const next = park(s, gap.code, String(e.note ?? gap.text))
    await save($, next)
    await update($, stuck, () => ({ code: '', n: 0 }))
    $.ui.toast(`? Parked as an unknown to test: ${String(e.note ?? gap.text)}`)
    const g = gaps(next)
    return { result: `Parked. It is on the unknowns list and needs a test before the brief. ${g[0] ? `Next gap: ${g[0].text}. Why: ${g[0].why}` : 'No gaps left.'}` }
  }).catch(() => ({ result: FAILED }))

  on('tool.call', { tool: 'mcp__021__where' }, async $ => {
    const s = await current($)
    if (!s) return { result: 'No 021 session is running here.' }
    const g = gaps(s)
    return { result: `${whereText(s)}\n\nGaps in order:\n${g.slice(0, 12).map(x => `- [ex ${x.station}] ${x.text}`).join('\n')}${g.length > 12 ? `\n…and ${g.length - 12} more` : ''}` }
  }).catch(() => ({ result: FAILED }))

  // ── what the model reads ─────────────────────────────────────────────────

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const s = await current($)
    if (!s) return composed
    const rung = await read($, stuck)
    const code = gaps(s)[0]?.code
    return { sections: [...composed.sections, { id: '021:coach', text: coachSection(s, rung.code === code ? rung.n : 0), scope: 'session' as const }] }
  })

  on('prompt.submit', async ($, e, next) => {
    const s = e.command ? null : await current($)
    if (!s) return next(e)
    const context = [...(e.context ?? [])]
    const g = gaps(s)[0]
    if (g && STUCK.test(e.text)) {
      const rung = await update($, stuck, r => (r.code === g.code ? { code: g.code, n: r.n + 1 } : { code: g.code, n: 1 }))
      const n = (rung as { n: number } | undefined)?.n ?? 1
      context.push(`021: the founder is stuck on “${g.text}”. ${LADDER[Math.min(n, LADDER.length - 1)]}`)
    }
    if (LOST.test(e.text) && e.text.length < 80) {
      $.ui.toast(`021: you’re at exercise ${Math.min(stationOf(s), 8)}. /021 where shows the whole route.`)
      context.push(`021: the founder may feel lost. Before anything else, tell them in three short lines: where they are (exercise and name), what is done, and what comes next. Then ask the next question.\n${whereText(s)}`)
    }
    return next({ ...e, context })
  }).catch(($, e, next) => next(e))

  // The prompt box's guessed reply would answer for the founder: keep it out while coaching.
  on('prompt.suggest', async ($, e, next) => ((await current($)) ? { isShown: false } : next(e))).catch(($, e, next) => next(e))

  // ── /021 ─────────────────────────────────────────────────────────────────

  on('command.run', { command: P }, async ($, e) => {
    const [sub = '', ...rest] = e.args.trim().split(/\s+/)
    const arg = rest.join(' ')
    const s = await current($)

    switch (sub.toLowerCase()) {
      case 'roadmap':
      case 'start': {
        if (s) {
          const st = stationOf(s)
          await begin($, s, `Carry on with my 021 roadmap. I was at exercise ${Math.min(st, 8)}.`)
          return { text: `${whereText(s)}\n\nPicking up where you left off…` }
        }
        const fresh = emptySession()
        await begin($, fresh, 'Start my 021 roadmap session.')
        return {
          text: [
            '021 · roadmap-first, one question at a time',
            '',
            'You’ll work through 8 short exercises, the same ones the workshop runs with post-its:',
            ...STATIONS.slice(1).map(x => `  ${x.n}  ${x.name}`),
            '',
            `About ${minutesLeft(0)} minutes in all. You leave with a one-page stage-1 brief and a roadmap page you can scroll and share.`,
            'Claude asks; you answer. It never answers for you. Stop whenever you like: /021 roadmap picks up where you left off.',
            '',
            'Lost at any point? Type “where am I”, or /021 where. Stuck? Say “I don’t know”.',
            `Your work is saved in ./${DIR}/.`,
          ].join('\n'),
        }
      }
      case 'demo': {
        if (s && arg !== '--force') return { text: `021: a session already exists in ./${DIR}/. Run /021 demo --force to replace it with the Redline example.` }
        const demo = loadSession(await $.fs.read(`${$.plugin.root}/examples/redline/roadmap.json`))
        await begin($, demo, 'Carry on with my 021 roadmap. I was at exercise 6.')
        return { text: `Loaded the Redline example from the workshop: a contract checker for freelancers, ready at exercise 6, Argue it down.\n\n${whereText(demo)}` }
      }
      case 'where':
        return { text: s ? whereText(s) : 'No roadmap here yet. /021 roadmap starts one.' }
      case 'why': {
        const g = s && gaps(s)[0]
        if (!s) return { text: 'No roadmap here yet. /021 roadmap starts one.' }
        if (!g) return { text: 'Every gap is filled. /021 view opens your roadmap.' }
        const st = STATIONS[g.station]!
        return { text: `Exercise ${g.station}, ${st.name}: ${st.goal}\n\nThe open question: ${g.text}\nWhy it matters: ${g.why}\nThe exercise is done when: ${st.done}` }
      }
      case 'back': {
        if (!s) return { text: 'No roadmap here yet.' }
        const n = Number(arg)
        if (!Number.isInteger(n) || n < 0 || n > 8) return { text: 'Which exercise? /021 back 3 goes back to exercise 3.' }
        void $.prompt.submit({ text: `I want to go back to exercise ${n}, ${STATIONS[n]!.name}, and change an answer. Show me what I said there and ask what I’d like to change.` })
        return { text: `Going back to exercise ${n}, ${STATIONS[n]!.name}. Nothing is lost: what you change there carries forward.` }
      }
      case 'park': {
        const g = s && gaps(s)[0]
        if (!s || !g) return { text: 'Nothing to park.' }
        await save($, park(s, g.code, arg || g.text))
        await update($, stuck, () => ({ code: '', n: 0 }))
        void $.prompt.submit({ text: 'I’ve parked that question as an unknown. Next question, please.' })
        return { text: `Parked “${arg || g.text}” as an unknown to test. You’ll be asked how to test it before the brief.` }
      }
      case 'photo': {
        if (!arg) return { text: 'Give the photo’s path: /021 photo ~/Desktop/wall.jpg' }
        if (!s) await save($, emptySession())
        void $.ui.open({ id: PANE, title: '021 wall' })
        void $.prompt.submit({ text: `Read the photo of my post-it wall at ${arg}. Transcribe every note you can read, grouped by colour: yellow = jobs, blue = features (and which job they sit under), pink = gaps, green = stories; and any stage columns or journey strip. Show me what you read as a short list, say which notes you couldn’t read, and ask me to confirm or correct it before recording anything with mcp__021__record. Then carry on coaching from the first gap.` })
        return { text: `Reading ${arg}. You’ll see what was read before anything is recorded.` }
      }
      case 'map':
      case 'wall': {
        const opened = await $.ui.open({ id: PANE, title: '021 wall' })
        return { text: opened.isPlaced ? 'The wall is open.' : 'The wall pane needs a wider window. The band above the prompt shows where you are meanwhile.' }
      }
      case 'view': {
        if (!s) return { text: 'No roadmap here yet. /021 roadmap starts one, or /021 demo loads the example.' }
        await writeOutputs($, s)
        const isOpen = await openFile($, file('roadmap.html'))
        return { text: `${isOpen ? 'Opened' : 'Wrote'} ./${DIR}/roadmap.html${stationOf(s) <= 8 ? ' (in progress: it fills in as you go)' : ''}. The brief is in ./${DIR}/brief.md.` }
      }
      case 'brief': {
        if (!s) return { text: 'No roadmap here yet.' }
        await writeOutputs($, s)
        const open = briefChecks(s).filter(c => !c.ok).length
        return { text: `${briefMarkdown(s)}\n(${open ? `${open} of 6 checks still open` : 'All 6 checks pass'} · saved to ./${DIR}/brief.md)` }
      }
      case 'print': {
        if (!s) return { text: 'No roadmap here yet.' }
        await $.fs.write(file('notes.html'), printPage(s))
        const isOpen = await openFile($, file('notes.html'))
        return { text: `${isOpen ? 'Opened' : 'Wrote'} ./${DIR}/notes.html. Print it on A4 and cut along the dashes.` }
      }
      case 'mute': {
        const muted = await update($, isMuted, m => !m)
        return { text: muted ? 'Chime off.' : 'Chime on.' }
      }
      default:
        return {
          text: [
            '021 · roadmap-first coach',
            ...SUBCOMMANDS.map(([c, d]) => `  /021 ${c.padEnd(14)} ${d}`),
            '',
            s ? whereText(s) : 'Start with /021 roadmap.',
          ].join('\n'),
        }
    }
  }).catch(() => ({ text: '021: that didn’t work. Your work is saved in ./021/roadmap.json; try again, or /021 where.' }))

  // ── what the person sees ─────────────────────────────────────────────────

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = e.props.hasSurvey ? null : await current($)
    if (!s) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const st = stationOf(s)
    const g = gaps(s)
    if (st > 8) {
      return (
        <Box flexDirection="row" gap={1}>
          <Text color={ACCENT} bold>021</Text>
          <Text>✓ Stage 1 is ready: {stage1(s).length} features, {pieceCount(s)} pieces.</Text>
          <Text dimColor>/021 view opens your roadmap · /021 brief</Text>
        </Box>
      )
    }
    const role = st === 6 ? ' · Claude is the visiting table' : ''
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1}>
          <Text color={ACCENT} bold>021</Text>
          <Text bold>Ex {st} of 8 · {STATIONS[st]!.name}</Text>
          <Text color={ACCENT}>{progressDots(st)}</Text>
          <Text dimColor>~{minutesLeft(st)} min left{role}</Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text dimColor>Next:</Text>
          <Text wrap="truncate-end">{g[0]!.text}</Text>
          <Text dimColor>· {pieceCount(s)} pieces · {g.length} gaps · /021 where</Text>
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const s = await current($)
    if (!s) return <Text dimColor>No roadmap yet. /021 roadmap starts one.</Text>
    const st = stationOf(s)
    const g = gaps(s)
    const s1 = stage1(s)
    const later = s.features.filter(f => f.stage !== 1)
    // Above the prompt the band already says where you are: keep the wall to the notes.
    if (e.props.placement === 'inline') {
      return (
        <Box flexDirection="column">
          <Text dimColor wrap="truncate-end">
            {STATIONS.map(x => `${x.n < st ? '✓' : x.n === st ? '▶' : '·'}${x.short}`).join('  ')}
          </Text>
          {s1.length ? (
            <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
              <Text dimColor>Stage 1 · {pieceCount(s)} pieces:</Text>
              {s1.map(f => <Text backgroundColor={NOTE.blue} color={NOTE.ink}> {f.name}{f.argued ? (f.argued.keep ? ' ✓' : '') : ' ?'} </Text>)}
            </Box>
          ) : s.jobs.length ? (
            <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
              <Text dimColor>Jobs:</Text>
              {s.jobs.map(j => <Text backgroundColor={NOTE.yellow} color={NOTE.ink}> {j.id}{j.id === s.pays?.job ? ' ●' : ''} </Text>)}
            </Box>
          ) : null}
          {s.unknowns.length ? <Text color="#FF9DBB" wrap="truncate-end">? {s.unknowns.length} unknowns to test · {s.unknowns.map(u => u.text).join(' · ')}</Text> : null}
        </Box>
      )
    }
    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold>{s.name || 'Your product'}</Text>
          {s.idea?.pitch ? <Text dimColor wrap="wrap">{s.idea.pitch}</Text> : null}
        </Box>
        <Box flexDirection="column">
          {STATIONS.map(x => (
            <Text color={x.n === st ? ACCENT : undefined} dimColor={x.n > st} bold={x.n === st}>
              {x.n < st ? '✓' : x.n === st ? '▶' : '·'} {x.n} {x.name}
            </Text>
          ))}
        </Box>
        {g[0] ? (
          <Box flexDirection="column">
            <Text dimColor>NOW</Text>
            <Text wrap="wrap">{g[0].text}</Text>
            <Text dimColor wrap="wrap">Why: {g[0].why}</Text>
          </Box>
        ) : (
          <Text color="#5BD08B">✓ Every gap filled. /021 view</Text>
        )}
        {s.pays ? (
          <Box flexDirection="column">
            <Text dimColor>THE JOB THAT PAYS</Text>
            <Text backgroundColor={NOTE.yellow} color={NOTE.ink} wrap="wrap"> ● {s.pays.job} {s.jobs.find(j => j.id === s.pays!.job)?.want ?? ''} </Text>
          </Box>
        ) : s.jobs.length ? (
          <Box flexDirection="column">
            <Text dimColor>JOBS · {s.jobs.length}</Text>
            {s.jobs.slice(0, 6).map(j => <Text backgroundColor={NOTE.yellow} color={NOTE.ink} wrap="truncate-end"> {j.id} {j.want} </Text>)}
          </Box>
        ) : null}
        {s1.length ? (
          <Box flexDirection="column">
            <Text dimColor>STAGE 1 · {s1.length} features · {pieceCount(s)} pieces</Text>
            {s1.map(f => (
              <Text backgroundColor={NOTE.blue} color={NOTE.ink} wrap="truncate-end"> {f.id} {f.name}{f.argued ? (f.argued.keep ? ' ✓' : '') : ' ?'} </Text>
            ))}
            {later.length ? <Text dimColor wrap="wrap">Later: {later.map(f => f.name).join(', ')}</Text> : null}
          </Box>
        ) : null}
        {g.filter(x => x.station === 5).length ? (
          <Box flexDirection="column">
            <Text dimColor>GAPS ON THE WALK</Text>
            {g.filter(x => x.station === 5).slice(0, 4).map(x => <Text backgroundColor={NOTE.pink} color={NOTE.ink} wrap="truncate-end"> {x.text} </Text>)}
          </Box>
        ) : null}
        {s.stories.length ? (
          <Box flexDirection="column">
            <Text dimColor>STORIES · {s.stories.length} of {s.journey.length}</Text>
            {s.stories.slice(0, 6).map(x => <Text backgroundColor={NOTE.green} color={NOTE.ink} wrap="truncate-end"> {x.step} {x.done} </Text>)}
          </Box>
        ) : null}
        {s.unknowns.length ? (
          <Box flexDirection="column">
            <Text dimColor>UNKNOWNS TO TEST · {s.unknowns.length}</Text>
            {s.unknowns.slice(0, 5).map(u => <Text color="#FF9DBB" wrap="truncate-end">? {u.text}{u.test ? '' : ' (no test yet)'}</Text>)}
          </Box>
        ) : null}
      </Box>
    )
  })
}
