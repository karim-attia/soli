import { klondikeReducer } from '../../../src/solitaire/klondike'
import { createTestState } from './helpers'

describe('TIMER_START', () => {
  it('starts the timer from idle', () => {
    const state = createTestState()

    const next = klondikeReducer(state, { type: 'TIMER_START', startedAt: 1_000 })

    expect(next.timerState).toBe('running')
    expect(next.timerStartedAt).toBe(1_000)
    expect(next.elapsedMs).toBe(0)
  })

  it.each([NaN, Infinity])('is a no-op for a non-finite startedAt (%p)', (startedAt) => {
    const state = createTestState()

    expect(klondikeReducer(state, { type: 'TIMER_START', startedAt })).toBe(state)
  })

  it('is a no-op while already running', () => {
    const state = createTestState({ timerState: 'running', timerStartedAt: 1_000 })

    expect(klondikeReducer(state, { type: 'TIMER_START', startedAt: 2_000 })).toBe(state)
  })

  it('resumes after a pause with the new start time and keeps accumulated elapsedMs', () => {
    const state = createTestState({
      timerState: 'paused',
      timerStartedAt: null,
      elapsedMs: 500,
    })

    const next = klondikeReducer(state, { type: 'TIMER_START', startedAt: 5_000 })

    expect(next.timerState).toBe('running')
    expect(next.timerStartedAt).toBe(5_000)
    expect(next.elapsedMs).toBe(500)
  })
})

describe('TIMER_TICK', () => {
  it('adds the delta to elapsedMs and advances timerStartedAt', () => {
    const state = createTestState({
      timerState: 'running',
      timerStartedAt: 1_000,
      elapsedMs: 200,
    })

    const next = klondikeReducer(state, { type: 'TIMER_TICK', timestamp: 1_500 })

    expect(next.elapsedMs).toBe(700)
    expect(next.timerStartedAt).toBe(1_500)
    expect(next.timerState).toBe('running')
  })

  it('is a no-op when the timer is idle', () => {
    const state = createTestState()

    expect(klondikeReducer(state, { type: 'TIMER_TICK', timestamp: 1_500 })).toBe(state)
  })

  it('is a no-op when the timer is paused', () => {
    const state = createTestState({ timerState: 'paused', elapsedMs: 300 })

    expect(klondikeReducer(state, { type: 'TIMER_TICK', timestamp: 1_500 })).toBe(state)
  })

  it('is a no-op for a non-finite timestamp', () => {
    const state = createTestState({ timerState: 'running', timerStartedAt: 1_000 })

    expect(klondikeReducer(state, { type: 'TIMER_TICK', timestamp: NaN })).toBe(state)
  })

  it('ignores zero and negative deltas from clock skew', () => {
    const state = createTestState({ timerState: 'running', timerStartedAt: 1_000 })

    expect(klondikeReducer(state, { type: 'TIMER_TICK', timestamp: 1_000 })).toBe(state)
    expect(klondikeReducer(state, { type: 'TIMER_TICK', timestamp: 900 })).toBe(state)
  })
})

describe('TIMER_STOP', () => {
  it('folds the final delta into elapsedMs and pauses', () => {
    const state = createTestState({
      timerState: 'running',
      timerStartedAt: 1_000,
      elapsedMs: 100,
    })

    const next = klondikeReducer(state, { type: 'TIMER_STOP', timestamp: 1_600 })

    expect(next.timerState).toBe('paused')
    expect(next.elapsedMs).toBe(700)
    expect(next.timerStartedAt).toBeNull()
  })

  it('is a reference-equal no-op when idle', () => {
    const state = createTestState()

    expect(klondikeReducer(state, { type: 'TIMER_STOP', timestamp: 1_600 })).toBe(state)
  })

  it('keeps a paused timer paused with values unchanged', () => {
    // stopTimer on a paused state returns a new object with identical values
    // (no reference short-circuit), so assert values rather than identity.
    const state = createTestState({
      timerState: 'paused',
      timerStartedAt: null,
      elapsedMs: 300,
    })

    const next = klondikeReducer(state, { type: 'TIMER_STOP', timestamp: 999 })

    expect(next.timerState).toBe('paused')
    expect(next.elapsedMs).toBe(300)
    expect(next.timerStartedAt).toBeNull()
  })
})

describe('TIMER_RESET', () => {
  it('resets a running timer to idle with zero elapsed time', () => {
    const state = createTestState({
      timerState: 'running',
      timerStartedAt: 1_000,
      elapsedMs: 400,
    })

    const next = klondikeReducer(state, { type: 'TIMER_RESET' })

    expect(next.timerState).toBe('idle')
    expect(next.elapsedMs).toBe(0)
    expect(next.timerStartedAt).toBeNull()
  })

  it('is a reference-equal no-op when already pristine', () => {
    const state = createTestState()

    expect(klondikeReducer(state, { type: 'TIMER_RESET' })).toBe(state)
  })
})
