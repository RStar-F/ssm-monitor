export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogOptions {
  level?: LogLevel
  prefix?: string
  enableConsole?: boolean
  enableStorage?: boolean
  maxStorageLogs?: number
  enableColors?: boolean
}

export interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: number
  prefix?: string
}