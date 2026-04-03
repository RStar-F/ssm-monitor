import type { TrackerConfig, TrackEvent, ExposureItem } from './types';
import { parseUA, getCls, getClsExt } from './utils';

// 内部配置类型
interface InternalConfig {
  sid?: string;
  pid?: string;
  click: boolean;
  exposure: boolean;
  exposureThreshold: number;
  exposureDuration: number;
}

// 默认配置
const DEFAULT_CONFIG: InternalConfig = {
  click: true,
  exposure: true,
  exposureThreshold: 0.5,
  exposureDuration: 500
};

export class Tracker {
  private config: InternalConfig;
  private eventQueue: TrackEvent[] = [];
  private exposureItems: Map<Element, ExposureItem> = new Map();
  private observer: IntersectionObserver | null = null;
  private ua: string;
  private os: string;
  private br: string;
  private url: string;

  // 事件回调
  public onEvent: ((event: TrackEvent) => void) | null = null;

  constructor(config: TrackerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ua = navigator.userAgent;
    this.url = window.location.href;

    const { os, br } = parseUA(this.ua);
    this.os = os;
    this.br = br;

    this.init();
  }

  // 初始化
  private init(): void {
    if (this.config.click) {
      this.initClickTracking();
    }
    if (this.config.exposure) {
      this.initExposureTracking();
    }
  }

  // 创建事件基础数据
  private createBaseEvent(cls: string, eventType: TrackEvent['eventType'], clsExt?: Record<string, any>): TrackEvent {
    return {
      cls,
      eventType,
      clsExt,
      time: Date.now(),
      ua: this.ua,
      url: this.url,
      sid: this.config.sid,
      pid: this.config.pid,
      os: this.os,
      br: this.br
    };
  }

  // 初始化点击追踪
  private initClickTracking(): void {
    document.addEventListener('click', this.handleClick.bind(this), true);
  }

  // 处理点击事件
  private handleClick(event: MouseEvent): void {
    const target = event.target as Element;
    const cls = getCls(target);

    if (cls) {
      const clsExt = getClsExt(target);
      this.track('click', cls, clsExt);
    }
  }

  // 初始化曝光追踪
  private initExposureTracking(): void {
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      { threshold: [this.config.exposureThreshold] }
    );

    // 观察所有带data-cls属性的元素
    this.observeElements();

    // 监听DOM变化
    this.observeDOMChanges();
  }

  // 观察元素
  private observeElements(): void {
    document.querySelectorAll('[data-cls]').forEach(element => {
      if (!this.exposureItems.has(element)) {
        const cls = getCls(element);
        if (cls) {
          const item: ExposureItem = {
            element,
            cls,
            clsExt: getClsExt(element),
            exposed: false
          };
          this.exposureItems.set(element, item);
          this.observer?.observe(element);
        }
      }
    });
  }

  // 监听DOM变化
  private observeDOMChanges(): void {
    const observer = new MutationObserver(() => {
      this.observeElements();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 处理交集变化
  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      const item = this.exposureItems.get(entry.target);
      if (!item || item.exposed) return;

      if (entry.isIntersecting && entry.intersectionRatio >= this.config.exposureThreshold) {
        // 开始曝光计时
        if (!item.timer) {
          item.timer = window.setTimeout(() => {
            item.exposed = true;
            this.track('exposure', item.cls, item.clsExt);
          }, this.config.exposureDuration);
        }
      } else {
        // 取消曝光计时
        if (item.timer) {
          clearTimeout(item.timer);
          item.timer = undefined;
        }
      }
    });
  }

  // 追踪事件
  public track(eventType: TrackEvent['eventType'], cls: string, clsExt?: Record<string, any>): void {
    const event = this.createBaseEvent(cls, eventType, clsExt);
    this.eventQueue.push(event);

    // 触发回调
    this.onEvent?.(event);
  }

  // 获取事件队列
  public getEvents(): TrackEvent[] {
    return [...this.eventQueue];
  }

  // 清空事件队列
  public clearEvents(): void {
    this.eventQueue = [];
  }

  // 销毁
  public destroy(): void {
    document.removeEventListener('click', this.handleClick.bind(this), true);
    this.observer?.disconnect();
    this.exposureItems.forEach(item => {
      if (item.timer) clearTimeout(item.timer);
    });
    this.exposureItems.clear();
    this.eventQueue = [];
  }
}