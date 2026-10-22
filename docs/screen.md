# Reading the screen

While a session is running, five things tell you where you are. You never need to scroll back to find out.

## The band above the prompt

The band is the main signal. It sits right where you type:

```
021  Ex 6 of 8 · Argue it down  ●●●●●●◉○○  ~25 min left · Claude is the visiting table
Next: Would they still pay without F7 Accounts and history? (no journey step uses it) · 11 pieces · 15 gaps · /021 where
```

- **Ex 6 of 8 · Argue it down** is the exercise you're on.
- **●●●●●●◉○○** shows progress across the nine stations: ● done, ◉ here, ○ to come.
- **~25 min left** is a rough time to the end.
- **Claude is the visiting table** appears at exercise 6, when Claude argues against your features.
- **Next:** is the question being worked on now.
- **11 pieces · 15 gaps** is the stage-1 size and what's still missing. Gaps can go *up*, for example when the walk finds a step with nothing under it. That's the process working.

When every gap is filled, the band changes to `✓ Stage 1 is ready` and points you to `/021 view`.

## The status line

The status line sits under the prompt, so you can see it even with the pane closed:

```
021 ▸ 6/8 Argue · 11 pieces · 15 gaps
```

## The wall pane

`/021 map` opens the pane, which is your digital post-it wall:

- **The route:** ✓ done, ▶ here, · to come
- **NOW:** the open question and why it matters
- **The job that pays:** a yellow note with a dot
- **Stage 1:** blue notes. A **?** means the feature hasn't been argued yet; **✓** means you've decided to keep it.
- **Gaps on the walk:** pink notes, during exercise 5
- **Stories:** green notes, during exercise 7
- **Unknowns to test:** what you've marked as assumptions or parked

In a wide window the pane sits beside the conversation. In a narrower one it sits above the prompt in a compact form: the stations on one line, then the notes. When the coach opens the pane by itself, it waits for a wide enough window; `/021 map` opens it at any width. Until then, the band carries everything.

## Toasts

A short message appears for every change:

- `🟨 J3 is on the wall`
- `● The job that pays: J1`
- `F7 Accounts and history → Stage 3 (−3 pieces)`
- `? Unknown to test: Freelancers will pay £9 a contract.`
- `✓ Exercise 5 done: Does it stand alone?`

Nothing changes on your wall without one.

## The chime

A soft two-note chime plays when an exercise is finished. `/021 mute` turns it off. It plays on macOS; elsewhere it stays silent.

## The question card

Every question from the coach has the same three parts:

> _Why I'm asking:_ No step of your journey uses accounts.
> **Would Alex still pay £9 for this contract with no sign-in?**
> _Your answer decides:_ If yes, accounts move out and stage 1 drops three pieces.

If a question ever feels off-track, `/021 why` explains it.

## No suggested answers

While a session is running, the prompt box won't suggest a reply for you. The answers are yours.
