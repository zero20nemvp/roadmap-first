# Questions and fixes

## Using it

**Do I need to be technical?**
No. The only technical part is listing the pieces each feature needs, and Claude drafts that for you to confirm. Everything else is about your customer.

**Does it work offline?**
The plugin and your roadmap page do. Claude itself needs a connection, as it always does.

**Where is my work saved?**
In `./021/` inside the folder you ran it in, after every answer. See [Your files](outputs.md).

**Can I work on two products?**
Yes. Use one folder per product. Each has its own `021` folder.

**Can a team use it together?**
Yes, around one screen. To share a session, commit the `021` folder to your repository; whoever runs `/021 roadmap` next picks up from it.

**Will it write code?**
No. 021 plans; it writes no code. On build day you paste the brief into Claude yourself. See [After 021](build-day.md).

**Does it ever decide for me?**
No. It asks, pushes back once when you argue down at exercise 6, and records your reason. It drafts only the pieces, which you confirm.

**Why won't it accept my “done when”?**
Because nobody could check it by looking. “Works well”, “fast” and “easy” are refused. Say what you'd see: “The report opens only after payment.”

**The gap count went up. Did I do something wrong?**
No. New gaps usually mean the walk at exercise 5 found a step stage 1 can't do yet, which is exactly what it's for.

## Fixes

**`/021` isn't recognised.**
The plugin isn't installed for this session. Run `/plugin`, check that `021` is listed and enabled, and install it if not (see [Getting started](getting-started.md)). Then start a new session.

**I can't see the wall pane.**
When the coach opens the pane by itself, it waits for a wide enough window. Run `/021 map` to open it at any width. The band above the prompt shows the essentials either way.

**There's no chime.**
It only plays on macOS. Check that it isn't muted with `/021 mute`, and check your system volume.

**It's not working in the browser.**
claude.ai/code in a browser may not load plugins like this one. Use the Claude Code terminal or the desktop app.

**`/021 view` didn't open anything.**
The page is still written to `./021/roadmap.html`. Open that file in your browser.

**`/021 demo` says a session already exists.**
It won't overwrite your work. Run it in an empty folder, or use `/021 demo --force` to replace what's there.

**The coach seems to have lost the thread.**
Run `/021 where`. The plugin keeps the score, not the conversation, so the next question is always worked out from `021/roadmap.json`. Starting a new session and running `/021 roadmap` carries on from the right place.

**I want to start again.**
Move the old session aside with `mv 021 021-old`, then run `/021 roadmap`.

## Updating

To get the latest version, run `/plugin`, choose the `021` marketplace, and update. Your sessions in `./021/` are unaffected.
