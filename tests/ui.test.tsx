import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

import { apply, emptySession, type Change } from '../hooks/engine'

const BAND = {
  plugin: '021',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

const PANE = {
  plugin: '021',
  component: 'Pane',
  requestId: '021-wall',
  props: { title: '021 wall', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

const session = (changes: Change[]) => JSON.stringify(apply(emptySession(), changes).session)

/** Stands for the engine's state: the saved session, and nothing else set. */
const withSession = (on: On, json: string) =>
  on('state.get', (_, e) => ({ value: { value: e.key === 'session' ? json : undefined, version: json ? 1 : 0 } }))

test('with no session the band leaves the prompt alone', async ($, on) => {
  withSession(on, '')
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()
})

test('the band says where you are and what comes next, on every surface', async ($, on) => {
  withSession(on, session([{ op: 'name', name: 'Redline' }, { op: 'idea', pitch: 'Checks contracts', who: 'Freelancers' }]))
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /Ex 1 of 8/ }))?.text).toContain('Write the jobs')
    expect((await ui.find({ type: 'Text', text: /aim for 5 to 8/ }))?.text).toContain('More jobs')
    await ui.unmount()
  }
})

test('the wall pane shows the route and the question being worked', async ($, on) => {
  withSession(on, session([
    { op: 'name', name: 'Redline' },
    { op: 'idea', pitch: 'Checks contracts', who: 'Freelancers' },
    { op: 'job', when: 'a contract arrives', want: 'to know the risky clauses', so: 'I don’t lose money' },
  ]))
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /▶ 1 Write the jobs/ }))?.text).toBeTruthy()
  expect((await ui.find({ type: 'Text', text: /✓ 0 Your idea/ }))?.text).toBeTruthy()
  expect((await ui.find({ type: 'Text', text: /J1 to know the risky clauses/ }))?.text).toBeTruthy()
  await ui.unmount()
})
