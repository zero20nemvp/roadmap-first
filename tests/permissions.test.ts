import { expect, test } from 'claude-code/testing'

test('the coach’s own tools run without asking', async ($, on) => {
  // stands for the engine's verdict in the default mode: ask the person
  on('tool.check', () => ({ decision: 'ask' as const }))
  for (const tool of ['mcp__021__record', 'mcp__021__park', 'mcp__021__where']) {
    const verdict = await $.tool.check({ tool, input: {} })
    expect(verdict.decision).toBe('allow')
  }
})

test('a deny from the person’s or organization’s rules still stands', async ($, on) => {
  on('tool.check', () => ({ decision: 'deny' as const, reason: 'blocked by policy' }))
  const verdict = await $.tool.check({ tool: 'mcp__021__record', input: {} })
  expect(verdict.decision).toBe('deny')
})

test('other tools are left to the engine', async ($, on) => {
  on('tool.check', () => ({ decision: 'ask' as const }))
  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'ls' } })
  expect(verdict.decision).toBe('ask')
})
