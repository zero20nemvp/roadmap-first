# The method: roadmap first

## The problem it solves

Most products are built whole and only then found to work or not. By the time anyone pays, or doesn't, most of the money and time is gone.

**Roadmap first** turns that around. You cut the product into stages, from the jobs your customer wants done, and build one stage at a time.

- **Stage 1 is the smallest slice someone would pay for.** It is enough to deliver value you could take money for, and nothing more.
- **Every later stage builds only on the ones before it.** Stage 1 never needs anything from stage 2.
- **If stage 1 can't be sold and delivered, the rest isn't built.** Or, more often, what your first customers tell you reshapes stage 2 onwards.

## Finding stage 1

Too big, and you've built a lot before you learn anything. Too small, and nothing was worth paying for, so you learn nothing either. Stage 1 is found, not listed:

1. **Start from the job someone pays for,** not from features. That's the job whose result a customer would hand over money to have.
2. **Take the fewest features that deliver it end to end:** a journey from the customer's first step to that job's outcome, where no step needs a feature that isn't there. This often takes parts of several jobs.
3. **Size it in pieces.** Then the cost of every feature you add or drop is exact.
4. **Prove it stands alone.** Walk the journey using only stage-1 features. A step that needs something outside stage 1 means it isn't done.
5. **Argue it down.** For every feature, ask: would they still pay without this? If yes, it moves to stage 2.

## The words it uses

| Word | Meaning |
|---|---|
| **Job** | Something your customer wants done, written *When…, I want…, so….* For example: “When a client sends me a contract, I want to know which clauses could hurt me, so I don't sign something that costs me money.” |
| **The job that pays** | The one job someone would pay to have done today. Stage 1 is cut from it. |
| **Feature** | Something the product does, which sits under a job. “Red-flag report.” |
| **Journey** | The steps your customer takes to get the paying job done, from the very first thing they do to the job's “so”. |
| **Piece** | One thing to build or switch on: a screen, a prompt, a kind of data, or an outside service. “The report page.” “A payment link.” |
| **Stage** | A column on the roadmap: stage 1, 2, 3, 4 or later. Each builds only on the ones before. |
| **Story** | One thing to build for one journey step: *As a…, I want to…, so that…*, with a **done when** that says what you'd see if it works. |
| **Gap** | Anything still missing: an unanswered question, a step with nothing under it, a feature with no column. The coach works through the gaps one at a time and stops at none. |
| **Unknown** | Something you believe but haven't proved, with how you'll test it. |

## Why pieces

Pieces make sizing honest. **Shared pieces count once,** so when two features use the same report page, it's one piece, not two. That's why **a cut saves only the pieces nothing else needs:** dropping the pushback email saves 1 piece, not 2, because the red-flag report still needs the report page.

Every move shows its price, like “Accounts → Stage 3 (−3 pieces)”, so you can see what each decision costs or saves.

## Why Socratic

The answers that matter, like who pays, what they'd pay for and what can wait, are yours. They depend on things only you know, and you'll believe a stage 1 you argued for far more than one you were handed.

So the coach asks and doesn't tell. It asks one question at a time and pushes on vague answers (“who exactly?”). It asks how you know, and it plays the sceptic at exercise 6. It never decides for you. The one part it does draft is the technical sizing, because nobody should need to know what a “prompt” or an “outside service” is to plan an MVP. See [The exercises](exercises.md) for exactly who decides what.

## Evidence and assumptions

Every answer is marked **evidence** or **assumption**.

- **Evidence** is something you know: a name, a number, something you saw.
- **An assumption** is something you believe.

Assumptions aren't bad; every new product runs on them. But they're the riskiest parts of your plan, so the ones that matter become **unknowns to test**, each with a test you'll run once stage 1 is in front of real people. That list is what you take to customers. See [After 021](build-day.md).
