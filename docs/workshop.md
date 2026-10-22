# Running a workshop

021 follows the same 8 exercises the roadmap-first workshop runs with post-its, so you can use it alongside a real wall, after one, or instead of one.

## The post-it colours

| Colour | Holds | Exercise |
|---|---|---|
| 🟨 Yellow | Jobs: *When…, I want…, so…* | 1 |
| 🔴 Dot | The job that pays | 2 |
| 🟦 Blue | Features, stuck under their job and under journey steps | 3–6 |
| 🟥 Pink | Gaps: a journey step with nothing under it | 5 |
| 🟩 Green | Stories, with “done when” | 7 |

You'll also want an **A3 strip** for the journey (one step per box) and a **flipchart** with columns *Stage 1, Stage 2, Stage 3, Later*.

## Three ways to use it in a room

### 1. Wall first, then 021
Teams run the exercises on the wall, then photograph it and carry on in Claude Code:

```
/021 photo ~/Desktop/wall.jpg
```

Claude reads the notes by colour and shows what it read, including any notes it couldn't read, and asks the team to confirm or correct it before recording anything. Coaching then picks up from the first gap: usually a missing “so”, a journey step with nothing under it, or features that haven't been argued down.

Tips for a readable photo: take it straight on, in good light, with the whole wall in frame. Use a marker rather than a biro, and keep one note per idea.

### 2. 021 as the facilitator
Each team runs `/021 roadmap` on one laptop, with the screen where everyone can see it. The band, toasts and wall pane stand in for the facilitator walking between tables. At exercise 6 Claude plays the visiting table, so teams don't need to swap.

### 3. 021 after the workshop
Attendees install the plugin to use on their own ideas later. Point them to the [getting started](getting-started.md) page and `/021 demo`.

## Facilitator checks

Before a team builds, their brief should pass the six checks. 021 runs them at exercise 8, and `/021 brief` shows them:

- [ ] A real person who pays
- [ ] One job, and why they'd pay for it
- [ ] Every journey step has a story
- [ ] Every story has a “done when”
- [ ] Everything left out names its stage
- [ ] Small enough to build in a day

“Small enough to build in a day” is your judgement, informed by the piece count. If the budget per team is tight, hold teams to five or six features.

## Printing notes

`/021 print` writes `021/notes.html`, with every job, feature, gap and story as a 76 mm square post-it in its colour. Print it on A4 and cut along the dashes, for example to rebuild a team's wall from their session, or to hand out the worked example.

## Demo for a talk

1. In an empty folder: `claude`, then `/021 demo`. Redline loads at exercise 6.
2. Answer “would Alex still pay without the pushback email?” with yes. Watch the note move, the toast show −1 piece and the band count down.
3. Answer one more, then run `/021 view` to show the roadmap page.

The demo uses the workshop's worked example, so it lines up with the slides.

## Timing

| Exercise | Workshop | 021 alone |
|---|---|---|
| 0 Your idea | — | ~3 min |
| 1 Write the jobs | 30 min | ~10 min |
| 2 Pick the job that pays | 15 min | ~5 min |
| 3 Features and the journey | 45 min | ~15 min |
| 4 Draft stage 1 and size it | 30 min | ~10 min |
| 5 Does it stand alone? | 30 min | ~5 min |
| 6 Argue it down | 30 min | ~10 min |
| 7 Write stage 1's stories | 30 min | ~10 min |
| 8 Write the brief | 20 min | ~5 min |
