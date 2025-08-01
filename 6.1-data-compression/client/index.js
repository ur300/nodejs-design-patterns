const fs = require('fs');
const http = require('http');
const path = require('path');

class FileStreamHandler {
  constructor(serverHost = 'localhost', serverPort = 3002) {
    this.serverHost = serverHost;
    this.serverPort = serverPort;
    this.chunkSize = 64 * 1024; // 64KB chunks
  }

  /**
   * Get filename from command line arguments
   * @returns {string} The filename to stream
   */
  getFileNameFromArgs() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      throw new Error('Please provide a filename as a command line argument');
    }
    
    const filename = args[0];
    const compressAlgorithm = args[1];
    
    // Check if file exists
    if (!fs.existsSync(filename)) {
      throw new Error(`File '${filename}' does not exist`);
    }
    
    return { filename, compressAlgorithm };
  }

  /**
   * Stream file to server in chunks
   * @param {string} filename - Path to the file to stream
   */
  async streamFileToServer(filename, compressAlgorithm) {
    return new Promise((resolve, reject) => {
      const filePath = path.resolve(filename);
      const fileStats = fs.statSync(filePath);
      
      console.log(`Starting to stream file: ${filename}`);
      console.log(`File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);
      if (compressAlgorithm) {
        console.log(`Compression algorithm: ${compressAlgorithm}`);
      }
      
      // Create readable stream from file
      const fileStream = fs.createReadStream(filePath, {
        highWaterMark: this.chunkSize
      });
      
      // Prepare HTTP request options
      const requestOptions = {
        hostname: this.serverHost,
        port: this.serverPort,
        path: '/upload',
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Filename': path.basename(filename),
          'X-File-Size': fileStats.size
        }
      };
      
      // Only add compression header if algorithm is specified
      if (compressAlgorithm) {
        requestOptions.headers['X-Compression-Type'] = compressAlgorithm;
      }
      
      // Create HTTP request
      const request = http.request(requestOptions, (response) => {
        let responseData = '';
        
        response.on('data', (chunk) => {
          responseData += chunk;
        });
        
        response.on('end', () => {
          console.log(`File streaming completed. Server response: ${response.statusCode}`);
          console.log(`Server response: ${responseData}`);
          resolve(responseData);
        });
      });
      
      request.on('error', (error) => {
        console.error('Request error:', error.message);
        reject(error);
      });
      
      // Handle file stream events
      let bytesSent = 0;
      let chunkCount = 0;
      
      fileStream.on('data', (chunk) => {
        chunkCount++;
        bytesSent += chunk.length;
        
        // Log progress every 10 chunks
        if (chunkCount % 10 === 0) {
          const progress = ((bytesSent / fileStats.size) * 100).toFixed(2);
          console.log(`Progress: ${progress}% (${chunkCount} chunks sent)`);
        }
        
        // Send chunk to server
        request.write(chunk);
      });
      
      fileStream.on('end', () => {
        console.log(`File read complete. Total chunks: ${chunkCount}`);
        request.end();
      });
      
      fileStream.on('error', (error) => {
        console.error('File read error:', error.message);
        request.destroy();
        reject(error);
      });
    });
  }

  /**
   * Main handler function
   */
  async handle() {
    try {
      const { filename, compressAlgorithm } = this.getFileNameFromArgs();
      console.log(`Processing file: ${filename}`);
      
      await this.streamFileToServer(filename, compressAlgorithm);
      console.log('File streaming completed successfully');
      
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
}

// Create and run the handler
const handler = new FileStreamHandler();
handler.handle();
