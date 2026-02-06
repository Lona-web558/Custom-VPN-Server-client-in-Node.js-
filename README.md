# Custom-VPN-Server-client-in-Node.js-
Custom VPN Server client in Node.js 

# Custom VPN Server - Traditional JavaScript

A custom VPN server implementation using traditional JavaScript syntax with basic Node.js modules.

## Features

- **Traditional JavaScript**: Uses `var` instead of `const/let`, no arrow functions
- **Basic Modules Only**: Uses only built-in Node.js modules (net, crypto, dgram, events, util)
- **No Express**: Pure TCP server implementation
- **Encryption**: AES-256-CBC encryption for data transmission
- **Multiple Clients**: Supports multiple simultaneous client connections
- **Data Relay**: Broadcasts encrypted messages between connected clients
- **Statistics Tracking**: Monitors bandwidth and connection stats

## Files

1. **vpn-server.js** - The VPN server implementation
2. **vpn-client.js** - A sample VPN client to connect and test the server

## Requirements

- Node.js (v8.0 or higher)
- No external dependencies (uses only built-in modules)

## Installation

No installation required. Simply download the files.

## Usage

### Starting the VPN Server

```bash
node vpn-server.js
```

The server will start on `0.0.0.0:8888` by default and display:

```
===========================================
       Custom VPN Server Started
===========================================
Listening on: 0.0.0.0:8888
Encryption: aes-256-cbc
===========================================
```

### Connecting with a Client

Open a new terminal and run:

```bash
node vpn-client.js
```

You can open multiple terminal windows to connect multiple clients.

### Client Commands

Once connected, the client supports these commands:

- **`<message>`** - Type any message to send it encrypted through the VPN tunnel
- **`ping`** - Send a ping to the server to test connectivity and latency
- **`stats`** - Display client connection statistics
- **`quit`** or `exit` - Disconnect from the server and exit

### Example Session

```
VPN> Hello, this is a secure message!
[VPN Client] Sent encrypted data (48 bytes)

VPN> ping
[VPN Client] Pong received (latency: 2ms)

VPN> stats
Client Statistics:
  Connected: true
  Client ID: 1
  Bytes Received: 256
  Bytes Sent: 512

VPN> quit
```

## Configuration

You can modify these variables in the code:

### Server Configuration (vpn-server.js)
```javascript
var VPN_PORT = 8888;              // Server port
var VPN_HOST = '0.0.0.0';         // Bind address
var ENCRYPTION_ALGORITHM = 'aes-256-cbc';  // Encryption method
```

### Client Configuration (vpn-client.js)
```javascript
var VPN_SERVER_HOST = 'localhost'; // Server address
var VPN_SERVER_PORT = 8888;        // Server port
```

## How It Works

1. **Server Start**: The server listens on the specified port for incoming TCP connections
2. **Client Connection**: When a client connects, it receives a unique client ID and encryption keys
3. **Encryption**: All data is encrypted using AES-256-CBC before transmission
4. **Data Relay**: Messages from one client are relayed to all other connected clients
5. **Tunnel Management**: Each client maintains a secure tunnel for data transmission

## Architecture

### VPN Server
- **VPNServer Constructor**: Inherits from EventEmitter for event-driven architecture
- **Connection Handler**: Manages new client connections
- **Encryption/Decryption**: Handles data encryption and decryption
- **Client Management**: Tracks connected clients and their statistics
- **Broadcasting**: Relays messages between clients

### VPN Client
- **VPNClient Constructor**: Manages server connection
- **Message Handler**: Processes incoming messages from server
- **Encryption/Decryption**: Encrypts outgoing data and decrypts incoming data
- **Command Interface**: Provides readline interface for user interaction

## Security Notes

⚠️ **This is a demonstration/educational implementation. For production use, consider:**

- Implementing proper authentication and authorization
- Using TLS/SSL for transport layer security
- Implementing proper key exchange (e.g., Diffie-Hellman)
- Adding IP routing and network interface management
- Implementing proper logging and monitoring
- Adding rate limiting and DDoS protection
- Using a proper VPN protocol (OpenVPN, WireGuard, etc.)

## Stopping the Server

Press `Ctrl+C` to gracefully shut down the server. It will:
1. Disconnect all clients
2. Close the server socket
3. Exit cleanly

## Troubleshooting

### Port Already in Use
If you see "Port 8888 is already in use", either:
- Stop the process using that port
- Change `VPN_PORT` to a different port number

### Connection Refused
Make sure:
- The server is running before starting clients
- The client is configured with the correct server address
- No firewall is blocking the port

### Encryption Errors
If you see decryption errors:
- Make sure both server and client are using the same encryption algorithm
- Restart both server and client to reset encryption keys

## License

This code is provided as-is for educational purposes.

## Technical Details

### Protocol Messages

**Welcome Message** (Server → Client):
```json
{
  "type": "welcome",
  "clientId": 1,
  "message": "Connected to VPN Server",
  "encryptionKey": "hex_encoded_key",
  "encryptionIV": "hex_encoded_iv"
}
```

**Ping/Pong**:
```json
// Ping (Client → Server)
{"type": "ping", "timestamp": 1234567890}

// Pong (Server → Client)
{"type": "pong", "timestamp": 1234567890}
```

**Encrypted Data**:
```json
{
  "type": "data",
  "encrypted": true,
  "payload": "hex_encoded_encrypted_data"
}
```

**Data Relay** (Server → Clients):
```json
{
  "type": "relay",
  "fromClient": 1,
  "data": "hex_encoded_data"
}
```

