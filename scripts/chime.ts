// Writes assets/chime.wav: two soft bell notes, played when an exercise is done.
//   node scripts/chime.ts
import { writeFileSync } from 'node:fs'

const rate = 22050
const notes = [{ hz: 880, at: 0 }, { hz: 1318.5, at: 0.12 }]
const seconds = 0.9
const n = Math.floor(rate * seconds)
const pcm = new Int16Array(n)
for (let i = 0; i < n; i++) {
  const t = i / rate
  let v = 0
  for (const note of notes) {
    const u = t - note.at
    if (u < 0) continue
    const env = Math.min(1, u / 0.006) * Math.exp(-u * 5.5)
    v += env * (Math.sin(2 * Math.PI * note.hz * u) + 0.25 * Math.sin(2 * Math.PI * note.hz * 2.01 * u))
  }
  pcm[i] = Math.max(-1, Math.min(1, v * 0.28)) * 32767
}
const data = Buffer.from(pcm.buffer)
const head = Buffer.alloc(44)
head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8)
head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22)
head.writeUInt32LE(rate, 24); head.writeUInt32LE(rate * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34)
head.write('data', 36); head.writeUInt32LE(data.length, 40)
writeFileSync(new URL('../assets/chime.wav', import.meta.url), Buffer.concat([head, data]))
console.log('assets/chime.wav written')
