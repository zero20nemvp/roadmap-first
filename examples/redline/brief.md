# Stage-1 brief · Redline

## Who and why
- **Who pays:** Alex, a freelance designer with a new client
- **The job:** When a client sends me a contract, I want to know which clauses could hurt me, so I don’t sign something that costs me money.
- **Would they pay?** Yes: £9 a contract. One bad clause costs more than a check. Today it is £400 for a lawyer, or an evening of worry.

## In, and out
- **In:** paste a contract, tell it about you, red-flag report, pay per contract, what to ask for instead (6 pieces)
- **Out:** pushback email, pdf upload, email me the report (stage 2); accounts and history, your standard terms, compare two versions (stage 3); team workspace, browser extension (stage 4)
- **Test cases:** Three sample contracts, one of them nasty

## Stories, in journey order
1. As a freelancer, I want to open Redline and see where to paste, so that I can start without signing up.
   *Done when:* The first screen has the paste box and nothing else to fill in.
2. As a freelancer, I want to paste a contract’s text, so that I can check it without uploading files.
   *Done when:* A 20-page contract pastes in whole.
3. As a freelancer, I want to give my trade and country, so that the flags fit my work and my law.
   *Done when:* Both are used in the check and shown on the report.
4. As a freelancer, I want to pay for just this contract, so that I don’t need a subscription.
   *Done when:* The report opens only after payment.
5. As a freelancer, I want the risky clauses ranked worst first with a plain-English why, so that I know what matters.
   *Done when:* Each flag quotes its clause and says why; the report says it isn’t legal advice.
6. As a freelancer, I want wording to ask for instead of each flag, so that I can push back without a lawyer.
   *Done when:* Every flag has a replacement clause to copy.

## The rest of the roadmap, in pencil
- **Stage 2 · Push back:** Pushback email, PDF upload, Email me the report
- **Stage 3 · Regulars:** Accounts and history, Your standard terms, Compare two versions
- **Stage 4 · Studios:** Team workspace, Browser extension

_A sketch: expect it to change once stage 1 meets customers._

## Unknowns to test with customers
- Freelancers will pay £9 a contract. — **test:** Put a payment link in front of 10 freelancers. Do 3 pay?
- Pasting text is fine; PDFs can wait. — **test:** Count how many people give up at the paste step.
- A plain-English why is enough to act on, without a lawyer. — **test:** After the report, ask: would you send a pushback based on this?
- Freelancers want the pushback email more than accounts. — **test:** Ask the first ten paying users which they would pay for next.

## Facilitator check
- [x] A real person who pays
- [x] One job, and why they’d pay for it
- [x] Every journey step has a story
- [x] Every story has a “done when”
- [x] Everything left out names its stage
- [x] Small enough to build in a day

---

Paste into Claude on build day:

> I’m building stage 1 of a product. Here is the brief: [paste the brief]. Don’t write code yet. First give me a plan: the pieces you’ll build, in story order, and anything you need from me. Then wait for my go.
