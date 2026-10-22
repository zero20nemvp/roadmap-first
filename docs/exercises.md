# The exercises

There are nine stations: your idea, then the workshop's 8 exercises. You move on when a station's **done when** holds, not when the conversation feels finished. The plugin checks this, not Claude. The minutes are a rough guide.

Each station below shows what it's for, what you'll be asked, what “done” means, who decides, and how the workshop's Redline example answered it.

---

## 0 · Your idea · ~3 min

**What it's for.** Everything else hangs off one sentence and one kind of person.

**You'll be asked.** In one breath, what's your idea, and who is it for? Give it a short working name.

**Done when.** There's a one-line idea and the person it's for.

**Redline.** “An AI that reads the contract before you sign it, for freelancers who sign client contracts.”

---

## 1 · Write the jobs · ~10 min · 🟨 yellow notes

**What it's for.** Jobs are what customers pay to have done. Features come later.

**You'll be asked.** When does this happen to them, and what does it get them? Write it as *When…, I want…, so….* Which other jobs do they have around this one?

**Done when.** There are at least 3 jobs (aim for 5 to 8), each with all three parts.

**Watch for.** Features disguised as jobs. “Contract analysis” is a feature. Ask yourself when they'd reach for it and what they'd have afterwards.

**Redline.** Six jobs, including *J1: When a client sends me a contract, I want to know which clauses could hurt me, so I don't sign something that costs me money.*

---

## 2 · Pick the job that pays · ~5 min · 🔴 the dot

**What it's for.** Stage 1 is cut from one job, so choose the one someone would pay for first.

**You'll be asked.** Who would pay to have this done, today? Name them. What do they do instead now, and what does that cost them? Roughly what would they pay?

**Done when.** One job is marked, with a named payer, why they'd pay, and a rough price.

**Tip.** A named person or business is evidence. “People like me” is an assumption. If no job passes “who would pay today?”, that is a finding in itself: pick the closest, and test it first.

**Redline.** J1. Alex, a freelance designer, was quoted £400 by a lawyer to review a 20-page contract. Alex would pay about £9 a contract.

---

## 3 · Features and the journey · ~15 min · 🟦 blue notes

**What it's for.** Features say what the product does. The journey says which of them the paying job actually needs.

**You'll be asked.** What does the product do, under each job? Then: what's the very first thing your customer does? And then what happens? This is asked until you reach the paying job's “so”.

**Done when.** Every job has at least one feature, and the journey for the paying job (at least 3 steps, usually 5 to 10) ends at that job's “so”.

**Tip.** The journey often ends one step past where you think. Redline's ended at *copying what to ask for instead*, not at *reading the red flags*.

**Redline.** Thirteen features, and a six-step journey from opening Redline to copying the wording to ask for.

---

## 4 · Draft stage 1 and size it · ~10 min

**What it's for.** It gives you a first cut and an exact price.

**You'll be asked.** Which features does the journey need? Every other feature goes in a column: stage 2, 3, 4 or later. Then Claude drafts the **pieces** each stage-1 feature needs (screens, prompts, kinds of data, outside services) and asks: does this count look right?

**Done when.** Every feature has a column, and you've confirmed the stage-1 piece count.

**Who decides.** Claude drafts the pieces, because this is the technical part. You confirm or correct them.

**Tip.** A first draft that's too big is expected. Don't argue it down yet.

**Redline.** The room's first draft had 7 features and 11 pieces. That included accounts, PDF upload and a pushback email, “because the AI can do it all anyway”.

---

## 5 · Does it stand alone? · ~5 min · 🟥 pink notes

**What it's for.** It proves stage 1 works without anything from a later stage.

**You'll be asked.** Walk the journey as your customer, touching only stage 1. Where do you get stuck? What would cover that step?

**Done when.** Every journey step has a stage-1 feature under it.

**Tip.** A step with nothing under it is a pink gap. New gaps aren't going backwards; they mean the walk is working. Also notice any stage-1 feature that no step touches: it's a candidate to cut next.

**Redline.** Step 6 failed: the report said what was wrong, not what to ask for. Adding *What to ask for instead* from J2 cost 1 piece, making 12.

---

## 6 · Argue it down · ~10 min

**What it's for.** It cuts stage 1 to what's needed to get paid.

**You'll be asked.** Claude changes roles out loud: “I'm now the visiting table.” For each stage-1 feature, starting with the ones no journey step uses, it asks: **would they still pay without this?** It pushes back once on a “no” that sounds like habit, such as “every app has accounts”.

**Done when.** Every stage-1 feature is kept or moved, with your reason.

**Who decides.** You have the last word. A yes moves the feature out, and the toast shows exactly what it saved.

**Redline.** Accounts went to stage 3 (−3 pieces), PDF upload to stage 2 (−2) and the pushback email to stage 2 (−1). *About you* stayed: without trade and country the flags would be generic and wrong. The final stage 1 had 5 features and 6 pieces.

---

## 7 · Write stage 1's stories · ~10 min · 🟩 green notes

**What it's for.** Each story is one thing to build, and its “done when” is how you'll check it.

**You'll be asked.** For each journey step: *As a…, I want to…, so that…*. Then: what would you **see** if it worked?

**Done when.** Every journey step has a story, and every “done when” can be checked by looking.

**Tip.** “Works well”, “fast” and “easy” can't be checked, and the plugin refuses them. “Each flag quotes its clause and says why” can be checked. Stories come last on purpose, so nobody writes stories for features that were cut.

**Redline.** *As a freelancer, I want the risky clauses ranked worst first with a plain-English why, so that I know what matters.* Done when: each flag quotes its clause and says why, and the report says it isn't legal advice.

---

## 8 · Write the brief · ~5 min

**What it's for.** It produces the one page you'll build from.

**You'll be asked.** Which three real examples will you test with after every change, one of them nasty? Is this small enough to build in a day? For each unknown: how would you find out?

**Done when.** The facilitator's six checks pass, and every unknown has a test:

- [ ] A real person who pays
- [ ] One job, and why they'd pay for it
- [ ] Every journey step has a story
- [ ] Every story has a “done when”
- [ ] Everything left out names its stage
- [ ] Small enough to build in a day

When every gap is filled, 021 writes `./021/roadmap.html` and `./021/brief.md`. See [Your files](outputs.md).
