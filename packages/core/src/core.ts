import { Tracker } from '@ssm/tracker';
import { PerformanceMonitor } from '@ssm/performance';
import { ErrorMonitor } from '@ssm/error';
import { BlankScreenMonitor } from '@ssm/blank-screen';
import { StorageManager } from '@ssm/storage';
import { Reporter } from '@ssm/reporter';
import { createLogger } from '@ssm/logger'
import type { MonitorSDKConfig, MonitorEvent, MonitorSDKStatus, TrackEvent, PerformanceEvent, ErrorEvent, BlankScreenEvent, ReportData } from './types';
import type { EventType } from '@ssm/tracker';
import type { BlankScreenResult } from '@ssm/blank-screen';
import type { StorageItem } from '@ssm/storage';

// 默认配置
const DEFAULT_CONFIG: Partial<MonitorSDKConfig> = {
  enableTracker: true,
  enablePerformance: true,
  enableError: true,
  enableBlankScreen: true
};

const logger = createLogger({
  prefix: 'ssm'
})

export class MonitorSDK {
  private config: Required<MonitorSDKConfig>;
  private ua: string;
  private status: MonitorSDKStatus;

  // 子模块实例
  private tracker: Tracker | null = null;
  private performance: PerformanceMonitor | null = null;
  private error: ErrorMonitor | null = null;
  private blankScreen: BlankScreenMonitor | null = null;
  private storage: StorageManager | null = null;
  private reporter: Reporter | null = null;

  constructor(config: MonitorSDKConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<MonitorSDKConfig>;
    this.ua = navigator.userAgent;
    this.status = {
      initialized: false,
      trackerEnabled: false,
      performanceEnabled: false,
      errorEnabled: false,
      blankScreenEnabled: false
    };
  }

  // 初始化SDK
  public init(): void {
    if (this.status.initialized) {
      logger.warn('MonitorSDK已经初始化');
      return;
    }

    // 初始化存储
    this.storage = new StorageManager({
      dbName: 'ssm_sdk',
      storeName: 'events',
      maxItems: 1000,
      useIndexedDB: true
    });

    // 初始化上报器
    this.reporter = new Reporter({
      url: this.config.reportUrl,
      batchSize: 10,
      batchTimeout: 5000,
      useBeacon: true,
      retryTimes: 3
    });

    // 监听上报结果
    this.reporter.onReport = async (result) => {
      if (result.success && result.data) {
        // 上报成功后，从存储中删除已上报的数据
        for (const item of result.data) {
          if (item.id) {
            await this.storage?.remove(item.id);
          }
        }
      }
    };

    // 初始化各模块
    this.initTracker();
    this.initPerformance();
    this.initError();
    this.initBlankScreen();

    // 监听浏览器事件
    this.listenBrowserEvents();

    // 处理存储中的旧数据
    this.processStoredEvents();

    this.status.initialized = true;
    logger.info('MonitorSDK初始化成功');
  }

  // 初始化埋点模块
  private initTracker(): void {
    if (!this.config.enableTracker) return;

    this.tracker = new Tracker({
      sid: this.config.sid,
      pid: this.config.pid,
      ...this.config.tracker
    });

    this.tracker.onEvent = (event: TrackEvent) => {
      this.handleEvent('track', event);
    };

    this.status.trackerEnabled = true;
  }

  // 初始化性能监控
  private initPerformance(): void {
    if (!this.config.enablePerformance) return;

    this.performance = new PerformanceMonitor({
      ...this.config.performance
    });

    this.performance.onEvent = (event: PerformanceEvent) => {
      logger.info('performance')
      this.handleEvent('performance', event);
    };

    this.status.performanceEnabled = true;
  }

  // 初始化错误监控
  private initError(): void {
    if (!this.config.enableError) return;

    this.error = new ErrorMonitor({
      ...this.config.error
    });

    this.error.onEvent = (event: ErrorEvent) => {
      this.handleEvent('error', event);
    };

    this.status.errorEnabled = true;
  }

  // 初始化白屏检测
  private initBlankScreen(): void {
    if (!this.config.enableBlankScreen) return;

    this.blankScreen = new BlankScreenMonitor({
      ...this.config.blankScreen
    });

    this.blankScreen.onEvent = (event: BlankScreenEvent) => {
      this.handleEvent('blankScreen', event);
    };

    this.status.blankScreenEnabled = true;
  }

  /**
   * 根据事件类型合成数据 先进行存储
   * 然后立即上报
   * 如果上报成功，在将存储数据删除
   */
  private async handleEvent(type: MonitorEvent['type'], data: any): Promise<void> {
    const event: MonitorEvent = {
      id: this.generateId(),
      type,
      data,
      timestamp: Date.now(),
      url: window.location.href,
      ua: this.ua,
      sid: this.config.sid,
      pid: this.config.pid
    };

    // 存储事件
    const storageItem: StorageItem = {
      id: event.id,
      data: event,
      timestamp: event.timestamp,
      type: event.type
    };
    await this.storage?.add(storageItem);

    // 上报事件
    this.reportEvent(event);
  }

  /**
   * 这里上报事件并不是真的上报服务端
   * 而是先放到队列里面批量上报
   */
  private reportEvent(event: MonitorEvent): void {
    const reportData: ReportData = {
      id: event.id,
      type: event.type,
      data: event.data,
      timestamp: event.timestamp,
      url: event.url,
      ua: event.ua
    };

    this.reporter?.report(reportData);
  }

  /**
   * 兜底处理
   * 防止数据丢失 处理未来得及上报的数据
  */
  private async processStoredEvents(): Promise<void> {
    const items = await this.storage?.getAll() || [];
    for (const item of items) {
      if (item && item.data) {
        this.reportEvent(item.data as MonitorEvent);
      }
    }
  }

  /** 监听浏览器事件 */
  private listenBrowserEvents(): void {
    // 页面隐藏时上报
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.reporter?.flush();
      }
    });

    // 页面关闭前上报
    window.addEventListener('beforeunload', () => {
      this.reporter?.flush();
    });

    // 空闲时间上报
    if ('requestIdleCallback' in window) {
      const idleCallback = () => {
        this.reporter?.flush();
        requestIdleCallback(idleCallback, { timeout: 10000 });
      };
      requestIdleCallback(idleCallback, { timeout: 10000 });
    }
  }

  // 生成ID
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 手动追踪事件
  public track(eventType: EventType, cls: string, clsExt?: Record<string, any>): void {
    this.tracker?.track(eventType, cls, clsExt);
  }

  // 手动上报错误
  public captureError(error: Error | string, extra?: Record<string, any>): void {
    this.error?.captureError(error, extra);
  }

  // 手动检测白屏
  public detectBlankScreen(): BlankScreenResult | null {
    return this.blankScreen?.detect() || null;
  }


  public getStatus(): MonitorSDKStatus {
    return { ...this.status };
  }


  public destroy(): void {
    // 先上报剩余数据
    this.reporter?.flush();

    // 销毁各模块
    this.tracker?.destroy();
    this.performance?.destroy();
    this.error?.destroy();
    this.blankScreen?.destroy();

    // 重置状态
    this.status = {
      initialized: false,
      trackerEnabled: false,
      performanceEnabled: false,
      errorEnabled: false,
      blankScreenEnabled: false
    };

    logger.info('MonitorSDK已卸载');
  }
}