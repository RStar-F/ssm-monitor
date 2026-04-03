// 白屏检测结果
export interface BlankScreenResult {
  isBlank: boolean;          // 是否白屏
  blankRatio: number;        // 白屏比例
  timestamp: number;         // 检测时间戳
  screenshot?: string;       // 截图(可选)
}

// 白屏事件
export interface BlankScreenEvent {
  isBlank: boolean;
  blankRatio: number;
  time: number;
  url: string;
  userAgent: string;
}

// 白屏监控配置
export interface BlankScreenConfig {
  enabled?: boolean;         // 是否启用
  threshold?: number;        // 白屏阈值(0-1)
  checkDelay?: number;       // 检测延迟(ms)
  checkInterval?: number;    // 检测间隔(ms)
  samplingPoints?: number;   // 采样点数量
  importantSelectors?: string[]; // 重要元素选择器
  autoReport?: boolean;      // 是否自动上报
}