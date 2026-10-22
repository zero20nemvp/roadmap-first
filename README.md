# 021 · roadmap-first coach

A Claude Code plugin that coaches you, one question at a time, to **stage 1**: the smallest slice of your product someone would pay for. It runs the same 8 post-it exercises as the roadmap-first workshop, using the Socratic method. It never gives you the answer, and it keeps going until every gap is filled. You finish with a one-page brief to build from and a roadmap page you can scroll and share.

Everything it needs ships inside the plugin. It has no other dependencies and works offline.

## Guide

The full guide is in [`docs/`](docs/README.md), and you can read every page inside Claude Code with `/021 guide`:

- [Getting started](docs/getting-started.md): install it, run your first session, try the demo
- [The method](docs/method.md): why roadmap-first, and the words it uses
- [The exercises](docs/exercises.md): what each station asks, what “done” means, and who decides
- [Commands](docs/commands.md): every `/021` command
- [Reading the screen](docs/screen.md): the band, status line, wall pane, toasts and chime
- [Stuck or lost](docs/stuck.md): the stuck ladder, parking, going back, starting over
- [Your files](docs/outputs.md): `roadmap.html`, `brief.md`, `roadmap.json`
- [After 021](docs/build-day.md): build day, testing your unknowns, planning stage 2
- [Running a workshop](docs/workshop.md): post-it colours, photo import, printing, timing
- [Questions and fixes](docs/faq.md)

## Use it

```
/021 roadmap
```

That starts a session in the current folder, or picks one up where you left off. Your work is saved in `./021/`.

| Command | What it does |
|---|---|
| `/021 roadmap` | Start, or pick up where you left off |
| `/021 where` | Where you are, what’s done, what’s next |
| `/021 why` | Why this question is being asked |
| `/021 back 3` | Go back to an exercise and change an answer |
| `/021 park` | Don’t know yet? Park it as an unknown to test |
| `/021 photo wall.jpg` | Read a photo of your post-it wall and carry on from it |
| `/021 map` | Open the wall pane |
| `/021 view` | Write and open your roadmap page |
| `/021 brief` | Write and show the one-page brief |
| `/021 print` | Print your notes as post-its |
| `/021 demo` | Load the workshop’s Redline example, ready at exercise 6 |
| `/021 mute` | Turn the chime off or on |
| `/021 guide [page]` | Read the guide inside Claude Code |

If you’re lost, type “where am I”. If you’re stuck, say “I don’t know” and the coach will help.

## The 8 exercises

0. **Your idea:** one sentence, and who it’s for
1. **Write the jobs** 🟨 When…, I want…, so…
2. **Pick the job that pays** 🔴 a named person who would pay today
3. **Features and the journey** 🟦 features under jobs, then the steps of the paying job
4. **Draft stage 1 and size it:** every feature gets a column; stage 1 is counted in pieces
5. **Does it stand alone?** 🟥 walk the journey with stage 1 only
6. **Argue it down:** would they still pay without it? Claude plays the visiting table
7. **Write stage 1’s stories** 🟩 one per step, each with a “done when” you can check
8. **Write the brief:** the facilitator’s six checks, test cases, and a test for every unknown

A **piece** is one screen, prompt, kind of data or outside service. Shared pieces count once, so every cut has an exact price.

## Knowing where you are

- **Band above the prompt:** the exercise, your progress, and the next question
- **Status line:** exercise, piece count and gaps left
- **Wall pane** (`/021 map`): the route, the job that pays, the stage-1 notes, the gaps and your unknowns
- **Toasts:** every note added or moved, and every exercise finished
- **Chime:** plays when an exercise is finished (`/021 mute` turns it off)

## What you get

In `./021/`:

- `roadmap.html` is a single file that works offline. It shows the wall, the journey strip, the piece count and every cut, the stage columns, the stories, the unknowns to test, the brief and the next steps for build day.
- `brief.md` is the one-page stage-1 brief, ready to paste into Claude on build day.
- `roadmap.json` is the session. Keep it next to your project.

## Where it runs

- **The Claude Code terminal and desktop app** support everything: the band, the status line, the toasts and the commands. The wall pane needs a window about 110 columns wide; below that, the band above the prompt carries the same information.
- **VS Code** shows the band and the pane as panels.
- **claude.ai/code in a browser** may not load plugin mods. For a workshop, use the desktop app.
- **The chime** plays on macOS. Elsewhere it stays silent.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install 021 --marketplace zero20nemvp/roadmap-first
```

Answer `y` to add the marketplace, then pick a scope. From a shell:

```
claude plugin install 021 --marketplace zero20nemvp/roadmap-first
```

In the desktop app, where `/plugin` doesn’t run: click **+** next to the prompt box, then **Plugins**, then **Add marketplace** with `zero20nemvp/roadmap-first`, then **Add plugin**.

To run it from a copy of this repository instead:

```
claude --plugin-dir /path/to/roadmap-first
```

## Demo in 60 seconds

1. In an empty folder, run `/021 demo`. Redline, the workshop’s contract checker, loads at exercise 6.
2. Answer “would Alex still pay without accounts?” and watch the note move, the toast show the saving, and the band move on.
3. Carry on through the stories and the brief. You can also run `/021 view` at any point to see the roadmap page fill in.

## Develop

```
node scripts/example.ts     # rebuild examples/redline (roadmap.json, finished.json, roadmap.html, brief.md)
node scripts/chime.ts       # rebuild assets/chime.wav
claude plugin validate .
claude plugin test .
```
