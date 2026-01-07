# Cache Talk - Distributed Image Caching System

A distributed caching system demonstrating LRU cache, TTL expiration, HRW (Highest Random Weight) routing, and thundering herd prevention.

## Architecture

```
Client
  ↓
Routing Proxy (port 5000) [HRW/Rendezvous Hashing]
  ↓ ↓ ↓
  ├─→ Cache Proxy 1 (port 4000)
  ├─→ Cache Proxy 2 (port 4001)
  └─→ Cache Proxy 3 (port 4002)
       ↓ ↓ ↓
    Origin Server (port 3000)
```

## Features

- **LRU Cache**: Least Recently Used eviction policy with configurable capacity
- **TTL Expiration**: Time-based cache expiration (default: 60 seconds)
- **HRW Routing**: Consistent hashing using MurmurHash3
- **Thundering Herd Prevention**: Request deduplication for concurrent cache misses
- **Multiple Cache Nodes**: Distributed caching across multiple proxy servers
- **ETag Support**: Efficient cache validation using MurmurHash3-based ETags with 304 Not Modified responses

## Prerequisites

- Node.js (v18 or higher)
- npm

## Installation

1. **Clone and navigate to the project:**
   ```bash
   cd cache-talk
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the TypeScript code:**
   ```bash
   npm run build
   ```

## Running the System

### Step 1: Start the Origin Server

The origin server serves the actual image files.

```bash
npm run start:origin
```

The origin server will start on **http://localhost:3000**

- Serves images from the `images/` directory
- Simulates 200ms network delay per request

### Step 2: Start Cache Proxy Servers

Open **three new terminal windows** and start the cache proxies:

**Terminal 2 - Cache Proxy 1:**
```bash
npm run start:proxy1
```
Starts on **http://localhost:4000**

**Terminal 3 - Cache Proxy 2:**
```bash
npm run start:proxy2
```
Starts on **http://localhost:4001**

**Terminal 4 - Cache Proxy 3:**
```bash
npm run start:proxy3
```
Starts on **http://localhost:4002**

Each cache proxy:
- Caches up to 50 images
- TTL: 60 seconds
- Fetches from origin on cache miss

### Step 3: Start the Routing Proxy

Open a **fifth terminal window** and start the routing proxy:

```bash
npm run start:router
```

The routing proxy will start on **http://localhost:5000**

- Routes requests using HRW (Highest Random Weight) algorithm
- Distributes load across the 3 cache nodes
- Same image always routes to the same cache node

## Testing the System

### 1. Get an Image (First Request - Cache Miss)

```bash
curl http://localhost:5000/images/lion.jpeg -o test.jpg
```

Check which cache node it was routed to:
```bash
curl -I http://localhost:5000/images/lion.jpeg | grep X-Routed-To
```

### 2. Get the Same Image Again (Cache Hit)

```bash
curl http://localhost:5000/images/lion.jpeg -o test.jpg
```

This request will be much faster as it's served from the cache proxy.

### 3. Test Routing Distribution

```bash
for img in lion.jpeg lion2.jpeg lion3.jpeg lion4.jpeg lion5.jpeg; do
  echo "=== $img ==="
  curl -I http://localhost:5000/images/$img 2>/dev/null | grep X-Routed-To
done
```

You'll see that different images route to different cache nodes, and the same image always routes to the same node.

### 4. Test ETag Support

Get an image and note the ETag:
```bash
curl -I http://localhost:4000/images/lion.jpeg | grep ETag
```

Request with If-None-Match header (should get 304 Not Modified):
```bash
ETAG=$(curl -I http://localhost:4000/images/lion.jpeg 2>/dev/null | grep -i "^ETag:" | cut -d' ' -f2 | tr -d '\r')
curl -I -H "If-None-Match: ${ETAG}" http://localhost:4000/images/lion.jpeg
```

Or use the test scripts:
```bash
# Bash script
./test-etag.sh

# Node.js script (more detailed output)
npm run test:etag
```

### 5. Health Checks

Check the routing proxy:
```bash
curl http://localhost:5000/health
```

Check a cache proxy:
```bash
curl http://localhost:4000/health
```

Check the origin server:
```bash
curl http://localhost:3000/health
```

## Configuration

### Configure Cache Nodes

**Option 1: Edit `nodes.json` (default):**
```json
{
  "cacheNodes": [
    "http://localhost:4000",
    "http://localhost:4001",
    "http://localhost:4002"
  ]
}
```

**Option 2: Use command line arguments:**
```bash
node dist/routingProxy.js --port=5000 --nodes=http://localhost:4000,http://localhost:4001
```

**Option 3: Use custom config file:**
```bash
node dist/routingProxy.js --config=/path/to/custom-nodes.json
```

### Change Cache Settings

Edit `src/proxyServer.ts`:
```typescript
const imageCache = new Cache(
  50,     // capacity (number of items)
  fetcher,
  60000   // TTL in milliseconds (60 seconds)
);
```

## Project Structure

```
cache-talk/
├── src/
│   ├── Cache.ts           # Cache wrapper with auto-fetch & TTL
│   ├── LRUCache.ts        # LRU cache implementation with doubly linked list
│   ├── hrwRouting.ts      # HRW routing algorithm (MurmurHash3)
│   ├── routingProxy.ts    # Entry point - routes to cache nodes
│   ├── proxyServer.ts     # Cache proxy server
│   ├── originServer.ts    # Origin server for images
│   └── main.ts            # Demo/examples
├── images/                # Image files served by origin
├── nodes.json            # Cache node configuration
└── package.json
```

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run start:origin` | Start origin server (port 3000) |
| `npm run start:proxy1` | Start cache proxy on port 4000 |
| `npm run start:proxy2` | Start cache proxy on port 4001 |
| `npm run start:proxy3` | Start cache proxy on port 4002 |
| `npm run start:router` | Start routing proxy (port 5000) |
| `npm run dev` | Run the demo/examples |
| `npm run test:etag` | Test ETag functionality |

## Common Issues

### "Origin server unavailable"
Make sure the origin server is running on port 3000:
```bash
npm run start:origin
```

### "Cache node unavailable"
Ensure at least one cache proxy is running. Check the `nodes.json` file matches your running proxies.

### Port already in use
Kill the process using the port:
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill

# Or change the port:
node dist/originServer.js --port=3001
```

## How It Works

### 1. Request Flow

1. Client requests `/images/lion.jpeg` from routing proxy (port 5000)
2. Routing proxy computes HRW hash for `lion.jpeg` across all cache nodes
3. Request is routed to the cache node with highest hash score
4. Cache proxy checks its local cache:
   - **Cache Hit**: Returns cached data immediately
   - **Cache Miss**: Fetches from origin server, caches it, then returns
5. Response sent back to client

### 2. HRW (Highest Random Weight) Routing

For each image:
```
score(image, node) = murmur3(image + ":" + node)
selected_node = node with max(score)
```

**Benefits:**
- Same image always routes to same cache node (consistency)
- Load distributed across cache nodes
- Adding/removing nodes only affects affected keys

### 3. Cache Behavior

- **LRU Eviction**: When cache is full, least recently used item is removed
- **TTL Expiration**: Items expire after 60 seconds
- **Thundering Herd Prevention**: Concurrent requests for same key share one fetch
- **ETag Validation**: Each cached item has a MurmurHash3-based ETag for efficient validation
  - Format: `"hash"` (e.g., `"1234567890"`)
  - Clients can use `If-None-Match` header to receive 304 Not Modified responses
  - Saves bandwidth by avoiding re-transmission of unchanged content

## Example Session

```bash
# Terminal 1 - Origin Server
$ npm run start:origin
🚀 Origin Server started on http://localhost:3000

# Terminal 2 - Cache Proxy 1
$ npm run start:proxy1
🚀 Cache Proxy Server started on http://localhost:4000

# Terminal 3 - Cache Proxy 2
$ npm run start:proxy2
🚀 Cache Proxy Server started on http://localhost:4001

# Terminal 4 - Routing Proxy
$ npm run start:router
🚀 HRW Routing Proxy started on http://localhost:5000
📡 Cache Nodes (2):
   1. http://localhost:4000
   2. http://localhost:4001

# Terminal 5 - Client
$ curl http://localhost:5000/images/lion.jpeg -o lion.jpeg
  % Total    % Received
100  5234  100  5234    0     0  23456      0 --:--:-- --:--:-- --:--:--  23678

$ curl -I http://localhost:5000/images/lion.jpeg | grep X-Routed-To
X-Routed-To: http://localhost:4001
```

## License

ISC

