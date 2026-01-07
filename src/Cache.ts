import { LRUCache } from "./LRUCache";

/**
 * Type definition for async fetcher function
 * Takes a key and returns a Promise that resolves to the value to cache
 */
export type FetcherFunction = (key: string) => Promise<any>;

/**
 * Type definition for cache entry with timestamp
 */
type CacheEntry = {
  value: any;
  timestamp: number;
};

/**
 * Cache wrapper that automatically fetches values on cache misses
 * Uses LRUCache internally for storage with automatic eviction
 * Supports async fetching operations and TTL-based expiration
 * Prevents thundering herd by deduplicating concurrent requests
 */
export class Cache {
  private lruCache: LRUCache;
  private fetcher: FetcherFunction;
  private maxDuration: number;
  private nowFn: () => number;
  private inFlightRequests: Map<string, Promise<any>>;

  /**
   * Creates a new Cache with automatic async fetching on miss and TTL support
   * @param capacity Maximum number of items the cache can hold
   * @param fetcher Async function to call when a key is not in the cache
   * @param maxDuration Maximum time in milliseconds that a cache entry is valid (default: 60000 = 1 minute)
   * @param nowFn Function that returns current time in milliseconds (default: Date.now)
   */
  constructor(
    capacity: number,
    fetcher: FetcherFunction,
    maxDuration: number = 60000,
    nowFn: () => number = Date.now
  ) {
    this.lruCache = new LRUCache(capacity);
    this.fetcher = fetcher;
    this.maxDuration = maxDuration;
    this.nowFn = nowFn;
    this.inFlightRequests = new Map<string, Promise<any>>();
  }

  /**
   * Gets a value from the cache asynchronously
   * If the key is not in the cache or has expired, calls the fetcher function,
   * stores the result, and returns it.
   * Prevents thundering herd by deduplicating concurrent requests for the same key.
   * @param key The key to look up
   * @returns A Promise that resolves to the value associated with the key
   */
  async get(key: string): Promise<any> {
    // Try to get from cache
    const entry = this.lruCache.get(key) as CacheEntry | undefined;
    
    if (entry !== undefined) {
      // Check if entry has expired
      const age = this.nowFn() - entry.timestamp;
      if (age < this.maxDuration) {
        // Entry is still valid
        return entry.value;
      }
      // Entry has expired - treat as cache miss
    }
    
    // Check if there's already an in-flight request for this key
    const existingRequest = this.inFlightRequests.get(key);
    if (existingRequest) {
      // Return the existing promise to avoid duplicate fetches
      return existingRequest;
    }
    
    // Start a new fetch operation
    const fetchPromise = (async () => {
      try {
        // Fetch the value asynchronously
        const value = await this.fetcher(key);
        
        // Store in cache with current timestamp
        this.lruCache.set(key, { value, timestamp: this.nowFn() });
        
        return value;
      } finally {
        // Clean up in-flight request regardless of success or failure
        this.inFlightRequests.delete(key);
      }
    })();
    
    // Store the promise so concurrent requests can reuse it
    this.inFlightRequests.set(key, fetchPromise);
    
    return fetchPromise;
  }
}

