import express, { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";

const app = express();
const PORT = 3000;
const IMAGES_DIR = path.join(__dirname, "..", "images");

// Track request count for demonstration
let requestCount = 0;

// Middleware to log requests
app.use((req: Request, _res: Response, next) => {
  requestCount++;
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Request #${requestCount}: ${req.method} ${req.url}`);
  next();
});

// Whitelist of allowed image extensions
const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".ico"
];

// Content-Type mapping for image files
const contentTypeMap: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon"
};

// Route to serve images
app.get("/images/:filename", (req: Request, res: Response): void => {
  const filename = req.params.filename;
  
  // Validate filename is not empty
  if (!filename || filename.trim() === "") {
    console.log(`  ❌ Invalid: Empty filename`);
    res.status(400).json({ error: "Filename is required" });
    return;
  }
  
  // Sanitize filename: remove any path traversal attempts
  const sanitizedFilename = path.basename(filename);
  
  // Check if sanitization changed the filename (indicates path traversal attempt)
  if (sanitizedFilename !== filename) {
    console.log(`  ❌ Security: Path traversal attempt blocked: ${filename}`);
    res.status(403).json({ error: "Forbidden: Invalid path" });
    return;
  }
  
  // Get file extension
  const ext = path.extname(sanitizedFilename).toLowerCase();
  
  // Validate file has an extension
  if (!ext) {
    console.log(`  ❌ Invalid: File has no extension: ${sanitizedFilename}`);
    res.status(400).json({ error: "File must have an extension" });
    return;
  }
  
  // Validate extension is in whitelist (only images allowed)
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    console.log(`  ❌ Invalid: Extension not allowed: ${ext}`);
    res.status(400).json({ error: `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}` });
    return;
  }
  
  // Validate filename has a name (not just extension)
  const basename = path.basename(sanitizedFilename, ext);
  if (!basename || basename.trim() === "") {
    console.log(`  ❌ Invalid: File has no name, only extension: ${sanitizedFilename}`);
    res.status(400).json({ error: "File must have a name" });
    return;
  }
  
  // Build safe file path
  const filePath = path.join(IMAGES_DIR, sanitizedFilename);
  
  // Double-check: prevent directory traversal
  const resolvedPath = path.resolve(filePath);
  const resolvedImagesDir = path.resolve(IMAGES_DIR);
  
  if (!resolvedPath.startsWith(resolvedImagesDir)) {
    console.log(`  ❌ Security: Directory traversal blocked: ${filename}`);
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`  ❌ Not found: ${sanitizedFilename}`);
    res.status(404).json({ error: "Image not found" });
    return;
  }
  
  // Check if it's a file (not a directory)
  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    console.log(`  ❌ Invalid: ${sanitizedFilename} is not a file`);
    res.status(400).json({ error: "Invalid file" });
    return;
  }
  
  // Get content type
  const contentType = contentTypeMap[ext] || "application/octet-stream";
  
  // Simulate slow origin server (artificial delay)
  const delay = 200; // 200ms delay to simulate network/processing time
  setTimeout(() => {
    // Read and send the file
    const fileBuffer = fs.readFileSync(filePath);
    
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", fileBuffer.length);
    res.setHeader("X-Origin-Server", "true");
    
    console.log(`  ✓ Served: ${sanitizedFilename} (${fileBuffer.length} bytes, ${contentType})`);
    res.send(fileBuffer);
  }, delay);
});

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    requestsServed: requestCount,
    imagesDirectory: IMAGES_DIR
  });
});

// Root endpoint
app.get("/", (_req: Request, res: Response) => {
  res.json({
    service: "Image Origin Server",
    version: "1.0.0",
    endpoints: {
      image: "/images/:filename",
      health: "/health"
    },
    requestsServed: requestCount
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`\n🚀 Origin Server started on http://localhost:${PORT}`);
  console.log(`📁 Serving images from: ${IMAGES_DIR}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET /              - Server info`);
  console.log(`  GET /images/:name  - Get specific image`);
  console.log(`  GET /health        - Health check`);
  console.log(`\n👀 Watching for requests...\n`);
});

