// 导出SDK主类
export { MonitorSDK } from './core';

// 导出所有类型
export type {
  MonitorSDKConfig,
  MonitorEvent,
  MonitorSDKStatus,
  TrackerConfig,
  TrackEvent,
  PerformanceConfig,
  PerformanceEvent,
  ErrorConfig,
  ErrorEvent,
  BlankScreenConfig,
  BlankScreenEvent,
  StorageConfig,
  StorageItem,
  ReporterConfig,
  ReportData
} from './types';

// 导出子模块（可选使用）
export { Tracker } from '@ssm/tracker';
export { PerformanceMonitor } from '@ssm/performance';
export { ErrorMonitor } from '@ssm/error';
export { BlankScreenMonitor } from '@ssm/blank-screen';
export { StorageManager } from '@ssm/storage';
export { Reporter } from '@ssm/reporter';