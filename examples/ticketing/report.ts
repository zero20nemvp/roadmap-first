// The ticketing thought exercise from the v2 change spec, as a finished report.
//   node scripts/report.ts examples/ticketing/report.ts examples/ticketing/report.html
import type { Report } from '../../web/report.ts'

const report: Report = {
  "version": 2,
  "founder": { "name": "Example founder" },
  "product": { "name": "Doorlist", "pitch": "Ticketing where the promoter keeps the data", "who": "independent event promoters" },
  "problems": [
    { "id": "P1", "text": "The ticket platform keeps the guest list, so promoters can't reach their own crowd" },
    { "id": "P2", "text": "Door check-in is a printed list and a pen; the queue backs up" },
    { "id": "P3", "text": "Running two events in a month means two separate setups" }
  ],
  "workarounds": [
    { "id": "W1", "problem": "P1", "text": "Pay a big platform's fees and export what little data it allows", "pays": "10% per ticket" },
    { "id": "W2", "problem": "P2", "text": "Print the list and tick names by hand" },
    { "id": "W3", "problem": "P3", "text": "Copy last event's spreadsheet and start again" }
  ],
  "jobs": [
    { "id": "J1", "from": "W1", "when": "I announce an event", "want": "to sell tickets", "so": "I keep the buyers' data for next time" },
    { "id": "J2", "from": "W2", "when": "guests arrive", "want": "to check them in at the door", "so": "the queue moves" },
    { "id": "J3", "from": "W3", "when": "I run more than one event", "want": "to run several events at once", "so": "I don't rebuild each one" },
    { "id": "J4", "when": "a new event is on", "want": "to re-market to past guests", "so": "my best crowd comes back" }
  ],
  "features": [
    { "id": "F1", "job": "J1", "name": "Event page with ticket checkout" },
    { "id": "F2", "job": "J1", "name": "Buyer list the promoter owns and exports" },
    { "id": "F3", "job": "J2", "name": "QR ticket scan at the door" },
    { "id": "F4", "job": "J3", "name": "Several events under one account" },
    { "id": "F5", "job": "J4", "name": "Email past guests about a new event" }
  ],
  "stories": [
    { "id": "S1", "feature": "F1", "text": "Promoter creates an event with a price and capacity", "done": "the event page shows price and seats left" },
    { "id": "S2", "feature": "F1", "text": "Guest buys a ticket by card", "done": "payment succeeds and a ticket email arrives" },
    { "id": "S3", "feature": "F2", "text": "Promoter downloads every buyer as CSV", "done": "the CSV has name and email for each sale" },
    { "id": "S4", "feature": "F3", "text": "Door staff scan a ticket QR on a phone", "done": "a valid ticket turns green, a used one red" },
    { "id": "S5", "feature": "F4", "text": "Promoter switches between events on one dashboard", "done": "two live events show separate sales" },
    { "id": "S6", "feature": "F5", "text": "Promoter emails past buyers about a new event", "done": "only opted-in past buyers receive it" }
  ],
  "releases": [
    { "id": "GZ", "month": "2026-11", "status": "Next", "completes": ["J1"], "stories": ["S1", "S2", "S3"], "price": "€29/month" },
    { "id": "R1", "month": "2027-01", "status": "Planned", "completes": ["J2"], "stories": ["S4"] },
    { "id": "R2", "month": "2027-03", "status": "Planned", "completes": ["J3"], "stories": ["S5"] },
    { "id": "R3", "month": "2027-05", "status": "Planned", "completes": ["J4"], "stories": ["S6"] }
  ]
}

export default report
