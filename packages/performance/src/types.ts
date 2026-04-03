// 性能指标类型
export interface PerformanceMetrics {
  // 页面加载性能
  dns: number;           // DNS查询时间
  tcp: number;           // TCP连接时间
  ssl: number;           // SSL握手时间
  ttfb: number;          // 首字节时间
  trans: number;         // 内容传输时间
  domParse: number;      // DOM解析时间
  resLoad: number;       // 资源加载时间
  fp: number;            // 首次绘制
  fcp: number;           // 首次内容绘制
  lcp: number;           // 最大内容绘制
  fid: number;           // 首次输入延迟
  cls: number;           // 累积布局偏移
  tti: number;           // 可交互时间
}

// 资源性能数据
export interface ResourceTiming {
  name: string;          // 资源URL
  type: ResourceType;    // 资源类型
  duration: number;      // 加载时长
  size: number;          // 资源大小
  dns: number;           // DNS查询时间
  tcp: number;           // TCP连接时间
  ssl: number;           // SSL握手时间
  ttfb: number;          // 首字节时间
  trans: number;         // 传输时间
}

// 资源类型
export type ResourceType = 'script' | 'link' | 'img' | 'css' | 'fetch' | 'xhr' | 'other';

// 接口性能数据
export interface APITiming {
  url: string;           // 接口URL
  method: string;        // 请求方法
  duration: number;      // 响应时长
  status: number;        // 状态码
  success: boolean;      // 是否成功
  time: number;          // 发生时间
}

// 性能事件类型
export type PerformanceEventType = 'metrics' | 'resource' | 'api';

// 性能事件数据
export interface PerformanceEvent {
  eventType: PerformanceEventType;
  data: PerformanceMetrics | ResourceTiming | APITiming;
  time: number;
}

// 性能监控配置
export interface PerformanceConfig {
  metrics?: boolean;      // 是否监控页面性能指标
  resource?: boolean;     // 是否监控资源加载
  api?: boolean;          // 是否监控接口响应
  resourceTimeout?: number; // 资源加载超时阈值(ms)
  apiTimeout?: number;    // 接口响应超时阈值(ms)
}