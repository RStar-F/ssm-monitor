import type { ErrorConfig, ErrorEvent, ResourceError } from './types';

// 默认配置
const DEFAULT_CONFIG: Required<ErrorConfig> = {
  js: true,
  resource: true,
  promise: true,
  vue: false,
  react: false,
  captureConsole: false
};

export class ErrorMonitor {
  private config: Required<ErrorConfig>;
  private eventQueue: ErrorEvent[] = [];
  private ua: string;

  // 事件回调
  public onEvent: ((event: ErrorEvent) => void) | null = null;

  constructor(config: ErrorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ua = navigator.userAgent;
    this.init();
  }

  // 初始化
  private init(): void {
    if (this.config.js) {
      this.observeJSError();
    }
    if (this.config.resource) {
      this.observeResourceError();
    }
    if (this.config.promise) {
      this.observePromiseError();
    }
    if (this.config.captureConsole) {
      this.observeConsoleError();
    }
  }

  // 监控JS错误
  private observeJSError(): void {
    window.addEventListener('error', (event) => {
      // 排除资源错误
      if (event.target && (event.target as Element).tagName) {
        return;
      }

      const errorEvent: ErrorEvent = {
        type: 'js',
        level: 'error',
        message: event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        url: window.location.href,
        time: Date.now(),
        userAgent: this.ua
      };

      this.emit(errorEvent);
    }, true);
  }

  // 监控资源错误
  private observeResourceError(): void {
    window.addEventListener('error', (event) => {
      const target = event.target as Element;
      if (!target || !target.tagName) return;

      const tagName = target.tagName.toLowerCase();
      if (!['img', 'script', 'link', 'audio', 'video', 'source'].includes(tagName)) return;

      const resourceError: ResourceError = {
        tagName,
        src: (target as HTMLImageElement).src,
        href: (target as HTMLLinkElement).href,
        outerHTML: target.outerHTML
      };

      const errorEvent: ErrorEvent = {
        type: 'resource',
        level: 'error',
        message: `Resource load error: ${resourceError.src || resourceError.href || tagName}`,
        url: window.location.href,
        time: Date.now(),
        userAgent: this.ua,
        extra: resourceError
      };

      this.emit(errorEvent);
    }, true);
  }

  // 监控Promise错误
  private observePromiseError(): void {
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      let message = 'Unknown promise error';
      let stack: string | undefined;

      if (error instanceof Error) {
        message = error.message;
        stack = error.stack;
      } else if (typeof error === 'string') {
        message = error;
      } else {
        message = JSON.stringify(error);
      }

      const errorEvent: ErrorEvent = {
        type: 'promise',
        level: 'error',
        message,
        stack,
        url: window.location.href,
        time: Date.now(),
        userAgent: this.ua
      };

      this.emit(errorEvent);
    });
  }

  // 监控console.error
  private observeConsoleError(): void {
    const originalError = console.error;
    const self = this;

    console.error = function (...args: any[]) {
      const message = args.map(arg => {
        if (arg instanceof Error) {
          return arg.message;
        }
        if (typeof arg === 'object') {
          return JSON.stringify(arg);
        }
        return String(arg);
      }).join(' ');

      const errorEvent: ErrorEvent = {
        type: 'js',
        level: 'error',
        message,
        url: window.location.href,
        time: Date.now(),
        userAgent: self.ua
      };

      self.emit(errorEvent);
      originalError.apply(console, args);
    };
  }

  // 手动上报错误
  public captureError(error: Error | string, extra?: Record<string, any>): void {
    const errorEvent: ErrorEvent = {
      type: 'js',
      level: 'error',
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      url: window.location.href,
      time: Date.now(),
      userAgent: this.ua,
      extra
    };

    this.emit(errorEvent);
  }

  // 发送事件
  private emit(event: ErrorEvent): void {
    this.eventQueue.push(event);
    this.onEvent?.(event);
  }

  // 获取所有事件
  public getEvents(): ErrorEvent[] {
    return [...this.eventQueue];
  }

  // 清空事件
  public clearEvents(): void {
    this.eventQueue = [];
  }

  // 销毁
  public destroy(): void {
    this.eventQueue = [];
  }
}