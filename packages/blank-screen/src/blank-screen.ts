import type { BlankScreenConfig, BlankScreenEvent, BlankScreenResult } from './types';

// 默认配置
const DEFAULT_CONFIG: Required<BlankScreenConfig> = {
  enabled: true,
  threshold: 0.9,           // 90%空白视为白屏
  checkDelay: 3000,         // 3秒后开始检测
  checkInterval: 5000,      // 每5秒检测一次
  samplingPoints: 30,       // 采样点数量
  importantSelectors: ['#app', '#root', '#main', '.main', '.content'],
  autoReport: true
};

export class BlankScreenMonitor {
  private config: Required<BlankScreenConfig>;
  private ua: string;
  private checkTimer: number | null = null;
  private intervalTimer: number | null = null;
  private isBlankScreen: boolean = false;

  // 事件回调
  public onEvent: ((event: BlankScreenEvent) => void) | null = null;

  constructor(config: BlankScreenConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ua = navigator.userAgent;

    if (this.config.enabled) {
      this.init();
    }
  }

  // 初始化
  private init(): void {
    // 延迟检测
    setTimeout(() => {
      this.check();
      // 定时检测
      if (this.config.checkInterval > 0) {
        this.intervalTimer = window.setInterval(() => {
          this.check();
        }, this.config.checkInterval);
      }
    }, this.config.checkDelay);
  }

  // 检测白屏
  private check(): BlankScreenResult {
    const blankRatio = this.calculateBlankRatio();
    const isBlank = blankRatio >= this.config.threshold;

    // 状态变化时触发事件
    if (isBlank && !this.isBlankScreen) {
      this.isBlankScreen = true;
      this.emit(isBlank, blankRatio);
    } else if (!isBlank && this.isBlankScreen) {
      this.isBlankScreen = false;
    }

    return {
      isBlank,
      blankRatio,
      timestamp: Date.now()
    };
  }

  // 计算白屏比例
  private calculateBlankRatio(): number {
    // 方法1: 检查重要元素
    const importantElementsFound = this.checkImportantElements();
    if (importantElementsFound) {
      return 0;
    }

    // 方法2: 采样点检测
    const blankPoints = this.samplingCheck();
    return blankPoints;
  }

  // 检查重要元素
  private checkImportantElements(): boolean {
    for (const selector of this.config.importantSelectors) {
      const element = document.querySelector(selector);
      if (element && this.isElementVisible(element)) {
        return true;
      }
    }
    return false;
  }

  // 检查元素是否可见
  private isElementVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  // 采样点检测
  private samplingCheck(): number {
    const points = this.generateSamplingPoints();
    let blankCount = 0;

    for (const point of points) {
      if (this.isPointBlank(point.x, point.y)) {
        blankCount++;
      }
    }

    return blankCount / points.length;
  }

  // 生成采样点
  private generateSamplingPoints(): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    const width = window.innerWidth;
    const height = window.innerHeight;
    const count = Math.sqrt(this.config.samplingPoints);

    for (let i = 1; i <= count; i++) {
      for (let j = 1; j <= count; j++) {
        points.push({
          x: Math.floor((width * i) / (count + 1)),
          y: Math.floor((height * j) / (count + 1))
        });
      }
    }

    return points;
  }

  // 判断采样点是否为空白
  private isPointBlank(x: number, y: number): boolean {
    const element = document.elementFromPoint(x, y);

    if (!element) {
      return true;
    }

    // 检查是否是body或html
    if (element === document.body || element === document.documentElement) {
      return true;
    }

    // 检查背景色
    const style = window.getComputedStyle(element);
    const bgColor = style.backgroundColor;

    // 如果背景是白色或透明，可能是空白
    if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent' ||
      bgColor === 'rgb(255, 255, 255)' || bgColor === '#ffffff') {
      return true;
    }

    return false;
  }

  // 手动检测
  public detect(): BlankScreenResult {
    return this.check();
  }

  // 发送事件
  private emit(isBlank: boolean, blankRatio: number): void {
    const event: BlankScreenEvent = {
      isBlank,
      blankRatio,
      time: Date.now(),
      url: window.location.href,
      userAgent: this.ua
    };

    this.onEvent?.(event);
  }

  // 销毁
  public destroy(): void {
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.isBlankScreen = false;
  }
}