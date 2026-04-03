import type { ReporterConfig, ReportData, ReportResult, ReportMethod } from './types';
import { createLogger } from '@ssm/logger'

const logger = createLogger({
  prefix: 'Reporter'
})
// 默认配置
const DEFAULT_CONFIG: Required<Omit<ReporterConfig, 'url'>> = {
  batchSize: 10,
  batchTimeout: 5000,
  useBeacon: true,
  headers: { 'Content-Type': 'application/json' },
  retryTimes: 3,
  retryDelay: 1000
};

export class Reporter {
  private config: Required<ReporterConfig>;
  private queue: ReportData[] = [];
  private timer: number | null = null;
  private ua: string;

  // 事件回调
  public onReport: ((result: ReportResult) => void) | null = null;

  constructor(config: ReporterConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ua = navigator.userAgent;
    this.init();
  }

  // 初始化
  private init(): void {
    // 监听页面隐藏事件
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // 监听页面关闭事件
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

    // 监听空闲时间
    this.scheduleIdleReport();
  }

  // 处理页面可见性变化
  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.flush();
    }
  }

  // 处理页面关闭
  private handleBeforeUnload(): void {
    this.flush();
  }

  /**
   * 利用浏览器空闲时间上报
   * TODO：这里需要修改，空闲时间也应该批量上报
   */
  private scheduleIdleReport(): void {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        if (this.queue.length > 0) {
          this.flush();
        }
        this.scheduleIdleReport();
      }, { timeout: 10000 });
    }
  }

  // 添加数据到队列
  public report(data: ReportData): void {
    // 补充公共字段
    const enrichedData: ReportData = {
      ...data,
      id: data.id || this.generateId(),
      timestamp: data.timestamp || Date.now(),
      url: data.url || window.location.href,
      ua: data.ua || this.ua
    };

    this.queue.push(enrichedData);

    /**
     * 上报条件
     * 队列到达限制 或者 到达时间间隔
     */
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    } else {
      this.startTimer();
    }
  }

  // 批量上报
  public reportBatch(data: ReportData[]): void {
    data.forEach(item => this.report(item));
  }

  // 启动定时器
  private startTimer(): void {
    if (this.timer) return;

    this.timer = window.setTimeout(() => {
      logger.info('时间到了')
      this.flush();
    }, this.config.batchTimeout);
  }

  // 清空队列并上报
  public async flush(): Promise<ReportResult> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) {
      return { success: true, data: [] };
    }

    const data = [...this.queue];
    this.queue = [];
    return this.doReport(data);
  }

  // 执行上报
  private async doReport(data: ReportData[], retryCount = 0): Promise<ReportResult> {
    try {
      const method = this.getReportMethod();
      const result = await this.sendByMethod(data, method);

      if (result.success) {
        this.onReport?.({ success: true, data });
        return result;
      }

      // 重试
      if (retryCount < this.config.retryTimes) {
        await this.delay(this.config.retryDelay);
        return this.doReport(data, retryCount + 1);
      }

      // 重试失败，数据放回队列
      this.queue.unshift(...data);
      this.onReport?.({ success: false, data, error: new Error('Report failed after retries') });
      return { success: false, data, error: new Error('Report failed after retries') };
    } catch (error) {
      // 重试
      if (retryCount < this.config.retryTimes) {
        await this.delay(this.config.retryDelay);
        return this.doReport(data, retryCount + 1);
      }

      this.queue.unshift(...data);
      this.onReport?.({ success: false, data, error: error as Error });
      return { success: false, data, error: error as Error };
    }
  }

  // 获取上报方式
  private getReportMethod(): ReportMethod {
    if (this.config.useBeacon && 'sendBeacon' in navigator) {
      return 'beacon';
    }
    if ('fetch' in window) {
      return 'fetch';
    }
    return 'xhr';
  }

  // 根据方式发送
  private async sendByMethod(data: ReportData[], method: ReportMethod): Promise<ReportResult> {
    const payload = JSON.stringify({ events: data });

    console.log('pppp', payload)
    switch (method) {
      case 'beacon':
        return this.sendByBeacon(payload);
      case 'fetch':
        return this.sendByFetch(payload);
      case 'xhr':
        return this.sendByXHR(payload);
    }
  }

  // 使用sendBeacon发送
  private async sendByBeacon(payload: string): Promise<ReportResult> {
    try {
      const success = navigator.sendBeacon(this.config.url, payload);
      return { success, data: [] };
    } catch (error) {
      // 降级到fetch
      return this.sendByFetch(payload);
    }
  }

  // 使用fetch发送
  private async sendByFetch(payload: string): Promise<ReportResult> {
    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: this.config.headers,
        body: payload,
        keepalive: true
      });

      return { success: response.ok, data: [] };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  // 使用XHR发送
  private async sendByXHR(payload: string): Promise<ReportResult> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', this.config.url, true);

      Object.entries(this.config.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          resolve({ success: xhr.status >= 200 && xhr.status < 300, data: [] });
        }
      };

      xhr.onerror = () => {
        resolve({ success: false, error: new Error('XHR error') });
      };

      xhr.send(payload);
    });
  }

  // 生成ID
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 延迟
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 销毁
  public destroy(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.queue = [];
  }
}