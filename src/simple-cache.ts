import * as Bun from "bun";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface Expirable<T> {
  value: T;
  expires: number | null;
}

export interface CacheOptions {
  cacheKey: string;
  timeToLive: number | null;
}

/**
 * A very simple cache that stores a value and its expiration time in a file.
 */
export class SimpleCache<T> {
  private cacheFilePath: URL;
  private cacheFile: Bun.BunFile;
  private timeToLive: number | null;

  constructor(cacheKey: string, timeToLive: number | null = null) {
    // I'm storing this in an ignored folder near the implementation because that's easiest for me.
    // This could be stored anywhere… remotely, as an in-memory object, whatever.
    this.cacheFilePath = new URL(`.cache/${cacheKey}.json`, import.meta.url);
    this.cacheFile = Bun.file(this.cacheFilePath);

    this.timeToLive = timeToLive;
  }

  private async createCacheFile(): Promise<void> {
    // Ensure the cache directory exists
    const cacheDirectory = path.dirname(this.cacheFilePath.pathname);
    await fs.mkdir(cacheDirectory, { recursive: true });

    await fs.appendFile(this.cacheFilePath, "");
  }

  private async hasCacheFile(): Promise<boolean> {
    return fs.exists(this.cacheFilePath);
  }

  private readCacheFile(): Promise<Expirable<T>> {
    return this.cacheFile.json();
  }

  private writeCacheFile(cache: Expirable<T>): void {
    this.cacheFile.writer().write(JSON.stringify(cache));
  }

  async clear(): Promise<void> {
    return fs.rm(this.cacheFilePath, { force: true });
  }

  async get(): Promise<T | null> {
    if (!(await this.hasCacheFile())) {
      return null;
    }

    let cache: Expirable<T> | null = null;

    try {
      cache = await this.readCacheFile();
    } catch {
      console.warn("Failed to read cache file");
    }

    if (!cache) {
      return null;
    }

    if ("expires" in cache === false || "value" in cache === false) {
      console.warn("Invalid cache format");
      return null;
    }

    if (cache.expires !== null && cache.expires < Date.now()) {
      return null;
    }

    return cache.value;
  }

  async refresh(
    customDuration: number | null = this.timeToLive,
  ): Promise<void> {
    if (!(await this.hasCacheFile())) {
      return;
    }

    const cache = await this.readCacheFile();

    cache.expires =
      customDuration === null ? null : Date.now() + customDuration;

    this.writeCacheFile(cache);
  }

  async set(value: T): Promise<void> {
    if (!(await this.hasCacheFile())) {
      await this.createCacheFile();
    }

    const cache: Expirable<T> = {
      value,
      expires: this.timeToLive === null ? null : Date.now() + this.timeToLive,
    };

    const serializedCache = JSON.stringify(cache);

    this.cacheFile.writer().write(serializedCache);
  }
}

export function withCache<
  Fn extends (...args: any) => Promise<any>,
  Return = ReturnType<Fn>,
  Args extends Parameters<Fn> = Parameters<Fn>,
>(
  fn: Fn,
  options: Partial<CacheOptions> = {},
): (...args: Args) => Promise<Return> {
  const { cacheKey = fn.name, timeToLive = null } = options;
  const cache = new SimpleCache<Return>(cacheKey, timeToLive);

  return async (...args: Args): Promise<Return> => {
    const cachedValue = await cache.get();

    if (cachedValue !== null) {
      return cachedValue;
    }

    const result = await fn(...args);

    await cache.set(result);

    return result;
  };
}
