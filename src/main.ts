import { LRUCache } from "./LRUCache";
import { Cache } from "./Cache";

console.log("=== LRU Cache Demo ===\n");

// Create a cache with capacity of 3
const lruCache = new LRUCache(3);

console.log("1. Adding items to cache (capacity: 3)");
lruCache.set("a", "Value A");
lruCache.set("b", "Value B");
lruCache.set("c", "Value C");
console.log("   Added: a, b, c");

console.log("\n2. Getting items from cache");
console.log(`   get('a'): ${lruCache.get("a")}`);
console.log(`   get('b'): ${lruCache.get("b")}`);
console.log(`   get('d'): ${lruCache.get("d")} (not found)`);

console.log("\n3. Adding a 4th item - should evict 'c' (least recently used)");
lruCache.set("d", "Value D");
console.log("   Added: d");

console.log("\n4. Checking if 'c' was evicted");
console.log(`   get('c'): ${lruCache.get("c")} (evicted)`);
console.log(`   get('a'): ${lruCache.get("a")} (still present)`);
console.log(`   get('b'): ${lruCache.get("b")} (still present)`);
console.log(`   get('d'): ${lruCache.get("d")} (newly added)`);

console.log("\n5. Accessing 'a' to make it most recently used");
lruCache.get("a");
console.log("   Accessed: a");

console.log("\n6. Adding another item - should evict 'b' (now least recently used)");
lruCache.set("e", "Value E");
console.log("   Added: e");

console.log("\n7. Final cache state");
console.log(`   get('a'): ${lruCache.get("a")} (kept - recently used)`);
console.log(`   get('b'): ${lruCache.get("b")} (evicted)`);
console.log(`   get('d'): ${lruCache.get("d")} (kept)`);
console.log(`   get('e'): ${lruCache.get("e")} (kept)`);

console.log("\n8. Updating existing key doesn't change capacity");
lruCache.set("d", "Updated Value D");
console.log("   Updated: d");
console.log(`   get('d'): ${lruCache.get("d")}`);

async function runCacheDemo() {
  console.log("\n=== Cache with Auto-Fetch Demo ===\n");

  // Simulate a database or API with async operations
  const database: Record<string, string> = {
    "user:1": "Alice",
    "user:2": "Bob",
    "user:3": "Charlie",
    "user:4": "David",
    "user:5": "Eve"
  };

  let fetchCount = 0;

  // Create a cache with async auto-fetch capability
  const autoCache = new Cache(3, async (key: string) => {
    fetchCount++;
    console.log(`   [FETCH] Fetching data for key: ${key}`);
    
    // Simulate async operation (e.g., database query, API call)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return database[key] || `Not found: ${key}`;
  });

  console.log("1. First access - cache miss, will fetch");
  console.log(`   get('user:1'): ${await autoCache.get("user:1")}`);

  console.log("\n2. Second access - cache hit, no fetch");
  console.log(`   get('user:1'): ${await autoCache.get("user:1")}`);

  console.log("\n3. Adding more items");
  console.log(`   get('user:2'): ${await autoCache.get("user:2")}`);
  console.log(`   get('user:3'): ${await autoCache.get("user:3")}`);

  console.log("\n4. Cache is full (capacity: 3). Adding 4th item evicts 'user:1'");
  console.log(`   get('user:4'): ${await autoCache.get("user:4")}`);

  console.log("\n5. Accessing 'user:1' again - cache miss, will fetch again");
  console.log(`   get('user:1'): ${await autoCache.get("user:1")}`);

  console.log("\n6. Access existing item - cache hit");
  console.log(`   get('user:3'): ${await autoCache.get("user:3")}`);

  console.log(`\n7. Total fetches from database: ${fetchCount}`);
  console.log("   (Without cache, would have been 6 fetches)");
}

async function runTTLDemo() {
  console.log("\n=== Cache with TTL Demo ===\n");

  const database: Record<string, string> = {
    "product:1": "Laptop",
    "product:2": "Phone",
    "product:3": "Tablet"
  };

  let fetchCount = 0;

  // Controllable time for testing
  let currentTime = 0;
  const mockNow = () => currentTime;

  // Create a cache with 5-second TTL and custom time function
  const ttlCache = new Cache(
    10,
    async (key: string) => {
      fetchCount++;
      console.log(`   [FETCH] Fetching data for key: ${key}`);
      await new Promise(resolve => setTimeout(resolve, 50));
      return database[key] || `Not found: ${key}`;
    },
    5000, // 5-second TTL
    mockNow
  );

  console.log("1. First access at t=0s - cache miss, will fetch");
  currentTime = 0;
  console.log(`   get('product:1'): ${await ttlCache.get("product:1")}`);

  console.log("\n2. Access at t=2s - cache hit (within TTL)");
  currentTime = 2000;
  console.log(`   get('product:1'): ${await ttlCache.get("product:1")}`);

  console.log("\n3. Access at t=4s - cache hit (within TTL)");
  currentTime = 4000;
  console.log(`   get('product:1'): ${await ttlCache.get("product:1")}`);

  console.log("\n4. Access at t=6s - cache miss (expired after 5s), will re-fetch");
  currentTime = 6000;
  console.log(`   get('product:1'): ${await ttlCache.get("product:1")}`);

  console.log("\n5. Access at t=7s - cache hit (fresh entry from t=6s)");
  currentTime = 7000;
  console.log(`   get('product:1'): ${await ttlCache.get("product:1")}`);

  console.log("\n6. Multiple items with different timestamps");
  currentTime = 10000;
  console.log(`   get('product:2'): ${await ttlCache.get("product:2")} (fetched at t=10s)`);
  currentTime = 12000;
  console.log(`   get('product:3'): ${await ttlCache.get("product:3")} (fetched at t=12s)`);

  console.log("\n7. At t=14s - product:2 expired, product:3 still valid");
  currentTime = 14000;
  console.log(`   get('product:1'): ${await ttlCache.get("product:1")} (expired, re-fetched)`);
  currentTime = 15100;
  console.log(`   get('product:2'): ${await ttlCache.get("product:2")} (expired, re-fetched)`);
  currentTime = 16000;
  console.log(`   get('product:3'): ${await ttlCache.get("product:3")} (still valid, cached)`);

  console.log(`\n8. Total fetches: ${fetchCount}`);
  console.log("   (Entries: product:1 fetched 3 times, product:2 fetched 2 times, product:3 fetched 1 time)");
}

async function runThunderingHerdDemo() {
  console.log("\n=== Thundering Herd Prevention Demo ===\n");

  const database: Record<string, string> = {
    "article:1": "TypeScript Best Practices",
    "article:2": "Cache Design Patterns",
    "article:3": "Async Programming Guide"
  };

  let fetchCount = 0;

  // Create a cache with slow fetcher to simulate database/API delay
  const cache = new Cache(
    10,
    async (key: string) => {
      const fetchId = ++fetchCount;
      console.log(`   [FETCH #${fetchId}] Starting fetch for: ${key}`);
      
      // Simulate slow operation (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`   [FETCH #${fetchId}] Completed fetch for: ${key}`);
      return database[key] || `Not found: ${key}`;
    },
    60000 // 1 minute TTL
  );

  console.log("1. Single request - normal behavior");
  const result1 = await cache.get("article:1");
  console.log(`   Result: ${result1}`);
  console.log(`   Total fetches: ${fetchCount}`);

  console.log("\n2. Three concurrent requests for same key (cache miss)");
  console.log("   WITHOUT deduplication, this would trigger 3 fetches");
  console.log("   WITH deduplication, only 1 fetch should occur");
  
  const startTime = Date.now();
  const [result2a, result2b, result2c] = await Promise.all([
    cache.get("article:2"),
    cache.get("article:2"),
    cache.get("article:2")
  ]);
  const duration = Date.now() - startTime;
  
  console.log(`   Result A: ${result2a}`);
  console.log(`   Result B: ${result2b}`);
  console.log(`   Result C: ${result2c}`);
  console.log(`   Time taken: ~${duration}ms (single fetch duration, not 3x)`);
  console.log(`   Total fetches so far: ${fetchCount} (should be 2, not 4)`);

  console.log("\n3. Five concurrent requests for a new key");
  const results3 = await Promise.all([
    cache.get("article:3"),
    cache.get("article:3"),
    cache.get("article:3"),
    cache.get("article:3"),
    cache.get("article:3")
  ]);
  console.log(`   All 5 requests returned: ${results3[0]}`);
  console.log(`   Total fetches: ${fetchCount} (should be 3, not 8)`);

  console.log("\n4. Subsequent request uses cached value (no fetch)");
  const result4 = await cache.get("article:2");
  console.log(`   Result: ${result4}`);
  console.log(`   Total fetches: ${fetchCount} (still 3, cached value used)`);

  console.log("\n5. Mixed concurrent requests for different keys");
  await Promise.all([
    cache.get("article:1"), // cached
    cache.get("article:2"), // cached
    cache.get("article:3"), // cached
    cache.get("article:1"), // cached
    cache.get("article:2")  // cached
  ]);
  console.log(`   Total fetches: ${fetchCount} (still 3, all cached)`);

  console.log("\n✓ Thundering herd prevented!");
  console.log("  Without deduplication: would have been 13+ fetches");
  console.log(`  With deduplication: only ${fetchCount} fetches`);
}

// Run the async demos
async function runAllDemos() {
  await runCacheDemo();
  await runTTLDemo();
  await runThunderingHerdDemo();
  console.log("\n=== All Demos Complete ===");
}

runAllDemos().catch(console.error);
