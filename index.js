/**
 * Custom VPN Client
 * Traditional JavaScript implementation to connect to VPN Server
 */

var net = require('net');
var crypto = require('crypto');
var readline = require('readline');

// Configuration
var VPN_SERVER_HOST = 'localhost';
var VPN_SERVER_PORT = 8888;
var ENCRYPTION_ALGORITHM = 'aes-256-cbc';

var encryptionKey = null;
var encryptionIV = null;

// VPN Client Constructor
function VPNClient(options) {
    this.host = options.host || VPN_SERVER_HOST;
    this.port = options.port || VPN_SERVER_PORT;
    this.socket = null;
    this.connected = false;
    this.clientId = null;
    this.bytesReceived = 0;
    this.bytesSent = 0;
}

// Encrypt data
VPNClient.prototype.encrypt = function(data) {
    if (!encryptionKey || !encryptionIV) {
        console.error('Encryption keys not initialized');
        return null;
    }
    
    var cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey, encryptionIV);
    var encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return encrypted;
};

// Decrypt data
VPNClient.prototype.decrypt = function(data) {
    if (!encryptionKey || !encryptionIV) {
        console.error('Encryption keys not initialized');
        return null;
    }
    
    try {
        var decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, encryptionKey, encryptionIV);
        var decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error.message);
        return null;
    }
};

// Connect to VPN server
VPNClient.prototype.connect = function() {
    var self = this;
    
    console.log('[VPN Client] Connecting to ' + self.host + ':' + self.port + '...');
    
    self.socket = net.createConnection({
        host: self.host,
        port: self.port
    }, function() {
        console.log('[VPN Client] Connected to VPN server');
        self.connected = true;
    });
    
    var buffer = '';
    
    self.socket.on('data', function(data) {
        self.bytesReceived += data.length;
        buffer += data.toString();
        
        // Process complete JSON messages
        var lines = buffer.split('\n');
        buffer = lines.pop();
        
        lines.forEach(function(line) {
            if (line.trim()) {
                try {
                    var message = JSON.parse(line);
                    self.handleMessage(message);
                } catch (error) {
                    console.error('[VPN Client] Failed to parse message:', error.message);
                }
            }
        });
    });
    
    self.socket.on('end', function() {
        console.log('[VPN Client] Disconnected from server');
        self.connected = false;
    });
    
    self.socket.on('error', function(error) {
        console.error('[VPN Client] Connection error:', error.message);
        self.connected = false;
    });
};

// Handle incoming messages
VPNClient.prototype.handleMessage = function(message) {
    var self = this;
    
    if (message.type === 'welcome') {
        self.clientId = message.clientId;
        console.log('[VPN Client] Received client ID: ' + self.clientId);
        console.log('[VPN Client] ' + message.message);
        
        // Initialize encryption keys
        encryptionKey = Buffer.from(message.encryptionKey, 'hex');
        encryptionIV = Buffer.from(message.encryptionIV, 'hex');
        console.log('[VPN Client] Encryption initialized');
        
        // Request tunnel establishment
        self.sendMessage({
            type: 'tunnel',
            request: 'establish'
        });
        
    } else if (message.type === 'pong') {
        var latency = Date.now() - message.timestamp;
        console.log('[VPN Client] Pong received (latency: ' + latency + 'ms)');
        
    } else if (message.type === 'tunnel_established') {
        console.log('[VPN Client] Tunnel established - Ready to send data');
        console.log('[VPN Client] Type messages to send through encrypted tunnel');
        
    } else if (message.type === 'relay') {
        console.log('[VPN Client] Received relayed data from client ' + message.fromClient);
        var dataBuffer = Buffer.from(message.data, 'hex');
        console.log('[VPN Client] Data: ' + dataBuffer.toString());
    }
};

// Send message to server
VPNClient.prototype.sendMessage = function(message) {
    if (this.connected && this.socket) {
        var data = JSON.stringify(message) + '\n';
        this.socket.write(data);
        this.bytesSent += data.length;
    } else {
        console.error('[VPN Client] Not connected to server');
    }
};

// Send encrypted data
VPNClient.prototype.sendEncryptedData = function(data) {
    var self = this;
    
    var encrypted = self.encrypt(Buffer.from(data));
    
    if (encrypted) {
        self.sendMessage({
            type: 'data',
            encrypted: true,
            payload: encrypted.toString('hex')
        });
        console.log('[VPN Client] Sent encrypted data (' + encrypted.length + ' bytes)');
    }
};

// Send ping
VPNClient.prototype.ping = function() {
    this.sendMessage({
        type: 'ping',
        timestamp: Date.now()
    });
};

// Disconnect from server
VPNClient.prototype.disconnect = function() {
    if (this.socket) {
        this.socket.end();
        this.connected = false;
        console.log('[VPN Client] Disconnected');
    }
};

// Get client statistics
VPNClient.prototype.getStats = function() {
    return {
        connected: this.connected,
        clientId: this.clientId,
        bytesReceived: this.bytesReceived,
        bytesSent: this.bytesSent
    };
};

// Create VPN client
var client = new VPNClient({
    host: VPN_SERVER_HOST,
    port: VPN_SERVER_PORT
});

// Connect to server
client.connect();

// Setup command line interface
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'VPN> '
});

setTimeout(function() {
    console.log('\n===========================================');
    console.log('Available commands:');
    console.log('  <message>  - Send encrypted message');
    console.log('  ping       - Send ping to server');
    console.log('  stats      - Show client statistics');
    console.log('  quit       - Disconnect and exit');
    console.log('===========================================\n');
    rl.prompt();
}, 1000);

rl.on('line', function(line) {
    var input = line.trim();
    
    if (!input) {
        rl.prompt();
        return;
    }
    
    if (input === 'quit' || input === 'exit') {
        client.disconnect();
        rl.close();
        process.exit(0);
    } else if (input === 'ping') {
        client.ping();
    } else if (input === 'stats') {
        var stats = client.getStats();
        console.log('Client Statistics:');
        console.log('  Connected: ' + stats.connected);
        console.log('  Client ID: ' + stats.clientId);
        console.log('  Bytes Received: ' + stats.bytesReceived);
        console.log('  Bytes Sent: ' + stats.bytesSent);
    } else {
        client.sendEncryptedData(input);
    }
    
    rl.prompt();
});

rl.on('close', function() {
    console.log('\nGoodbye!');
    process.exit(0);
});

// Export for use as module
module.exports = VPNClient;
