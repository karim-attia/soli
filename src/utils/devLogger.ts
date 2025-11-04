type DevLogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

const LOG_LEVELS: ReadonlyArray<DevLogLevel> = ['log', 'info', 'warn', 'error', 'debug']

const CONSOLE_METHODS: Record<DevLogLevel, (...args: unknown[]) => void> = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug ? console.debug.bind(console) : console.log.bind(console),
}

const LOG_PREFIX = '[SoliDev]'

let developerLoggingEnabled = false

export const setDeveloperLoggingEnabled = (enabled: boolean): void => {
  developerLoggingEnabled = enabled
}

export const devLog = (level: DevLogLevel, ...args: unknown[]): void => {
  if (!developerLoggingEnabled) {
    return
  }

  const method = CONSOLE_METHODS[level] ?? CONSOLE_METHODS.log
  if (args.length === 0) {
    method(LOG_PREFIX)
    return
  }
  method(LOG_PREFIX, ...args)
}

export const getDeveloperLoggingEnabled = (): boolean => developerLoggingEnabled

export type { DevLogLevel }

