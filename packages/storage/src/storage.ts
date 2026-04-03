import type { StorageConfig, StorageItem, IStorage } from './types';

// 默认配置
const DEFAULT_CONFIG: Required<StorageConfig> = {
  dbName: 'ssm_sdk',
  storeName: 'events',
  maxItems: 1000,
  useIndexedDB: true
};

// IndexedDB存储实现
class IndexedDBStorage<T = any> implements IStorage<T> {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;
  private maxItems: number;

  constructor(dbName: string, storeName: string, maxItems: number) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.maxItems = maxItems;
  }

  // 初始化数据库
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  // 添加数据
  async add(item: StorageItem<T>): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(item);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.checkAndClean();
        resolve();
      };
    });
  }

  // 获取数据
  async get(id: string): Promise<StorageItem<T> | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  // 获取所有数据
  async getAll(): Promise<StorageItem<T>[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  // 删除数据
  async remove(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // 清空数据
  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // 获取数量
  async count(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // 检查并清理超量数据
  private async checkAndClean(): Promise<void> {
    const count = await this.count();
    if (count <= this.maxItems) return;

    const items = await this.getAll();
    items.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = items.slice(0, count - this.maxItems);

    for (const item of toRemove) {
      await this.remove(item.id);
    }
  }
}

// LocalStorage存储实现
class LocalStorage<T = any> implements IStorage<T> {
  private key: string;
  private maxItems: number;

  constructor(key: string, maxItems: number) {
    this.key = key;
    this.maxItems = maxItems;
  }

  // 获取所有数据
  private getItems(): StorageItem<T>[] {
    try {
      const data = localStorage.getItem(this.key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // 保存所有数据
  private setItems(items: StorageItem<T>[]): void {
    localStorage.setItem(this.key, JSON.stringify(items));
  }

  // 添加数据
  async add(item: StorageItem<T>): Promise<void> {
    const items = this.getItems();
    items.push(item);

    // 清理超量数据
    if (items.length > this.maxItems) {
      items.sort((a, b) => a.timestamp - b.timestamp);
      items.splice(0, items.length - this.maxItems);
    }

    this.setItems(items);
  }

  // 获取数据
  async get(id: string): Promise<StorageItem<T> | null> {
    const items = this.getItems();
    return items.find(item => item.id === id) || null;
  }

  // 获取所有数据
  async getAll(): Promise<StorageItem<T>[]> {
    return this.getItems();
  }

  // 删除数据
  async remove(id: string): Promise<void> {
    const items = this.getItems();
    const index = items.findIndex(item => item.id === id);
    if (index > -1) {
      items.splice(index, 1);
      this.setItems(items);
    }
  }

  // 清空数据
  async clear(): Promise<void> {
    localStorage.removeItem(this.key);
  }

  // 获取数量
  async count(): Promise<number> {
    return this.getItems().length;
  }
}

// 存储管理器
export class StorageManager<T = any> implements IStorage<T> {
  private storage: IStorage<T>;
  private config: Required<StorageConfig>;

  constructor(config: StorageConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 优先使用IndexedDB，不支持时降级到localStorage
    if (this.config.useIndexedDB && this.supportIndexedDB()) {
      this.storage = new IndexedDBStorage<T>(
        this.config.dbName,
        this.config.storeName,
        this.config.maxItems
      );
    } else {
      this.storage = new LocalStorage<T>(
        `${this.config.dbName}_${this.config.storeName}`,
        this.config.maxItems
      );
    }
  }

  // 检查是否支持IndexedDB
  private supportIndexedDB(): boolean {
    return 'indexedDB' in window;
  }

  // 添加数据
  async add(item: StorageItem<T>): Promise<void> {
    return this.storage.add(item);
  }

  // 获取数据
  async get(id: string): Promise<StorageItem<T> | null> {
    return this.storage.get(id);
  }

  // 获取所有数据
  async getAll(): Promise<StorageItem<T>[]> {
    return this.storage.getAll();
  }

  // 删除数据
  async remove(id: string): Promise<void> {
    return this.storage.remove(id);
  }

  // 清空数据
  async clear(): Promise<void> {
    return this.storage.clear();
  }

  // 获取数量
  async count(): Promise<number> {
    return this.storage.count();
  }

  // 批量添加
  async addBatch(items: StorageItem<T>[]): Promise<void> {
    for (const item of items) {
      await this.storage.add(item);
    }
  }

  // 批量删除
  async removeBatch(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.storage.remove(id);
    }
  }
}