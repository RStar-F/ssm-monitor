import type { LogLevel, LogOptions, LogEntry } from './types'

export class Logger {
  private config: Required<LogOptions>
  private logs: LogEntry[] = []
  private isInitialized = false

  constructor(options: LogOptions = {}) {
    this.config = {
      level: options.level || 'info',
      prefix: options.prefix || 'MonitorSDK',
      enableConsole: options.enableConsole ?? true,
      enableStorage: options.enableStorage ?? false,
      maxStorageLogs: options.maxStorageLogs || 1000,
      enableColors: options.enableColors ?? true
    }
    this.isInitialized = true
  }

  /**
   * 获取日志级别数值
   */
  private getLevelValue(level: LogLevel): number {
    const levels = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 }
    return levels[level]
  }

  /**
   * 检查是否应该记录日志
   */
  private shouldLog(level: LogLevel): boolean {
    return this.getLevelValue(level) >= this.getLevelValue(this.config.level)
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : ''
    const levelStr = `[${level.toUpperCase()}]`

    let formattedMessage = `${timestamp} ${prefix} ${levelStr} ${message}`

    if (data !== undefined) {
      try {
        const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)
        formattedMessage += `\n${dataStr}`
      } catch (error) {
        formattedMessage += `\n[无法序列化数据: ${error}]`
      }
    }

    return formattedMessage
  }

  /**
   * 获取控制台颜色
   */
  private getConsoleColor(level: LogLevel): string {
    if (!this.config.enableColors) return ''

    const colors = {
      debug: 'color: #808080',
      info: 'color: #008000',
      warn: 'color: #FFA500',
      error: 'color: #FF0000',
      fatal: 'color: #8B0000; font-weight: bold'
    }

    return colors[level]
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(level: LogLevel, message: string, data?: any): void {
    if (!this.config.enableConsole) return

    const formattedMessage = this.formatMessage(level, message, data)
    const color = this.getConsoleColor(level)

    if (color) {
      console.log(`%c${formattedMessage}`, color)
    } else {
      console.log(formattedMessage)
    }
  }

  /**
   * 存储日志
   */
  private storeLog(entry: LogEntry): void {
    if (!this.config.enableStorage) return

    this.logs.push(entry)

    // 限制存储的日志数量
    if (this.logs.length > this.config.maxStorageLogs) {
      this.logs = this.logs.slice(-this.config.maxStorageLogs)
    }
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.isInitialized || !this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
      prefix: this.config.prefix
    }

    this.outputToConsole(level, message, data)
    this.storeLog(entry)
  }

  /**
   * 调试日志
   */
  debug(message: string, data?: any): void {
    this.log('debug', message, data)
  }

  /**
   * 信息日志
   */
  info(message: string, data?: any): void {
    this.log('info', message, data)
  }

  /**
   * 警告日志
   */
  warn(message: string, data?: any): void {
    this.log('warn', message, data)
  }

  /**
   * 错误日志
   */
  error(message: string, data?: any): void {
    this.log('error', message, data)
  }

  /**
   * 致命错误日志
   */
  fatal(message: string, data?: any): void {
    this.log('fatal', message, data)
  }

  /**
   * 获取存储的日志
   */
  getLogs(options: {
    level?: LogLevel
    startTime?: number
    endTime?: number
    limit?: number
  } = {}): LogEntry[] {
    let filteredLogs = this.logs

    // 按级别过滤
    if (options.level) {
      const minLevel = this.getLevelValue(options.level)
      filteredLogs = filteredLogs.filter(log => this.getLevelValue(log.level) >= minLevel)
    }

    // 按时间过滤
    if (options.startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= options.startTime!)
    }
    if (options.endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= options.endTime!)
    }

    // 限制数量
    if (options.limit) {
      filteredLogs = filteredLogs.slice(-options.limit)
    }

    return filteredLogs
  }

  /**
   * 清除日志
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * 获取日志统计
   */
  getStats(): {
    total: number
    byLevel: Record<LogLevel, number>
    oldest: LogEntry | null
    newest: LogEntry | null
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        fatal: 0
      },
      oldest: this.logs[0] || null,
      newest: this.logs[this.logs.length - 1] || null
    }

    this.logs.forEach(log => {
      stats.byLevel[log.level]++
    })

    return stats
  }

  /**
   * 导出日志
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    const logs = this.getLogs()

    if (format === 'csv') {
      const headers = ['时间', '级别', '前缀', '消息', '数据']
      const rows = logs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.level,
        log.prefix || '',
        log.message,
        JSON.stringify(log.data || '')
      ])

      return [headers, ...rows].map(row => row.join(',')).join('\n')
    }

    return JSON.stringify(logs, null, 2)
  }

  /**
   * 更新配置
   */
  updateConfig(options: Partial<LogOptions>): void {
    this.config = { ...this.config, ...options }
  }

  /**
   * 获取当前配置
   */
  getConfig(): LogOptions {
    return { ...this.config }
  }
}

/**
 * 默认日志实例
 */
export const logger = new Logger()

/**
 * 创建日志实例
 */
export function createLogger(options: LogOptions = {}): Logger {
  return new Logger(options)
}

export default logger