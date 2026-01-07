import express, { Request, Response } from "express";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { routeToNode } from "./hrwRouting";

// Parse command line arguments
const args = process.argv.slice(2);
const portArg = args.find(arg => arg.startsWith("--port="));
const PORT = portArg ? parseInt(portArg.split("=")[1]) : 5000;

const nodesArg = args.find(arg => arg.startsWith("--nodes="));
const configArg = args.find(arg => arg.startsWith("--config="));

// Load cache nodes configuration
let cacheNodes: string[] = [];

if (nodesArg) {
  // Parse from command line: --nodes=http://localhost:4000,http://localhost:4001
  cacheNodes = nodesArg.split("=")[1].split(",").map(n => n.trim());
  console.log("📝 Loaded nodes from command line arguments");
} else {
  // Load from config file
  const configPath = configArg 
    ? configArg.split("=")[1] 
    : path.join(__dirname, "..", "nodes.json");
  
  try {
    const configData = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configData);
    cacheNodes = config.cacheNodes || [];
    console.log(`📝 Loaded nodes from config file: ${configPath}`);
  } catch (error) {
    console.error("❌ Failed to load config file:", error);
    console.log("💡 Usage:");
    console.log("  --nodes=http://localhost:4000,http://localhost:4001");
    console.log("  --config=/path/to/nodes.json");
    process.exit(1);
  }
}

if (cacheNodes.length === 0) {
  console.error("❌ No cache nodes configured!");
  process.exit(1);
}

const app = express();

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
    cacheNodes: cacheNodes,
    routingPolicy: "HRW (Highest Random Weight)"
  });
});

// Route images using HRW
app.get("/images/:filename", async (req: Request, res: Response) => {
  const filename = req.params.filename;
  const cacheKey = `/images/${filename}`;
  
  try {
    // Select target node using HRW routing
    const targetNode = routeToNode(cacheKey, cacheNodes);
    
    console.log(`  → Routing ${filename} to ${targetNode}`);
    
    // Forward request to selected cache node
    const response = await axios.get(`${targetNode}${cacheKey}`, {
      responseType: "arraybuffer",
      timeout: 10000,
      validateStatus: (status) => status < 500 // Don't throw on 404
    });
    
    // Forward response headers
    if (response.headers["content-type"]) {
      res.setHeader("Content-Type", response.headers["content-type"]);
    }
    if (response.headers["content-length"]) {
      res.setHeader("Content-Length", response.headers["content-length"]);
    }
    
    // Add routing information header
    res.setHeader("X-Routed-To", targetNode);
    res.setHeader("X-Routing-Policy", "HRW");
    
    // Forward status and data
    res.status(response.status).send(Buffer.from(response.data));
    
  } catch (error) {
    console.error(`  ❌ Error routing to cache node:`, error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED") {
        res.status(503).json({ error: "Cache node unavailable" });
      } else if (error.response) {
        res.status(error.response.status).json({ 
          error: "Cache node error",
          status: error.response.status 
        });
      } else {
        res.status(500).json({ error: "Failed to route request" });
      }
    } else {
      res.status(500).json({ error: "Unknown error occurred" });
    }
  }
});

// Root endpoint
app.get("/", (_req: Request, res: Response) => {
  res.json({
    service: "HRW Routing Proxy",
    version: "1.0.0",
    port: PORT,
    routingPolicy: "HRW (Highest Random Weight / Rendezvous Hashing)",
    cacheNodes: cacheNodes,
    endpoints: {
      image: "/images/:filename",
      health: "/health"
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`\n🚀 HRW Routing Proxy started on http://localhost:${PORT}`);
  console.log(`🎯 Routing Policy: HRW (Highest Random Weight)`);
  console.log(`📡 Cache Nodes (${cacheNodes.length}):`);
  cacheNodes.forEach((node, i) => {
    console.log(`   ${i + 1}. ${node}`);
  });
  console.log(`\nEndpoints:`);
  console.log(`  GET /              - Server info`);
  console.log(`  GET /images/:name  - Get image (routed via HRW)`);
  console.log(`  GET /health        - Health check`);
  console.log(`\n👀 Watching for requests...\n`);
});

