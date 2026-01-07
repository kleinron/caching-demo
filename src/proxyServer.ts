import express, { Request, Response } from "express";
import axios from "axios";
import mime from "mime-types";
import { Cache } from "./Cache";

// Parse command line arguments
const args = process.argv.slice(2);
const portArg = args.find(arg => arg.startsWith("--port="));
const PORT = portArg ? parseInt(portArg.split("=")[1]) : 4000;

const ORIGIN_URL = "http://localhost:3000";
const app = express();

// Create cache with 1-minute TTL and 50 item capacity
const imageCache = new Cache(
  50, // capacity
  async (key: string) => {
    // Fetcher function - calls origin server
    console.log(`  [CACHE MISS] Fetching from origin: ${key}`);
    
    try {
      const response = await axios.get(`${ORIGIN_URL}${key}`, {
        responseType: "arraybuffer",
        timeout: 10000
      });
      
      // Infer content type from the filename/path
      const contentType = mime.lookup(key) || "application/octet-stream";
      
      // Convert to Buffer once and store in cache
      const buffer = Buffer.from(response.data);
      
      return {
        data: buffer,
        contentType: contentType,
        contentLength: buffer.length
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Origin server error: ${error.response.status}`);
        } else if (error.code === "ECONNREFUSED") {
          throw new Error("Origin server is not running");
        }
      }
      throw error;
    }
  },
  60000 // 1 minute TTL
);

// Middleware to log requests
app.use((req: Request, _res: Response, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    port: PORT,
    originServer: ORIGIN_URL
  });
});

// Proxy endpoint for images
app.get("/images/:filename", async (req: Request, res: Response) => {
  const filename = req.params.filename;
  const cacheKey = `/images/${filename}`;
  
  try {
    // Try to get from cache (will fetch from origin if cache miss)
    const cachedEntry = await imageCache.get(cacheKey);
    
    console.log(`  ✓ Served: ${filename}`);
    
    // Set response headers
    res.setHeader("Content-Type", cachedEntry.contentType);
    res.setHeader("Content-Length", cachedEntry.contentLength);
    res.setHeader("X-Proxy-Server", `proxy-${PORT}`);
    
    // Send the cached data (already a Buffer)
    res.send(cachedEntry.data);
    
  } catch (error) {
    console.error(`  ❌ Error fetching image:`, error);
    
    if (error instanceof Error) {
      if (error.message.includes("404")) {
        res.status(404).json({ error: "Image not found" });
      } else if (error.message.includes("Origin server is not running")) {
        res.status(503).json({ error: "Origin server unavailable" });
      } else {
        res.status(500).json({ error: "Failed to fetch image", message: error.message });
      }
    } else {
      res.status(500).json({ error: "Unknown error occurred" });
    }
  }
});

// Root endpoint
app.get("/", (_req: Request, res: Response) => {
  res.json({
    service: "Image Cache Proxy Server",
    version: "1.0.0",
    port: PORT,
    origin: ORIGIN_URL,
    endpoints: {
      image: "/images/:filename",
      health: "/health"
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`\n🚀 Cache Proxy Server started on http://localhost:${PORT}`);
  console.log(`📡 Proxying to origin: ${ORIGIN_URL}`);
  console.log(`💾 Cache: 50 items capacity, 60s TTL`);
  console.log(`\nEndpoints:`);
  console.log(`  GET /              - Server info`);
  console.log(`  GET /images/:name  - Get image (cached)`);
  console.log(`  GET /health        - Health check`);
  console.log(`\n👀 Watching for requests...\n`);
});

