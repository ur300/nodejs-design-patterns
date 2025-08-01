const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

class FileUploadServer {
  constructor(port = 3002) {
    this.port = port;
    this.uploadDir = path.join(__dirname, 'uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Handle file upload requests
   */
  handleUpload(req, res) {
    const filename = req.headers['x-filename'];
    const fileSize = parseInt(req.headers['x-file-size']);
    const compressionType = req.headers['x-compression-type'];
    
    if (!filename) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing filename header' }));
      return;
    }
    
    console.log(`Receiving file: ${filename} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
    if (compressionType) {
      console.log(`Compression type: ${compressionType}`);
    }
    
    // Add compression extension to filename if compression is applied
    let finalFilename = filename;
    if (compressionType) {
      const nameWithoutExt = path.parse(filename).name;
      const ext = path.parse(filename).ext;
      
      switch (compressionType.toLowerCase()) {
        case 'gzip':
          finalFilename = `${nameWithoutExt}${ext}.gz`;
          break;
        case 'deflate':
          finalFilename = `${nameWithoutExt}${ext}.deflate`;
          break;
        case 'brotli':
          finalFilename = `${nameWithoutExt}${ext}.br`;
          break;
        default:
          // Keep original filename for unknown compression types
          break;
      }
    }
    
    const filePath = path.join(this.uploadDir, finalFilename);
    let writeStream = fs.createWriteStream(filePath);
    let compressStream = null;
    
    // Apply compression if compression type is specified
    if (compressionType) {
      switch (compressionType.toLowerCase()) {
        case 'gzip':
          compressStream = zlib.createGzip();
          break;
        case 'deflate':
          compressStream = zlib.createDeflate();
          break;
        case 'brotli':
          compressStream = zlib.createBrotliCompress();
          break;
        default:
          console.warn(`Unknown compression type: ${compressionType}, saving uncompressed`);
          break;
      }
      
      if (compressStream) {
        compressStream.pipe(writeStream);
      }
    }
    
    let bytesReceived = 0;
    let chunkCount = 0;
    
    req.on('data', (chunk) => {
      chunkCount++;
      bytesReceived += chunk.length;
      
      // Log progress every 10 chunks
      if (chunkCount % 10 === 0) {
        const progress = ((bytesReceived / fileSize) * 100).toFixed(2);
        console.log(`Progress: ${progress}% (${chunkCount} chunks received)`);
      }
      
      // Write to compression stream if available, otherwise directly to file
      if (compressStream) {
        compressStream.write(chunk);
      } else {
        writeStream.write(chunk);
      }
    });
    
    req.on('end', () => {
      if (compressStream) {
        compressStream.end();
      } else {
        writeStream.end();
      }
      console.log(`File upload completed: ${finalFilename}`);
      console.log(`Total chunks received: ${chunkCount}`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'File uploaded successfully',
        originalFilename: filename,
        savedFilename: finalFilename,
        size: bytesReceived,
        chunks: chunkCount,
        compression: compressionType || 'none'
      }));
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error.message);
      if (compressStream) {
        compressStream.destroy();
      }
      writeStream.destroy();
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Upload failed' }));
    });
    
    writeStream.on('error', (error) => {
      console.error('Write stream error:', error.message);
      if (compressStream) {
        compressStream.destroy();
      }
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File write failed' }));
    });
    
    if (compressStream) {
      compressStream.on('error', (error) => {
        console.error('Compression error:', error.message);
        writeStream.destroy();
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Compression failed' }));
      });
    }
  }

  /**
   * Start the server
   */
  start() {
    const server = http.createServer((req, res) => {
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Filename, X-File-Size, X-Compression-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      if (req.method === 'POST' && req.url === '/upload') {
        this.handleUpload(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });
    
    server.listen(this.port, () => {
      console.log(`File upload server running on port ${this.port}`);
      console.log(`Upload directory: ${this.uploadDir}`);
    });
    
    server.on('error', (error) => {
      console.error('Server error:', error.message);
    });
  }
}

// Start the server
const server = new FileUploadServer();
server.start(); 