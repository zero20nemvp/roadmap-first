# After 021: build day and beyond

021 gets you to a stage 1 worth building. This page is what to do next.

## Build stage 1

1. **Open Claude Code** in your product's folder and paste this, with your brief from `021/brief.md` where it says:

   > I'm building stage 1 of a product. Here is the brief: [paste the brief]. Don't write code yet. First give me a plan: the pieces you'll build, in story order, and anything you need from me. Then wait for my go.

2. **Read the plan.** Cross out anything that isn't on the brief before it costs you time or credits. Then say go.
3. **Build one story at a time, in journey order.** After each one, walk the journey from step 1 and check that story's **done when**. That's the test.
4. **Start a fresh conversation for each story,** with the brief pasted again. Long conversations drift.
5. **Run your test cases after every change,** especially a change to a prompt. Keep the nasty one.
6. **Half the day gone and half the stories left?** Stop and go back to the brief. Cutting is cheaper than finishing late.

Keep one person as the **journey-walker**. They hold the brief, watch the spend, and set aside anything that isn't on it.

## Put it in front of people

Stage 1 exists so you can learn. Once it works end to end:

- **Charge for it,** or at least ask for the money. “Would you pay?” is a guess; paying is evidence.
- **Work through your unknowns.** Each has a test. Run them, and write down what happened, including results that change your mind.
- **Watch someone use it** without helping. Where they stop is your next gap.

## Plan stage 2

What customers tell you can reshape everything after stage 1. That's the point.

1. Open Claude Code in the same folder and run `/021 roadmap`. Your session is still there, including the pencil sketch of stages 2 onwards from exercise 9.
2. Tell the coach what you learned, for example: “Three of ten freelancers paid. Two asked for PDF upload.” It records what changed and asks what follows from it.
3. Use `/021 back 4` to move features between columns, or `/021 back 6` to argue stage 2 down the same way you argued stage 1.
4. `/021 view` gives you an updated roadmap page to share.

To plan stage 2 as a fresh exercise, starting from what stage 1 taught you, move the old session aside (`mv 021 021-stage-1`) and start again with `/021 roadmap`. You'll get a new brief for the next slice.

## If stage 1 doesn't sell

That's a result, and a cheap one. Before building anything else, look again at exercise 2: was the job that pays really the one people pay for? `/021 back 2` and your unknowns list are where to start.
