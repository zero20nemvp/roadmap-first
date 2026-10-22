# Getting started

## What you need

- **Claude Code**, in the terminal or the desktop app. The browser version at claude.ai/code may not load plugins like this one, so use the terminal or the desktop app.
- **An idea.** It doesn't need to be worked out. Exercise 0 starts from one sentence.
- **About 75 minutes.** You don't need them all at once: stop whenever you like and pick up later.

Nothing else is needed. 021 has no other dependencies, needs no account, and works offline.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install 021 --marketplace zero20nemvp/roadmap-first
```

Answer `y` to add the marketplace, then pick a scope. **User** makes it available in every folder.

From a shell:

```
claude plugin install 021 --marketplace zero20nemvp/roadmap-first
```

In the desktop app, click **+** next to the prompt box, then **Plugins**, then **Add marketplace** and enter `zero20nemvp/roadmap-first`, then **Add plugin**.

To check that it worked, type `/021`. You should see the list of commands.

## Your first session

1. **Make a folder for your product** and open Claude Code in it. 021 saves everything in a `021` folder inside it.

   ```
   mkdir my-product && cd my-product && claude
   ```

2. **Start the coach.**

   ```
   /021 roadmap
   ```

   You'll see the route (your idea, then 8 exercises), roughly how long it takes, and what you'll leave with. Then Claude asks its first question.

3. **Answer in your own words.** Each question comes in three parts:

   > _Why I'm asking:_ every later exercise builds on this sentence.
   > **In one breath, what's your idea, and who is it for?**
   > _Your answer decides:_ who we're building stage 1 for.

   Give the answer you'd give a friend. Short is fine. You can always change it later.

4. **Watch the band above the prompt.** It always shows which exercise you're on, how far along you are, and what's next. See [Reading the screen](screen.md).

5. **Stop when you like.** Close Claude Code. Next time, open it in the same folder and type `/021 roadmap`, and it picks up where you left off.

## Try the example first

If you'd rather see it working before you use your own idea:

```
/021 demo
```

This loads **Redline**, the workshop's worked example (an AI that checks freelancers' contracts before they sign), at exercise 6. Answer a few “would they still pay without it?” questions and watch the notes move, the piece count drop and the band move on. Run `/021 view` to see the roadmap page.

The demo writes into `./021/`, so run it in an empty folder, not the one for your own product.

## Next

- [The exercises](exercises.md): what each station asks, and what “done” means
- [Stuck or lost](stuck.md): what to do when you don't know
