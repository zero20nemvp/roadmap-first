# Your files

Everything 021 makes goes in a `021` folder inside the folder you ran it in.

| File | What it is | When it's written |
|---|---|---|
| `021/roadmap.json` | Your session: every answer, note and decision | After every answer |
| `021/roadmap.html` | Your roadmap page | When every gap is filled, and on `/021 view` |
| `021/brief.md` | The one-page stage-1 brief | When every gap is filled, and on `/021 view` or `/021 brief` |
| `021/notes.html` | Printable post-its | On `/021 print` |

## roadmap.html

This is a single file that works offline. It reads top to bottom:

1. **The opening:** your product's name and idea, the job that pays, and the stage-1 size, price and number of assumptions
2. **The wall:** your jobs (yellow) with their features (blue) under them. Features outside stage 1 are greyed.
3. **The journey:** the strip of steps with the feature under each, and a pink note for any step stage 1 can't do yet
4. **Size it in pieces:** a chart of how the count moved (the first draft, what the walk added, each cut), and a map of which stage-1 features use which pieces, with shared ones highlighted
5. **Argue it down:** every feature you argued, your answer to “would they still pay without it?”, where it went and what it saved
6. **The flipchart:** the stage columns, with stage 1 marked *Build first*
7. **Stories:** stage 1's green notes, each with its “done when”
8. **Unknowns to test:** each assumption or parked question, with its test
9. **The brief:** the one page, the six facilitator checks, and a **Copy brief** button
10. **Build day:** the steps and the prompt to paste into Claude
11. **Decisions log:** every question and your answer, each marked evidence or assumption

To share it, send the file. It opens in any browser and needs nothing else. Before a session is finished, the page is marked *In progress*.

## brief.md

The brief is the workshop's one page, in plain markdown:

- **Who and why:** who pays, the job, and whether they'd pay (with the price)
- **In, and out:** stage 1's features and piece count, then everything else with its stage
- **Test cases:** the examples you'll run after every change
- **Stories, in journey order:** each with its “done when”
- **Unknowns to test with customers**
- **Facilitator check:** the six checks, ticked
- **The build-day prompt** to paste into Claude

## roadmap.json

This is the session itself, as readable JSON. Keep it with your project, because it's how `/021 roadmap` picks up again. You can open it to look, but change answers through the coach (`/021 back`, or just say what's changed) so the gaps stay right.

What it holds: the idea, the jobs, the job that pays, the features (with their stage, pieces and whether they were argued), the journey, the pieces, the stories, the test cases, the unknowns, the piece-count moves and the full decisions log.

## Version control

The `021` folder is safe to commit alongside your code. Its history then shows how stage 1 changed, and why.
