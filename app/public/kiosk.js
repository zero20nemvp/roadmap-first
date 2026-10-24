// The kiosk pattern (PATTERN.md): one full screen, one exchange at a time.
// Taken from the Gist kiosk (~/Code/macmail/kiosk): its phases, its motion and its constants.
//
//   import { mount } from './kiosk.js'
//   const k = mount({ ask: async (text, out) => { out.write('…') } })
//
// The app supplies only what is said and what it means; the kit owns the screen.
// Four extension points change the look without touching the kit:
//   theme       colours and fonts           THEMES, or your own tokens
//   background  what is behind the plane    BACKGROUNDS, or el => { … }
//   animation   send, think, land, fail     ANIMATIONS, or (g, t) => { … } on the canvas
//   motion      the timings                 MOTION, any of them overridden

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches

/** Timings, in seconds (Theme.swift). The send is 0.98s, the thinking holds at least 2.153s, the flash 0.26s before the rows. */
export const MOTION = {
  send: REDUCED ? .15 : .98, minVortex: REDUCED ? .6 : 2.153, flashHold: .26, cascade: .9, turn: .32, lineIn: .6, rowGap: .14,
}

/** Colours and fonts. Each key is a CSS variable on .kiosk (--mine, --ground, …); a theme sets any of them. gist is kiosk.css's defaults. */
export const THEMES = {
  gist: {},
  dawn: {
    ground: '#F4F0E8', deep: '#E7E1D5', text: '#1B2430', dim: '#4A5866', faint: '#7A8591',
    mine: '#2B6CB0', live: '#2F8F5B', warn: '#B7791F', bad: '#C53030', rule: '#D6CFC0', vignette: '#B8AE9C', flash: '#2B6CB0',
  },
  ember: {
    ground: '#1A1210', deep: '#0E0907', text: '#F3E9E2', dim: '#B9A69A', faint: '#8C786C',
    mine: '#F2A65A', live: '#9BD77E', warn: '#F2D25A', bad: '#F0736F', rule: '#3A2A22', vignette: '#060302',
  },
}

/** What is behind the plane. A background fills the ground element; it may use .k-breathe, which brightens while typing. */
export const BACKGROUNDS = {
  /** Gist's: a breathing glow, two still corner glows, one drifting on 38s and 53s loops, a vignette (Ground.swift). */
  gist: el => { el.innerHTML = '<i class="k-breathe"></i><i class="k-cool"></i><i class="k-warm"></i><i class="k-drift"><b></b></i><i class="k-vignette"></i>' },
  /** The gradient and the vignette, nothing moving. */
  plain: el => { el.innerHTML = '<i class="k-vignette"></i>' },
  /** Two large soft glows, in the accent and the live colour, wandering slowly. */
  aurora: el => { el.innerHTML = '<i class="k-breathe"></i><i class="k-aurora"><b></b><b></b></i><i class="k-vignette"></i>' },
}

const easeOut = x => 1 - Math.pow(1 - x, 3)
const easeInOut = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
const lerp = (a, b, k) => a + (b - a) * k
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))

/**
 * The canvas animations, one per phase. Each is (g, t) => more, drawn every frame:
 * t is seconds since the phase began, g the drawing kit (see draw() in mount), and the return says
 * whether it still has something to draw. A think animation also takes (g, t, fade, drop) so a land can fade it out.
 */
export const ANIMATIONS = {
  send: {
    /** Gist's: streaks gather into the message, it seals, morphs into the first ball, and a ring goes out. */
    gather(g, t) {
      const { U, W, H } = g, c = g.rgb('mine'), p = t / g.motion.send, diag = Math.hypot(W, H), my = H / 2, mx = g.left + 200 * U
      g.bloom(mx, my, c, .42, .75 * diag, t, .5)
      const k0 = clamp(p / .34)
      if (k0 < 1) {
        g.fill(c); g.blur(12 * U)
        for (const s of g.streaks) {
          const k = easeOut(clamp((k0 - s.d * .5) / (1 - s.d * .5)))
          const len = s.len * (.5 + s.r) * U * (1 - .72 * k)
          g.pill(lerp(mx + s.dx * 590 * U, mx, k) - len / 2, lerp(my + s.dy * 77 * U, my, k), len, s.th * U, s.a * (1 - k))
        }
        g.blur(0)
      }
      const shown = Math.min(1, easeOut(k0) * 1.4)
      const seal = p > .34 && p < .44 ? 1 + .05 * Math.sin(Math.PI * (p - .34) / .1) : 1
      const m = easeInOut(clamp((p - .44) / .42))
      const tx = g.ball0, ty = g.floor, bd = 43.5 * U
      g.fill(c)
      for (const layer of [0, 1]) {
        g.blur(layer ? 0 : 16 * U)
        for (const [fw, dy] of [[.96, -55], [.64, -23], [.88, 23], [.46, 55]]) {
          const bw = lerp(fw * 400 * U * seal, bd, m), bh = lerp(12 * U * seal, bd, m)
          const grow = layer ? 0 : 10.875 * U * (1 - m)
          g.pill(lerp(g.left, tx - bd / 2, m) - grow / 2, lerp(my + dy * U, ty, m), bw + grow, bh + grow, shown * (layer ? .95 : .55))
        }
      }
      g.blur(0)
      if (p >= .86) {
        const k = clamp((p - .86) / .14)
        g.bloom(tx, ty, g.rgb('flash'), .34, .10 * diag, t - .86 * g.motion.send, .5)
        g.ring(tx, ty, bd / 2 + 400 * U * k, 2.4 * U, `rgba(${c},${Math.pow(1 - k, 1.8) * .48})`, 21 * U)
      }
      return true
    },
    /** Quieter: the message, as four bars, lifts and fades into a point. */
    rise(g, t) {
      const { U, H } = g, c = g.rgb('mine'), p = clamp(t / g.motion.send), k = easeInOut(p)
      g.fill(c)
      ;[[.96, -55], [.64, -23], [.88, 23], [.46, 55]].forEach(([fw, dy], i) => {
        const kk = clamp(k * 1.3 - i * .1)
        g.pill(lerp(g.left, g.W / 2 - 6 * U, kk), lerp(H / 2 + dy * U, g.floor - 40 * U, kk), lerp(fw * 400 * U, 12 * U, kk), 12 * U, .9 * (1 - p * .4))
      })
      return true
    },
  },
  think: {
    /** Gist's: three balls split 69 apart and bounce 75 high, with a squash at the floor. */
    balls(g, t, fade = 1, drop = 1) {
      const { U, W } = g, c = g.rgb('mine'), bd = 43.5 * U, base = g.ball0
      ;[[0, base, base], [.26, base, W / 2], [.45, W / 2, W / 2 + 69 * U]].forEach(([born, from, to], i) => {
        if (t < born) return
        const k = i ? easeOut(clamp((t - born) / .19)) : 1
        const sc = i ? lerp(.34, 1, k) : 1
        const tau = t - (.64 + i * .1364)
        let hb = 0, sq = 0
        if (!g.reduced && tau > 0) { hb = Math.pow(Math.abs(Math.sin(Math.PI * tau / .62)), .62); sq = Math.pow(1 - hb, 4) * clamp(tau / .155) }
        const bw = bd * sc * (1 + .26 * sq), bh = bd * sc * (1 - .20 * sq)
        const a = g.reduced ? fade * (.6 + .4 * Math.sin(t * 3 + i)) : fade
        g.ball(c, lerp(from, to, k), g.floor - hb * 75 * U * drop + (bd - bh) / 2, bw, bh, a)
      })
      return true
    },
    /** One ball at the centre that breathes, and a ring that leaves it every 1.4s. */
    pulse(g, t, fade = 1) {
      const { U, W, H } = g, c = g.rgb('mine'), bd = 43.5 * U, b = (Math.sin(t * Math.PI * 2 / 1.4) + 1) / 2
      g.ball(c, W / 2, H / 2, bd * (1 + .18 * b), bd * (1 + .18 * b), fade)
      const k = (t % 1.4) / 1.4
      if (!g.reduced) g.ring(W / 2, H / 2, bd / 2 + 160 * U * easeOut(k), 2 * U, `rgba(${c},${(1 - k) * .5 * fade})`, 6 * U)
      return true
    },
    /** Three small balls circling the centre, the trailing two smaller. */
    orbit(g, t, fade = 1) {
      const { U, W, H } = g, c = g.rgb('mine'), r = 46 * U
      for (let i = 0; i < 3; i++) {
        const a = (g.reduced ? 0 : t * Math.PI * 2 / 1.5) - i * .5, s = 22 * U * (1 - i * .22)
        g.ball(c, W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r, s, s, fade * (1 - i * .25))
      }
      return true
    },
    /** Five dots in a line, a wave running through them. */
    wave(g, t, fade = 1) {
      const { U, W, H } = g, c = g.rgb('mine'), s = 16 * U
      for (let i = 0; i < 5; i++) {
        const y = g.reduced ? 0 : Math.sin(t * Math.PI * 2 / 1.1 - i * .55) * 18 * U
        g.ball(c, W / 2 + (i - 2) * 34 * U, H / 2 + y, s, s, fade * (.55 + .45 * (y / (18 * U) + 1) / 2))
      }
      return true
    },
  },
  land: {
    /** Gist's: the thinking drops and fades in 0.16s, and a flash blooms from the floor. */
    flash(g, t) {
      const k = easeOut(clamp(t / .16))
      if (k < 1) g.think(t, 1 - k, 1 - k)
      return g.bloom(g.W / 2, g.floor, g.rgb('flash'), .96, .75 * Math.hypot(g.W, g.H), t, 1) || k < 1
    },
    /** The thinking fades over 0.3s under a gentle glow in the accent. */
    soft(g, t) {
      const k = easeOut(clamp(t / .3))
      if (k < 1) g.think(t, 1 - k, 1)
      return g.bloom(g.W / 2, g.H / 2, g.rgb('mine'), .28, .6 * Math.hypot(g.W, g.H), t, 1.4) || k < 1
    },
  },
  fail: {
    /** A red bloom from the centre. */
    bloom(g, t) { return g.bloom(g.W / 2, g.H / 2, g.rgb('bad'), .42, .75 * Math.hypot(g.W, g.H), t, 1) },
  },
}

const lh = d => Math.round(d * (1.62 - 0.0055 * d))     // Typeset.swift:58
const SAID = 28                                         // the reply's size, in design units
const now = () => performance.now() / 1000
const sleep = s => new Promise(r => setTimeout(r, s * 1000))
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e }
const rgbOf = hex => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim()); return m ? m.slice(1).map(h => parseInt(h, 16)).join(',') : null }

/**
 * Mount the kiosk full screen.
 * opts, what is said:
 *   ask(text, out)       required. Answer one message: out.write(delta) as words arrive; resolve when done;
 *                        throw an Error (message shown, .code passed to onError) when it fails.
 *   invite, hint         the first screen's faint question and its quiet line under it.
 *   status()             the quiet line under each reply (where we are, what is noted).
 *   statusAction()       what tapping the status line does on a reply, or null.
 *   history()            [{ echo, text }] oldest first, for ↑. The last one is the reply on screen.
 *   commands             [{ name: '/wall', hint: '…', run(k), when() }]. Type / to see them; when(), if given, says whether it's offered now.
 *   intercept(text, k)   take Enter before ask (a form asked one screen at a time); return true if taken.
 *   escape(k)            take Escape when nothing is typed; return true if taken.
 *   after(result, k)     after a reply has landed.
 *   onError(err, k)      after a failed send has been put back.
 *   clean(text)          tidy a reply before it is set (default strips markdown marks).
 * opts, how it looks:
 *   theme                a THEMES name, or tokens: { mine: '#hex', ground, deep, text, dim, faint, live, warn, bad, rule,
 *                        vignette, flash, sans, mono }, or { base: 'dawn', mine: '#…' } to change a few.
 *   background           a BACKGROUNDS name, or el => { … } to fill the layer behind the plane yourself.
 *   animation            { send, think, land, fail }: an ANIMATIONS name or your own (g, t) => more.
 *   motion               any of MOTION's timings.
 */
export function mount(opts) {
  const M = { ...MOTION, ...opts.motion }
  const pick = (kind, v, dflt) => typeof v === 'function' ? v : ANIMATIONS[kind][v || dflt] || ANIMATIONS[kind][dflt]
  const anim = {
    send: pick('send', opts.animation?.send, 'gather'), think: pick('think', opts.animation?.think, 'balls'),
    land: pick('land', opts.animation?.land, 'flash'), fail: pick('fail', opts.animation?.fail, 'bloom'),
  }

  const root = el('div', 'kiosk idle')
  root.dataset.phase = 'rest'
  root.innerHTML = `<div class="k-ground" aria-hidden="true"></div>
<canvas class="k-field" aria-hidden="true"></canvas>
<main class="k-stage"><div class="k-plane">
  <section class="k-block" hidden aria-live="polite"><div class="k-echo"></div><div class="k-rows"></div><button class="k-status" type="button" tabindex="-1"></button></section>
  <div class="k-prompt"><textarea rows="1" maxlength="4000" spellcheck="true" autocomplete="off" enterkeyhint="send"></textarea><div class="k-commands" hidden></div></div>
  <div class="k-note"></div>
</div></main>`
  document.body.append(root)
  const q = s => root.querySelector(s)
  const ta = q('textarea'), plane = q('.k-plane'), block = q('.k-block'), rowsEl = q('.k-rows'), note = q('.k-note'), echoEl = q('.k-echo'), statusEl = q('.k-status'), cmdEl = q('.k-commands')
  ta.setAttribute('aria-label', opts.label || 'Your answer')
  const all = opts.commands || []
  /** The commands offered right now: those with no when(), or whose when() says yes. */
  const offered = () => all.filter(c => !c.when || c.when())
  const clean = opts.clean || (t => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/^#+\s*/gm, '').replace(/^\s*[-*]\s+/gm, '• '))

  /* ---------- theme and background ---------- */
  function theme(t) {
    const tokens = typeof t === 'string' ? THEMES[t] || {} : { ...(THEMES[t?.base] || {}), ...t }
    for (const [k, v] of Object.entries(tokens)) {
      if (k === 'base') continue
      root.style.setProperty('--' + k, v)
      const rgb = typeof v === 'string' && rgbOf(v)
      if (rgb) root.style.setProperty(`--${k}-rgb`, rgb)
    }
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta && tokens.ground) meta.content = tokens.ground
  }
  function background(b) {
    const ground = q('.k-ground')
    ground.textContent = ''
    ;(typeof b === 'function' ? b : BACKGROUNDS[b] || BACKGROUNDS.gist)(ground, api)
  }

  let U = 1, W = 0, H = 0, FRAME = 1180, COL = 900
  let screen = null, live = null       // what the block shows; the last reply that landed
  let view = 'live', hist = 0, lit = 0, list = null, tour = null, cmdAt = 0
  let busy = false, inviting = false

  /* ---------- scale ---------- */
  function measure() {
    const vv = window.visualViewport
    W = innerWidth; H = vv ? vv.height : innerHeight
    U = clamp(Math.min(W / 1440, H / 900), .8, 2)
    FRAME = Math.min(1180 * U, W - 32)
    COL = Math.min(900 * U, FRAME)
    root.style.setProperty('--u', U + 'px'); root.style.setProperty('--frame', FRAME + 'px'); root.style.setProperty('--col', COL + 'px')
    field.size()
  }

  /* ---------- text ---------- */
  const meter = document.createElement('canvas').getContext('2d')
  const sansFont = d => `300 ${d * U}px ${getComputedStyle(root).getPropertyValue('--sans')}`

  /** Lines as the reply will be set: greedy wrap to the column, a short gap between paragraphs. */
  function wrap(text, d, max) {
    meter.font = sansFont(d)
    const out = [], w = s => meter.measureText(s).width / U
    clean(text).trim().split(/\n\s*\n/).forEach((para, i) => {
      if (i) out.push({ gap: true })
      for (const ln of para.split('\n')) {
        let cur = ''
        for (const word of ln.split(/\s+/).filter(Boolean)) {
          const t = cur ? cur + ' ' + word : word
          if (!cur || meter.measureText(t).width <= max) cur = t
          else { out.push({ t: cur, w: w(cur) }); cur = word }
        }
        if (cur) out.push({ t: cur, w: w(cur) })
      }
    })
    return out
  }

  /* ---------- the block's rows, revealed one at a time ---------- */
  const rows = {
    items: [], shown: 0, settled: 0, gap: M.rowGap, nextAt: 0, live: false, timers: [],
    reset() { this.timers.forEach(clearTimeout); this.timers = []; this.items = []; this.shown = 0; this.settled = 0; this.nextAt = 0; this.live = false; rowsEl.textContent = '' },
    /** Set a reply's text; while it streams, the last line is still growing and waits as a band. */
    set(text, final) {
      const lines = wrap(text, SAID, COL)
      lines.forEach((ln, i) => {
        let r = this.items[i]
        if (!r) { r = el('div', 'k-row'); r.append(el('span')); rowsEl.append(r); this.items.push(r) }
        r.classList.toggle('gap', !!ln.gap)
        r.style.setProperty('--fs', SAID); r.style.setProperty('--lh', lh(SAID))
        r.style.setProperty('--w', clamp(ln.w || 0, 56, 900))
        if (r.firstChild.textContent !== (ln.t || '')) r.firstChild.textContent = ln.t || ''
      })
      while (this.items.length > lines.length && this.items.length > this.shown) this.items.pop().remove()
      this.settled = final ? lines.length : Math.max(0, lines.length - 1)
      if (this.live) this.reveal()
    },
    setItems(els) { els.forEach(e => { rowsEl.append(e); this.items.push(e) }); this.settled = els.length },
    start(total) { this.live = true; this.gap = Math.min(M.rowGap, total / Math.max(1, this.settled - this.shown)); this.nextAt = now(); this.reveal() },
    reveal() {
      for (; this.shown < this.settled; this.shown++) {
        const r = this.items[this.shown], at = Math.max(now(), this.nextAt)
        this.nextAt = at + this.gap
        this.timers.push(setTimeout(() => r.classList.add('in'), (at - now()) * 1000))
      }
    },
    all() { this.items.forEach(r => r.classList.add('in')); this.shown = this.settled = this.items.length },
    idle() { return sleep(Math.max(0, this.nextAt - now())) },
  }

  /* ---------- screens ---------- */
  /** Put a screen in the block. screen: { echo, text, status, act } or { items, status, act }; label replaces the "you · echo" line.
      how: 'instant' (all in), 'turn' (out, then rows condense in), 'bands' (rows wait; the caller reveals). */
  async function show(scr, how = 'turn') {
    if (how === 'turn' && !block.hidden && screen) {
      block.classList.add('leaving'); await sleep(.18); block.classList.remove('leaving')
    }
    screen = scr
    rows.reset()
    block.hidden = false
    echoEl.textContent = scr.label ?? (scr.echo ? `you  ·  ${scr.echo.replace(/\s+/g, ' ')}` : '')
    setStatus(scr.status, scr.act)
    rowsEl.classList.toggle('wide', !!scr.items)
    rowsEl.classList.toggle('whole', !!scr.whole)
    if (scr.items) rows.setItems(scr.items)
    else rows.set(scr.text || '', true)
    if (how === 'instant') rows.all()
    else if (how === 'turn') rows.start(M.turn)
    place()
  }

  function setStatus(text, act) {
    statusEl.textContent = text || ''
    statusEl.classList.toggle('act', !!act)
    statusEl.onclick = act ? e => { e.stopPropagation(); act() } : null
  }

  function hide() { screen = null; rows.reset(); block.hidden = true; place() }

  const liveScreen = (echo, text) => ({ echo, text, status: opts.status?.() || '', act: opts.statusAction?.() || null })

  /* ---------- placing the plane ---------- */
  function place() {
    const reading = !block.hidden && !root.classList.contains('over')
    const prompt = ta.parentElement
    const y = reading ? H / 2 - block.offsetHeight / 2 : H / 2 - (prompt.offsetTop + prompt.offsetHeight / 2)
    plane.style.transform = `translate(-50%, ${Math.round(y)}px)`
  }

  /* ---------- the prompt ---------- */
  function fitPrompt() {
    meter.font = sansFont(54)
    const widest = Math.max(1, ...ta.value.split('\n').map(l => meter.measureText(l).width))
    const d = Math.floor(clamp(54 * FRAME / widest, 34, 54))   // PromptType.swift: 54 down to 34, then wrap
    ta.style.fontSize = d * U + 'px'
    ta.style.lineHeight = lh(d) * U + 'px'
    ta.style.height = '0'
    ta.style.height = ta.scrollHeight + 'px'
  }

  const matching = () => { const t = ta.value.trim().toLowerCase(); return t.startsWith('/') ? offered().filter(c => c.name.startsWith(t)) : [] }

  function onInput() {
    const t = ta.value
    root.classList.toggle('typing', t.length > 0)
    root.classList.toggle('over', t.length > 0 && !block.hidden)
    root.classList.remove('idle')
    if (t.length && note.querySelector('.invite, .hint')) setNote()
    if (!t.length && block.hidden && inviting) invite()
    const m = matching()
    cmdAt = clamp(cmdAt, 0, Math.max(0, m.length - 1))
    cmdEl.textContent = ''
    m.forEach((c, i) => {
      const r = el('div', i === cmdAt ? 'on' : ''); r.append(el('b', '', c.name), el('span', '', c.hint || ''))
      r.onclick = e => { e.stopPropagation(); runCommand(c) }
      cmdEl.append(r)
    })
    cmdEl.hidden = !m.length
    fitPrompt(); place()
  }

  function setNote(kind, text) {
    note.textContent = ''
    if (kind) note.append(el('div', kind, text))
  }

  function invite() {
    note.textContent = ''
    if (opts.invite) note.append(el('div', 'invite', opts.invite))
    if (opts.hint) note.append(el('div', 'hint', opts.hint))
  }

  function setPhase(p) {
    root.dataset.phase = p
    ta.readOnly = p !== 'rest' && p !== 'answer'
    if (p === 'rest' || p === 'answer') ta.focus({ preventScroll: true })
  }

  function clearPrompt() { ta.value = ''; onInput() }

  /* ---------- the field: the canvas the animations draw on (Field.swift) ---------- */
  const field = (() => {
    const cv = q('.k-field'), cx = cv.getContext('2d')
    const blurs = 'filter' in cx
    let mode = 'idle', t0 = 0, raf = 0, think0 = 0, w = 0, h = 0
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const streaks = Array.from({ length: 72 }, () => ({ dx: rnd() * 2 - 1, dy: rnd() * 2 - 1, len: 35 + rnd() * 165, th: 2.1 + rnd() * 4.5, a: .18 + rnd() * .54, r: rnd(), d: rnd() * .25 }))
    const css = getComputedStyle(root)

    function size() {
      const dpr = Math.min(2, devicePixelRatio || 1)
      w = innerWidth; h = innerHeight
      cv.width = w * dpr; cv.height = h * dpr
      cx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const blur = px => { if (blurs) cx.filter = px ? `blur(${px}px)` : 'none' }

    /** The drawing kit handed to every animation. Sizes in px; multiply design units by g.U. */
    const g = {
      cx, streaks, motion: M, reduced: REDUCED, ease: { out: easeOut, inOut: easeInOut }, lerp, clamp,
      /** A colour token as "r,g,b": rgb('mine'), rgb('flash'), rgb('bad'). */
      rgb: name => css.getPropertyValue(`--${name}-rgb`).trim() || '255,255,255',
      blur, fill: c => { cx.fillStyle = `rgb(${c})` },
      /** A rounded bar centred on y. */
      pill(x, y, bw, bh, a) { cx.globalAlpha = a; cx.beginPath(); cx.roundRect(x, y - bh / 2, bw, bh, bh / 2); cx.fill(); cx.globalAlpha = 1 },
      /** A glowing ball: a blurred halo at 1.5x and a solid core. */
      ball(c, x, y, bw, bh, a = 1) {
        cx.fillStyle = `rgb(${c})`
        blur(16 * U); cx.globalAlpha = .55 * a; cx.beginPath(); cx.ellipse(x, y, bw * .75, bh * .75, 0, 0, Math.PI * 2); cx.fill()
        blur(0); cx.globalAlpha = .95 * a; cx.beginPath(); cx.ellipse(x, y, bw / 2, bh / 2, 0, 0, Math.PI * 2); cx.fill()
        cx.globalAlpha = 1
      },
      ring(x, y, r, width, style, soft = 0) {
        blur(soft); cx.strokeStyle = style; cx.lineWidth = width
        cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2); cx.stroke(); blur(0)
      },
      /** A radial bloom that rises, falls to 38% and fades (breakEnvelope); s stretches its time. Returns false once spent. */
      bloom(x, y, color, peak, reach, t, s) {
        const r = .06 * s, f = .18 * s, tl = .40 * s
        const e = t < 0 ? 0 : t < r ? easeOut(t / r) : t < r + f ? 1 - .62 * ((t - r) / f) : t < r + f + tl ? .38 * Math.pow(1 - (t - r - f) / tl, 1.9) : 0
        if (e <= 0) return false
        const rad = lerp(43.5 * U, reach, easeOut(clamp(t / (.11 * s))))
        const gr = cx.createRadialGradient(x, y, 0, x, y, rad)
        gr.addColorStop(0, `rgba(${color},${peak * e})`); gr.addColorStop(.35, `rgba(${color},${peak * e * .4})`); gr.addColorStop(1, `rgba(${color},0)`)
        cx.fillStyle = gr; cx.fillRect(0, 0, w, h)
        return true
      },
    }
    function frame() {
      raf = 0
      cx.clearRect(0, 0, w, h)
      const t = now() - t0
      // the geometry of this frame: the screen, the frame's left edge, where the first ball sits, the floor it bounces on
      Object.assign(g, { U, W, H, left: W / 2 - FRAME / 2, frame: FRAME, ball0: W / 2 - 69 * U, floor: H / 2 + 37.5 * U })
      g.think = (dt, fade, drop) => anim.think(g, t0 - think0 + dt, fade, drop)
      const more = mode === 'send' ? anim.send(g, Math.min(t, M.send)) : mode === 'idle' ? false : anim[mode](g, t)
      if (more) raf = requestAnimationFrame(frame)
      else mode = 'idle'
    }
    function go(m) {
      mode = m; t0 = now()
      if (m === 'think') think0 = t0
      if (!raf) raf = requestAnimationFrame(frame)
    }
    return { size, send: () => go('send'), think: () => go('think'), land: () => go('land'), fail: () => go('fail') }
  })()

  /* ---------- a send: release, thinking, landing, rows ---------- */
  function until(test, register) {
    return new Promise(res => { const check = () => { if (test()) { register(() => {}); res() } }; register(check); check() })
  }

  /** Run one exchange through the full motion. work(out) calls out.write(delta) and resolves when done. */
  async function flight(echo, work) {
    busy = true; inviting = false
    const prev = screen, words = ta.value
    const out = { text: '', done: false, error: null }
    let wakeFn = () => {}
    out.write = d => { out.text += d; wakeFn() }
    Promise.resolve().then(() => work(out)).catch(e => { out.error = e instanceof Error ? e : new Error(String(e)) }).finally(() => { out.done = true; wakeFn() })

    setNote()
    ta.value = ''; root.classList.remove('typing', 'over'); cmdEl.hidden = true; fitPrompt()
    setPhase('release'); field.send()
    await sleep(M.send)
    setPhase('vortex'); field.think(); hide()
    const v0 = now()
    await until(() => out.done || (out.text.trim() && !out.error), f => wakeFn = f)
    await sleep(Math.max(0, M.minVortex - (now() - v0)))

    const fail = async () => {
      wakeFn = () => {}
      field.fail()
      if (prev) await show(prev, 'instant'); else hide()
      setPhase(prev ? 'answer' : 'rest')
      ta.value = words; onInput()
      setNote('err', out.error.message || 'Something went wrong. Try again.')
      busy = false
      opts.onError?.(out.error, api)
      return null
    }
    if (out.error) return fail()

    setPhase('landing'); field.land()
    await show({ echo, text: out.text, status: '' }, 'bands')
    rows.set(out.text, out.done)
    await sleep(M.flashHold)
    rows.start(M.cascade)
    // the rest of the reply streams in under the eye, a line at a time
    await until(() => out.done, check => { wakeFn = () => { if (!out.error) { rows.set(out.text, out.done); place() } check() } })
    if (out.error) return fail()
    rows.set(out.text, true); rows.gap = M.rowGap; rows.reveal(); place()
    await rows.idle(); await sleep(M.lineIn)
    live = screen = liveScreen(echo, out.text)
    setStatus(screen.status, screen.act); place()
    view = 'live'
    setPhase('answer')
    busy = false
    opts.after?.(out, api)
    return out
  }

  /** Send text through ask(). */
  const send = text => flight(text, out => opts.ask(text, out))

  /* ---------- lists, history, commands ---------- */
  function itemEls(items) {
    return items.map(x => {
      const e = el('div', 'k-item'), d = el('i', 'dot'), inner = el('div'), who = el('div', 'who')
      d.style.setProperty('--c', x.dot || 'transparent')
      who.append(el('span', '', x.title), el('span', 'stamp', x.stamp || ''))
      inner.append(who, el('div', 'what', x.text || ''))
      e.append(d, inner)
      return e
    })
  }

  /** Show a list five to a screen: ↑ ↓ and Space move the lit row, Enter opens it, Escape goes back.
      actions: { key: (item, k) => … } for keys pressed on the lit row, e.g. { t: trash }; keys: their hint in the status line.
      at: the row to light, e.g. where it was when an action shows the list again. */
  function showList(items, { title = '', open = null, actions = null, keys = '', at = 0 } = {}) {
    view = 'list'; list = { items, title, open, actions, keys }; lit = clamp(at, 0, Math.max(0, items.length - 1))
    clearPrompt(); setNote()
    return pageList('turn')
  }
  function pageList(how) {
    const start = Math.floor(lit / 5) * 5, page = list.items.slice(start, start + 5), els = itemEls(page)
    els[lit - start]?.classList.add('lit')
    return show({ items: els, status: `${start + 1}–${start + page.length} of ${list.items.length}${list.title ? ' · ' + list.title : ''}${list.keys ? ' · ' + list.keys : ''} · esc to go back`, act: back }, how)
  }
  function moveLit(d) {
    const was = Math.floor(lit / 5)
    lit = clamp(lit + d, 0, list.items.length - 1)
    if (Math.floor(lit / 5) !== was) return pageList('turn')
    rows.items.forEach((e, i) => e.classList.toggle('lit', i === lit % 5))
  }

  /** Walk through screens, one at a time: Enter, ↓ or Space for the next, ↑ for the one before, Escape to leave.
      steps: [{ title, text } | { title, items }]; items are read whole, four to a screen. done(k) runs after the last.
      at: the screen to open on (-1 for the last, e.g. coming back from where done led); end: what Enter on the last one says. */
  function showTour(steps, { title = '', done = null, at = 0, end = 'enter to finish' } = {}) {
    const pages = []
    for (const s of steps) {
      if (!s.items) { pages.push(s); continue }
      const n = Math.ceil(s.items.length / 4)
      for (let i = 0; i < n; i++) pages.push({ ...s, items: s.items.slice(i * 4, i * 4 + 4), title: n > 1 ? `${s.title} · ${i + 1} of ${n}` : s.title })
    }
    if (!pages.length) return
    view = 'tour'; list = null; tour = { pages, at: clamp(at < 0 ? pages.length + at : at, 0, pages.length - 1), title, done, end }
    clearPrompt(); setNote()
    return pageTour()
  }
  function pageTour() {
    const p = tour.pages[tour.at], last = tour.at === tour.pages.length - 1
    const status = [tour.title, `${tour.at + 1} of ${tour.pages.length}`, last ? tour.end : 'enter for next', tour.at ? '↑ back' : '', 'esc to leave'].filter(Boolean).join(' · ')
    return show({ label: p.title || '', whole: true, ...(p.items ? { items: itemEls(p.items) } : { text: p.text }), status, act: () => stepTour(1) })
  }
  function stepTour(d) {
    const at = tour.at + d
    if (at < 0) return
    if (at >= tour.pages.length) { const done = tour.done; back(); return done?.(api) }
    tour.at = at
    return pageTour()
  }

  function walk(d) {
    const ex = opts.history?.() || []
    if (!ex.length) return
    if (view !== 'hist') { if (d > 0) return; view = 'hist'; hist = ex.length - 1 }
    hist = clamp(hist + d, 0, ex.length - 1)
    if (d > 0 && hist === ex.length - 1) return back()
    const e = ex[hist]
    show({ echo: e.echo, text: e.text, status: `earlier · ${hist + 1} of ${ex.length} · ↓ later · esc for now`, act: back })
  }

  function back() {
    if (view === 'live') return
    view = 'live'; list = null; tour = null
    if (live) show({ ...live, status: opts.status?.() || live.status, act: opts.statusAction?.() || null }); else hide()
  }

  function runCommand(c) { clearPrompt(); cmdEl.hidden = true; c.run(api) }

  /* ---------- keys ---------- */
  async function act() {
    if (busy) return
    const text = ta.value.trim()
    const commands = offered()
    if (text.startsWith('/') && all.length) {
      const m = matching()
      if (m.length && text.length > 1) return runCommand(m[cmdAt] || m[0])
      return setNote('err', commands.length ? `Commands: ${commands.map(c => c.name).join(', ')}. Everything else, just say.` : 'No commands yet. Just say it.')
    }
    if (!text && view === 'tour') return stepTour(1)
    if (opts.intercept && await opts.intercept(text, api)) return
    if (!text) { if (view === 'list' && list.open) list.open(list.items[lit], api); return }
    if (view !== 'live') { view = 'live'; list = null; if (live) show(live, 'instant') }
    send(text)
  }

  ta.addEventListener('keydown', e => {
    if (e.isComposing) return
    const empty = !ta.value, open = !cmdEl.hidden
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); act() }
    else if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); cmdAt += e.key === 'ArrowDown' ? 1 : -1; const n = matching().length; cmdAt = (cmdAt + n) % n; onInput() }
    else if (open && e.key === 'Tab') { e.preventDefault(); const c = matching()[cmdAt]; ta.value = c.name; onInput() }
    else if (e.key === 'Escape') {
      e.preventDefault()
      if (!empty) clearPrompt()
      else if (opts.escape?.(api)) return
      else if (view !== 'live') back()
      else setNote()
    }
    else if (busy || !empty) return
    else if (view === 'tour' && (e.key === 'ArrowDown' || e.key === ' ')) { e.preventDefault(); stepTour(1) }
    else if (view === 'tour' && e.key === 'ArrowUp') { e.preventDefault(); stepTour(-1) }
    else if (view === 'list' && (e.key === 'ArrowDown' || e.key === ' ')) { e.preventDefault(); moveLit(1) }
    else if (view === 'list' && e.key === 'ArrowUp') { e.preventDefault(); moveLit(-1) }
    else if (view === 'list' && list.actions?.[e.key] && list.items[lit]) { e.preventDefault(); list.actions[e.key](list.items[lit], api, lit) }
    else if (root.dataset.phase === 'answer' && e.key === 'ArrowUp') { e.preventDefault(); walk(-1) }
    else if (view === 'hist' && e.key === 'ArrowDown') { e.preventDefault(); walk(1) }
  })
  ta.addEventListener('input', onInput)
  root.addEventListener('pointerdown', e => { if (e.target !== ta && !e.target.closest('button,.k-commands')) { e.preventDefault(); ta.focus({ preventScroll: true }) } })
  addEventListener('resize', () => { measure(); if (screen && !screen.items) show(screen, 'instant'); fitPrompt(); place() })
  window.visualViewport?.addEventListener('resize', () => { measure(); place() })

  /* ---------- the app's handle ---------- */
  const api = {
    /** Send text through ask(), with the full motion. */
    send,
    /** Run any work through the full motion: work(out) calls out.write(text). echo is the quiet "you · …" line. */
    flight: (echo, work) => flight(echo, work),
    /** Change the screen without a send (a step of a form, a local answer): it condenses in. */
    say: (text, { echo = '', status = '' } = {}) => show({ echo, text, status }),
    /** Show a reply as the live one, e.g. on resume. */
    resume: async (echo, text) => { live = liveScreen(echo, text); view = 'live'; root.classList.remove('idle'); await show(live); setPhase('answer') },
    /** Start over: the reply leaves, and the screen is the first one again, with the invitation. */
    reset: async () => {
      if (!block.hidden) { block.classList.add('leaving'); await sleep(.18); block.classList.remove('leaving') }
      live = null; view = 'live'; list = null; tour = null
      clearPrompt(); hide(); setPhase('rest'); inviting = true; invite()
    },
    list: showList,
    /** Walk through screens one at a time, e.g. a summary at the end. */
    tour: showTour,
    back,
    note: setNote,
    invite: () => { inviting = true; invite() },
    status: () => { if (live && view === 'live' && screen) { live = { ...live, status: opts.status?.() || '', act: opts.statusAction?.() || null }; setStatus(live.status, live.act) } },
    clear: clearPrompt,
    /** Change the look while running: a theme, a background, or animations ({ think: 'orbit' }). */
    theme, background,
    animate: a => { for (const kind of ['send', 'think', 'land', 'fail']) if (a[kind]) anim[kind] = pick(kind, a[kind], Object.keys(ANIMATIONS[kind])[0]) },
    get busy() { return busy },
    get view() { return view },
    /** Where the lit row of a list is. */
    get lit() { return lit },
    root,
  }

  theme(opts.theme || 'gist')
  background(opts.background || 'gist')
  measure()
  Promise.race([document.fonts.ready, sleep(1.5)]).then(() => { measure(); fitPrompt(); place() })
  setPhase('rest')
  return api
}
