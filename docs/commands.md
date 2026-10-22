# Commands

Everything lives under one command, `/021`. Type `/021` on its own to see the list and where you are.

| Command | What it does |
|---|---|
| `/021 roadmap` | Starts a session in this folder, or picks up where you left off |
| `/021 where` | Shows the whole route, where you are, what's done and what's next |
| `/021 why` | Shows why the current question is being asked, and what “done” means for this exercise |
| `/021 back <n>` | Goes back to exercise `n` to change an answer |
| `/021 park [note]` | Sets the current question aside as an unknown to test |
| `/021 photo <image>` | Reads a photo of your post-it wall and carries on from it |
| `/021 map` | Opens the wall pane |
| `/021 view` | Writes your roadmap page and opens it in the browser |
| `/021 brief` | Writes and shows the one-page brief, with the six checks |
| `/021 print` | Writes a sheet of your notes as printable post-its |
| `/021 demo` | Loads the Redline example, ready at exercise 6 |
| `/021 mute` | Turns the chime off, or back on |
| `/021 guide [page]` | Shows a page of this guide |

## Details

### `/021 roadmap`
The way in. In a folder with no `./021/roadmap.json`, it starts fresh and shows the route. In a folder with one, it shows where you are and carries on from the next question. Either way, Claude asks the next question straight away.

### `/021 where`
For when you've lost track. It lists all ten stations with ✓ for done, ▶ for where you are and · for still to come. It then shows the current exercise's goal and “done when”, the next question, the stage-1 size so far, the gaps left and roughly how many minutes are left.

You don't need to remember this command. Typing “where am I?”, “I'm lost” or “help” in your own words gets you the same answer in three lines.

### `/021 why`
It shows what the open question is, why it matters, and what has to be true for the exercise to be done. It's useful when a question feels like a detour.

### `/021 back <n>`
For example, `/021 back 2`. It goes back to that exercise, shows what you said there, and asks what you'd like to change. Nothing else is lost: the change carries forward, and if it opens new gaps, you'll be asked about them.

### `/021 park [note]`
For when you don't know and don't want to guess. The current question moves to your **unknowns to test** and the coach moves on. You can add a note: `/021 park not sure anyone pays for this yet`. Before the brief, you'll be asked how you'd test it. You can also just say “park it” and the coach will do this for you.

### `/021 photo <image>`
For example, `/021 photo ~/Desktop/wall.jpg`. Claude reads your post-it wall by colour: yellow is jobs, blue is features, pink is gaps and green is stories. It shows you what it read and which notes it couldn't read, and asks you to confirm or correct it before recording anything. Then coaching carries on from the first gap. See [Running a workshop](workshop.md).

### `/021 map`
It opens the wall pane: the route, the job that pays, the stage-1 notes, the gaps and your unknowns. Asking for it this way opens it at any width. In a wide window it sits beside the conversation; otherwise it sits above the prompt in a compact form.

### `/021 view`
It writes `./021/roadmap.html` and opens it. You can run it at any point: before you finish, the page is marked **In progress** and fills in as you go.

### `/021 brief`
It writes `./021/brief.md` and shows it, with the six facilitator checks ticked or not.

### `/021 print`
It writes `./021/notes.html`: every job, feature, gap and story as a 76 mm square post-it, coloured to match. Print it on A4 and cut along the dashes, for example to rebuild your wall for a team session.

### `/021 demo`
It loads Redline, the workshop's worked example, at exercise 6. It won't overwrite a session that's already in the folder. To replace one, use `/021 demo --force`.

### `/021 mute`
It turns the chime that plays when an exercise is finished off, or back on.

### `/021 guide [page]`
It shows a page of this guide inside Claude Code. The pages are `start`, `method`, `exercises`, `commands`, `screen`, `stuck`, `outputs`, `build`, `workshop` and `faq`. With no page, it shows the index.
