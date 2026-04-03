import type { PerformanceConfig, PerformanceMetrics, ResourceTiming, APITiming, PerformanceEvent, ResourceType } from './types';

// 默认配置
const DEFAULT_CONFIG: Required<PerformanceConfig> = {
  metrics: true,
  resource: true,
  api: true,
  resourceTimeout: 5000,
  apiTimeout: 10000
};

export class PerformanceMonitor {
  private config: Required<PerformanceConfig>;
  private eventQueue: PerformanceEvent[] = [];
  private observedResources: Set<string> = new Set();

  // 事件回调
  public onEvent: ((event: PerformanceEvent) => void) | null = null;

  constructor(config: PerformanceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.init();
  }

  // 初始化
  private init(): void {
    if (this.config.metrics) {
      this.observeMetrics();
    }
    if (this.config.resource) {
      this.observeResources();
    }
    if (this.config.api) {
      this.observeAPI();
    }
  }

  // 监控页面性能指标
  private observeMetrics(): void {
    // 页面加载完成后收集指标
    if (document.readyState === 'complete') {
      this.collectMetrics();
    } else {
      window.addEventListener('load', () => {
        this.collectMetrics();
      });
    }

    // 监听LCP
    this.observeLCP();

    // 监听FID
    this.observeFID();

    // 监听CLS
    this.observeCLS();
  }

  // 收集性能指标
  private collectMetrics(): void {
    setTimeout(() => {
      const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (!timing) return;

      const paintEntries = performance.getEntriesByType('paint');
      const fpEntry = paintEntries.find(e => e.name === 'first-paint');
      const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');

      const metrics: PerformanceMetrics = {
        dns: timing.domainLookupEnd - timing.domainLookupStart,
        tcp: timing.connectEnd - timing.connectStart,
        ssl: timing.secureConnectionStart > 0 ? timing.connectEnd - timing.secureConnectionStart : 0,
        ttfb: timing.responseStart - timing.requestStart,
        trans: timing.responseEnd - timing.responseStart,
        domParse: timing.domComplete - timing.domInteractive,
        resLoad: timing.loadEventStart - timing.domContentLoadedEventEnd,
        fp: fpEntry?.startTime || 0,
        fcp: fcpEntry?.startTime || 0,
        lcp: 0,
        fid: 0,
        cls: 0,
        tti: timing.domInteractive - timing.fetchStart
      };

      this.emit('metrics', metrics);
    }, 0);
  }

  // 监听LCP
  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;

        // 更新最后的LCP值
        const lastEvent = this.eventQueue.find(e => e.eventType === 'metrics');
        if (lastEvent && lastEvent.data) {
          (lastEvent.data as PerformanceMetrics).lcp = lastEntry.startTime;
        }
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // 浏览器不支持
    }
  }

  // 监听FID
  private observeFID(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;

        const lastEvent = this.eventQueue.find(e => e.eventType === 'metrics');
        if (lastEvent && lastEvent.data) {
          (lastEvent.data as PerformanceMetrics).fid = lastEntry.processingStart - lastEntry.startTime;
        }
      });
      observer.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // 浏览器不支持
    }
  }

  // 监听CLS
  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }

        const lastEvent = this.eventQueue.find(e => e.eventType === 'metrics');
        if (lastEvent && lastEvent.data) {
          (lastEvent.data as PerformanceMetrics).cls = clsValue;
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // 浏览器不支持
    }
  }

  // 监控资源加载
  private observeResources(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
          this.processResource(entry);
        }
      });
      observer.observe({ type: 'resource', buffered: true });
    } catch (e) {
      // 降级：定时检查
      this.pollResources();
    }
  }

  // 轮询资源（降级方案）
  private pollResources(): void {
    const checkResources = () => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      entries.forEach(entry => this.processResource(entry));
    };

    // 页面加载完成后检查
    window.addEventListener('load', () => {
      setTimeout(checkResources, 1000);
    });
  }

  // 处理资源
  private processResource(entry: PerformanceResourceTiming): void {
    // 去重
    if (this.observedResources.has(entry.name)) return;
    this.observedResources.add(entry.name);

    // 只记录超时或大资源
    if (entry.duration < this.config.resourceTimeout && entry.transferSize < 100000) return;

    const resource: ResourceTiming = {
      name: entry.name,
      type: this.getResourceType(entry),
      duration: entry.duration,
      size: entry.transferSize,
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      ssl: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
      ttfb: entry.responseStart - entry.requestStart,
      trans: entry.responseEnd - entry.responseStart
    };

    this.emit('resource', resource);
  }

  // 获取资源类型
  private getResourceType(entry: PerformanceResourceTiming): ResourceType {
    const type = entry.initiatorType;
    if (type === 'script') return 'script';
    if (type === 'link') return 'link';
    if (type === 'img' || type === 'image') return 'img';
    if (type === 'css') return 'css';
    if (type === 'fetch') return 'fetch';
    if (type === 'xmlhttprequest') return 'xhr';
    return 'other';
  }

  // 监控API请求
  private observeAPI(): void {
    this.interceptXHR();
    this.interceptFetch();
  }

  // 拦截XHR
  private interceptXHR(): void {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const self = this;

    XMLHttpRequest.prototype.open = function (method: string, url: string, async: boolean = true, username?: string | null, password?: string | null) {
      (this as any)._perfData = { method: method.toUpperCase(), url, startTime: 0 };
      return originalOpen.call(this, method, url, async, username, password);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      if ((this as any)._perfData) {
        (this as any)._perfData.startTime = performance.now();

        this.addEventListener('load', function () {
          const data = (this as any)._perfData;
          const duration = performance.now() - data.startTime;

          // 只记录超时的请求
          if (duration >= self.config.apiTimeout) {
            const api: APITiming = {
              url: data.url,
              method: data.method,
              duration,
              status: this.status,
              success: this.status >= 200 && this.status < 400,
              time: Date.now()
            };
            self.emit('api', api);
          }
        });
      }
      return originalSend.call(this, body);
    };
  }

  // 拦截Fetch
  private interceptFetch(): void {
    const originalFetch = window.fetch;
    const self = this;

    window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const startTime = performance.now();
      const method = init?.method?.toUpperCase() || 'GET';
      const url = typeof input === 'string' ? input : (input as Request).url;

      return originalFetch.apply(this, [input, init] as any).then((response) => {
        const duration = performance.now() - startTime;

        // 只记录超时的请求
        if (duration >= self.config.apiTimeout) {
          const api: APITiming = {
            url,
            method,
            duration,
            status: response.status,
            success: response.ok,
            time: Date.now()
          };
          self.emit('api', api);
        }

        return response;
      });
    };
  }

  // 发送事件
  private emit(eventType: PerformanceEvent['eventType'], data: PerformanceEvent['data']): void {
    const event: PerformanceEvent = {
      eventType,
      data,
      time: Date.now()
    };

    this.eventQueue.push(event);
    this.onEvent?.(event);
  }

  // 获取所有事件
  public getEvents(): PerformanceEvent[] {
    return [...this.eventQueue];
  }

  // 清空事件
  public clearEvents(): void {
    this.eventQueue = [];
  }

  // 销毁
  public destroy(): void {
    this.eventQueue = [];
    this.observedResources.clear();
  }
}