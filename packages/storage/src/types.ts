// 存储配置
export interface StorageConfig {
  dbName?: string;           // IndexedDB数据库名
  storeName?: string;        // IndexedDB存储名
  maxItems?: number;         // 最大存储条数
  useIndexedDB?: boolean;    // 是否使用IndexedDB
}

// 存储项
export interface StorageItem<T = any> {
  id: string;                // 唯一ID
  data: T;                   // 数据
  timestamp: number;         // 时间戳
  type?: string;             // 类型标识
}

// 存储接口
export interface IStorage<T = any> {
  add(item: StorageItem<T>): Promise<void>;
  get(id: string): Promise<StorageItem<T> | null>;
  getAll(): Promise<StorageItem<T>[]>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
  count(): Promise<number>;
}