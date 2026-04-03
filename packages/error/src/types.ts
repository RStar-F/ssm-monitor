// 错误类型
export type ErrorType = 'js' | 'resource' | 'promise' | 'vue' | 'react';

// 错误级别
export type ErrorLevel = 'error' | 'warning' | 'info';

// 错误事件
export interface ErrorEvent {
  type: ErrorType;           // 错误类型
  level: ErrorLevel;         // 错误级别
  message: string;           // 错误信息
  stack?: string;            // 错误堆栈
  filename?: string;         // 文件名
  lineno?: number;           // 行号
  colno?: number;            // 列号
  url: string;               // 页面URL
  time: number;              // 发生时间
  userAgent: string;         // 用户代理
  extra?: Record<string, any>; // 额外信息
}

// 资源错误信息
export interface ResourceError {
  tagName: string;           // 标签名
  src?: string;              // 资源地址
  href?: string;             // 链接地址
  outerHTML?: string;        // 外部HTML
}

// 错误监控配置
export interface ErrorConfig {
  js?: boolean;              // 是否监控JS错误
  resource?: boolean;        // 是否监控资源错误
  promise?: boolean;         // 是否监控Promise错误
  vue?: boolean;             // 是否监控Vue错误
  react?: boolean;           // 是否监控React错误
  captureConsole?: boolean;  // 是否捕获console.error
}