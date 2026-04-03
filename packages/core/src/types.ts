// 导入各模块类型
import type { TrackerConfig, TrackEvent } from '@ssm/tracker';
import type { PerformanceConfig, PerformanceEvent } from '@ssm/performance';
import type { ErrorConfig, ErrorEvent } from '@ssm/error';
import type { BlankScreenConfig, BlankScreenEvent } from '@ssm/blank-screen';
import type { StorageConfig, StorageItem } from '@ssm/storage';
import type { ReporterConfig, ReportData } from '@ssm/reporter';

// 重导出各模块类型
export type { TrackerConfig, TrackEvent };
export type { PerformanceConfig, PerformanceEvent };
export type { ErrorConfig, ErrorEvent };
export type { BlankScreenConfig, BlankScreenEvent };
export type { StorageConfig, StorageItem };
export type { ReporterConfig, ReportData };

// SDK配置
export interface MonitorSDKConfig {
  // 基础配置
  sid: string;                    // 站点ID
  pid: string;                    // 页面ID
  reportUrl: string;              // 上报URL

  // 子模块配置（可选，使用默认配置）
  tracker?: TrackerConfig;
  performance?: PerformanceConfig;
  error?: ErrorConfig;
  blankScreen?: BlankScreenConfig;
  storage?: StorageConfig;
  reporter?: Omit<ReporterConfig, 'url'>;

  // 功能开关
  enableTracker?: boolean;        // 是否启用埋点
  enablePerformance?: boolean;    // 是否启用性能监控
  enableError?: boolean;          // 是否启用错误监控
  enableBlankScreen?: boolean;    // 是否启用白屏检测
}

// 统一事件类型
export type MonitorEventData = TrackEvent | PerformanceEvent | ErrorEvent | BlankScreenEvent;

export interface MonitorEvent {
  id: string;                     // 事件ID
  type: 'track' | 'performance' | 'error' | 'blankScreen'; // 事件类型
  data: MonitorEventData;            // 事件数据
  timestamp: number;              // 时间戳
  url: string;                    // 页面URL
  ua: string;                     // 用户代理
  sid: string;                    // 站点ID
  pid: string;                    // 页面ID
}

// SDK状态
export interface MonitorSDKStatus {
  initialized: boolean;           // 是否已初始化
  trackerEnabled: boolean;        // 埋点是否启用
  performanceEnabled: boolean;    // 性能监控是否启用
  errorEnabled: boolean;          // 错误监控是否启用
  blankScreenEnabled: boolean;    // 白屏检测是否启用
}

// 适配器类型 - 用于统一不同模块的事件格式
export interface EventAdapter {
  toMonitorEvent(type: MonitorEvent['type'], data: any): MonitorEvent;
}

// 事件处理器接口
export interface EventHandler {
  (event: MonitorEvent): void;
}

// 模块事件回调接口
export interface ModuleEventCallback<T> {
  (event: T): void;
}

// 统一的模块接口
export interface MonitorModule<T> {
  onEvent: ((event: T) => void) | null;
  destroy(): void;
}