# File Streaming Handler

A Node.js implementation for streaming files to a server in chunks. This project demonstrates efficient file transfer using streaming and chunked data transfer.

## Features

- **Chunked File Streaming**: Files are read and sent in configurable chunk sizes (default: 64KB)
- **Progress Tracking**: Real-time progress reporting during file transfer
- **Error Handling**: Comprehensive error handling for file operations and network issues
- **Command Line Interface**: Simple CLI for specifying files to stream
- **Server-Side Reception**: Complete server implementation to receive streamed files

## Project Structure

```
6.1-data-compression/
├── client/
│   └── index.js          # File streaming client
├── server/
│   └── index.js          # File upload server
├── package.json
└── README.md
```

## Usage

### 1. Start the Server

First, start the file upload server:

```bash
npm run start-server
# or
node server/index.js
```

The server will start on port 3000 and create an `uploads` directory to store received files.

### 2. Stream a File

Use the client to stream a file to the server:

```bash
npm run start-client <filename> [compression-algorithm]
# or
node client/index.js <filename> [compression-algorithm]
```

**Parameters:**
- `filename` (required): Path to the file you want to stream
- `compression-algorithm` (optional): Compression algorithm to use (e.g., 'gzip', 'deflate', 'brotli')

**Examples:**

```bash
# Stream a text file without compression
node client/index.js example.txt

# Stream a text file with gzip compression
node client/index.js example.txt gzip

# Stream an image with deflate compression
node client/index.js image.jpg deflate

# Stream a large file with brotli compression
node client/index.js large-file.zip brotli
```

## Configuration

### Client Configuration

You can modify the client behavior by changing the `FileStreamHandler` constructor parameters:

```javascript
const handler = new FileStreamHandler(
  'localhost',  // server host
  3000,         // server port
  64 * 1024     // chunk size in bytes
);
```

### Server Configuration

Modify the server port and upload directory:

```javascript
const server = new FileUploadServer(3000); // port number
```

## How It Works

### Client Side

1. **Argument Parsing**: Reads filename and optional compression algorithm from command line arguments
2. **File Validation**: Checks if the file exists
3. **Stream Creation**: Creates a readable stream from the file
4. **Compression Setup**: Configures compression headers if algorithm is specified
5. **Chunked Transfer**: Sends file data in configurable chunks
6. **Progress Tracking**: Reports transfer progress
7. **Error Handling**: Handles file read and network errors

### Server Side

1. **Request Handling**: Accepts POST requests to `/upload`
2. **Header Processing**: Extracts filename, file size, and compression type from headers
3. **Compression Handling**: Processes compression headers if specified
4. **Stream Reception**: Receives data chunks and writes to file
5. **Progress Tracking**: Reports reception progress
6. **Response**: Sends confirmation with transfer statistics

## Error Handling

The implementation includes comprehensive error handling for:

- Missing command line arguments
- Non-existent files
- File read errors
- Network connection issues
- Server errors
- Write stream errors

## Performance Features

- **Memory Efficient**: Uses streaming to handle large files without loading them entirely into memory
- **Configurable Chunk Size**: Adjustable chunk size for optimal performance
- **Progress Reporting**: Real-time progress updates during transfer
- **Non-blocking**: Asynchronous operations prevent blocking

## Example Output

### Client Output
```
Processing file: example.txt
Starting to stream file: example.txt
File size: 0.05 MB
Compression algorithm: gzip
Progress: 15.63% (10 chunks sent)
Progress: 31.25% (20 chunks sent)
...
File read complete. Total chunks: 32
File streaming completed. Server response: 200
Server response: {"message":"File uploaded successfully","filename":"example.txt","size":51200,"chunks":32}
File streaming completed successfully
```

### Server Output
```
File upload server running on port 3000
Upload directory: /path/to/uploads
Receiving file: example.txt (0.05 MB)
Progress: 15.63% (10 chunks received)
Progress: 31.25% (20 chunks received)
...
File upload completed: example.txt
Total chunks received: 32
```

## Requirements

- Node.js >= 14.0.0
- No external dependencies (uses only Node.js built-in modules)

## License

MIT 