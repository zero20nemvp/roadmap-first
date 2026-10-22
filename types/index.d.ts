/** How long the founder has been stuck on one gap: the stuck ladder's rung. */
export type CoachStuck = { code: string; n: number }

declare module 'claude-code' {
  interface PluginState {
    '021': {
      /** The session as saved in 021/roadmap.json; '' while no coaching runs here. */
      session: string
      stuck: CoachStuck
      isMuted: boolean
    }
  }
}
