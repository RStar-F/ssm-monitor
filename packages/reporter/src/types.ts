// 上报数据类型
export interface ReportData {
  id?: string;               // 数据ID
  type: string;              // 数据类型
  data: any;                 // 数据内容
  timestamp: number;         // 时间戳
  url?: string;              // 页面URL
  ua?: string;               // 用户代理
}

// 上报配置
export interface ReporterConfig {
  url: string;               // 上报URL
  batchSize?: number;        // 批量大小，默认10
  batchTimeout?: number;     // 批量超时，默认5000ms
  useBeacon?: boolean;       // 是否使用sendBeacon，默认true
  headers?: Record<string, string>; // 自定义请求头
  retryTimes?: number;       // 重试次数，默认3
  retryDelay?: number;       // 重试延迟，默认1000ms
}

// 上报结果
export interface ReportResult {
  success: boolean;          // 是否成功
  data?: ReportData[];       // 上报的数据
  error?: Error;             // 错误信息
}

// 上报方式
export type ReportMethod = 'beacon' | 'fetch' | 'xhr';