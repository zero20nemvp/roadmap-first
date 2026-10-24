// Renders a founder's v2 report: the report run's last step.
//   node scripts/report.ts <report.json|report.ts> [out.html]
//   node scripts/report.ts --seed <intake.json> [report.json]   start a report from an intake
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { check, fromIntake, renderReport, type Intake, type Report } from '../web/report.ts'

const args = process.argv.slice(2)
if (args[0] === '--seed') {
  const intake = JSON.parse(readFileSync(args[1], 'utf8')) as Intake
  if (!intake.consent) console.error('note: this founder did not tick consent, so no follow-up emails')
  const out = args[2] ?? args[1].replace(/(\.intake)?\.json$/, '.report.json')
  writeFileSync(out, JSON.stringify(fromIntake(intake), null, 2) + '\n')
  console.log(`seeded ${out}: add stories and releases, then render it`)
  process.exit(0)
}
if (!args[0]) {
  console.error('usage: node scripts/report.ts <report.json> [out.html]')
  process.exit(2)
}
const report: Report = args[0].endsWith('.ts')
  ? (await import(pathToFileURL(resolve(args[0])).href)).default
  : JSON.parse(readFileSync(args[0], 'utf8'))
const { errors, warnings } = check(report)
for (const w of warnings) console.error(`warning: ${w}`)
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`)
  process.exit(1)
}
const out = args[1] ?? args[0].replace(/(\.report)?\.(json|ts)$/, '.html')
writeFileSync(out, renderReport(report))
console.log(`wrote ${out}`)
