// 埋点事件类型
export type EventType = 'click' | 'exposure' | 'custom';

// 埋点事件数据
export interface TrackEvent {
  cls: string;           // 埋点ID
  eventType: EventType;  // 事件类型
  clsExt?: Record<string, any>; // 扩展参数
  time: number;          // 发生时间
  ua: string;            // 浏览器UA
  url: string;           // 页面URL
  sid?: string;          // 站点ID
  pid?: string;          // 页面ID
  os?: string;           // 操作系统
  br?: string;           // 浏览器品牌
}

// 埋点配置
export interface TrackerConfig {
  sid?: string;          // 站点ID
  pid?: string;          // 页面ID
  click?: boolean;       // 是否启用点击追踪
  exposure?: boolean;    // 是否启用曝光追踪
  exposureThreshold?: number; // 曝光阈值(0-1)
  exposureDuration?: number;  // 曝光时长(ms)
}

// 曝光观察项
export interface ExposureItem {
  element: Element;
  cls: string;
  clsExt?: Record<string, any>;
  exposed: boolean;
  timer?: number;
}