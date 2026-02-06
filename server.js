/**
 * Custom VPN Server
 * Traditional JavaScript implementation using basic Node.js modules
 * No express, no arrow functions, using var instead of const
 */

var net = require('net');
var dgram = require('dgram');
var crypto = require('crypto');
var events = require('events');
var util = require('util');

// Configuration
var VPN_PORT = 8888;
var VPN_HOST = '0.0.0.0';
var ENCRYPTION_ALGORITHM = 'aes-256-cbc';
var ENCRYPTION_KEY = crypto.randomBytes(32);
var ENCRYPTION_IV = crypto.randomBytes(16);

// VPN Server Constructor
function VPNServer(options) {
    events.EventEmitter.call(this);
    
    this.port = options.port || VPN_PORT;
    this.host = options.host || VPN_HOST;
    this.clients = {};
    this.clientIdCounter = 0;
    this.server = null;
}

// Inherit from EventEmitter
util.inherits(VPNServer, events.EventEmitter);

// Encrypt data
VPNServer.prototype.encrypt = function(data) {
    var cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, ENCRYPTION_IV);
    var encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return encrypted;
};

// Decrypt data
VPNServer.prototype.decrypt = function(data) {
    try {
        var decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, ENCRYPTION_IV);
        var decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error.message);
        return null;
    }
};

// Handle new client connection
VPNServer.prototype.handleConnection = function(socket) {
    var self = this;
    var clientId = ++self.clientIdCounter;
    var clientInfo = {
        id: clientId,
        socket: socket,
        address: socket.remoteAddress,
        port: socket.remotePort,
        connected: true,
        bytesReceived: 0,
        bytesSent: 0
    };
    
    self.clients[clientId] = clientInfo;
    
    console.log('[VPN Server] Client connected: ID=' + clientId + 
                ' Address=' + clientInfo.address + ':' + clientInfo.port);
    
    // Send welcome message
    var welcomeMessage = JSON.stringify({
        type: 'welcome',
        clientId: clientId,
        message: 'Connected to VPN Server',
        encryptionKey: ENCRYPTION_KEY.toString('hex'),
        encryptionIV: ENCRYPTION_IV.toString('hex')
    });
    socket.write(welcomeMessage + '\n');
    
    // Handle incoming data
    socket.on('data', function(data) {
        self.handleClientData(clientId, data);
    });
    
    // Handle client disconnect
    socket.on('end', function() {
        console.log('[VPN Server] Client disconnected: ID=' + clientId);
        self.removeClient(clientId);
    });
    
    // Handle errors
    socket.on('error', function(error) {
        console.error('[VPN Server] Client error (ID=' + clientId + '):', error.message);
        self.removeClient(clientId);
    });
};

// Handle client data
VPNServer.prototype.handleClientData = function(clientId, data) {
    var self = this;
    var client = self.clients[clientId];
    
    if (!client) {
        return;
    }
    
    client.bytesReceived += data.length;
    
    try {
        // Try to parse as JSON first (for control messages)
        var message = JSON.parse(data.toString());
        
        if (message.type === 'ping') {
            self.sendToClient(clientId, {
                type: 'pong',
                timestamp: Date.now()
            });
        } else if (message.type === 'data') {
            // Handle encrypted data packet
            if (message.encrypted && message.payload) {
                var encryptedBuffer = Buffer.from(message.payload, 'hex');
                var decrypted = self.decrypt(encryptedBuffer);
                
                if (decrypted) {
                    console.log('[VPN Server] Decrypted data from client ' + clientId + 
                              ': ' + decrypted.toString().substring(0, 50) + '...');
                    
                    // Broadcast to other clients
                    self.broadcastToOthers(clientId, {
                        type: 'relay',
                        fromClient: clientId,
                        data: decrypted.toString('hex')
                    });
                }
            }
        } else if (message.type === 'tunnel') {
            // Handle tunnel request
            console.log('[VPN Server] Tunnel request from client ' + clientId);
            self.sendToClient(clientId, {
                type: 'tunnel_established',
                status: 'ready'
            });
        }
    } catch (error) {
        // If not JSON, treat as raw data
        console.log('[VPN Server] Raw data from client ' + clientId + 
                  ': ' + data.length + ' bytes');
    }
};

// Send data to specific client
VPNServer.prototype.sendToClient = function(clientId, data) {
    var client = this.clients[clientId];
    
    if (client && client.connected) {
        var message = JSON.stringify(data) + '\n';
        client.socket.write(message);
        client.bytesSent += message.length;
    }
};

// Broadcast to all clients except sender
VPNServer.prototype.broadcastToOthers = function(senderId, data) {
    var self = this;
    
    Object.keys(self.clients).forEach(function(clientId) {
        if (parseInt(clientId) !== senderId) {
            self.sendToClient(clientId, data);
        }
    });
};

// Remove client
VPNServer.prototype.removeClient = function(clientId) {
    var client = this.clients[clientId];
    
    if (client) {
        client.connected = false;
        if (client.socket && !client.socket.destroyed) {
            client.socket.destroy();
        }
        delete this.clients[clientId];
    }
};

// Get server statistics
VPNServer.prototype.getStats = function() {
    var self = this;
    var totalClients = Object.keys(self.clients).length;
    var totalBytesReceived = 0;
    var totalBytesSent = 0;
    
    Object.keys(self.clients).forEach(function(clientId) {
        var client = self.clients[clientId];
        totalBytesReceived += client.bytesReceived;
        totalBytesSent += client.bytesSent;
    });
    
    return {
        connectedClients: totalClients,
        totalBytesReceived: totalBytesReceived,
        totalBytesSent: totalBytesSent,
        uptime: process.uptime()
    };
};

// Start VPN server
VPNServer.prototype.start = function() {
    var self = this;
    
    self.server = net.createServer(function(socket) {
        self.handleConnection(socket);
    });
    
    self.server.listen(self.port, self.host, function() {
        console.log('===========================================');
        console.log('       Custom VPN Server Started');
        console.log('===========================================');
        console.log('Listening on: ' + self.host + ':' + self.port);
        console.log('Encryption: ' + ENCRYPTION_ALGORITHM);
        console.log('===========================================\n');
    });
    
    self.server.on('error', function(error) {
        console.error('[VPN Server] Server error:', error.message);
        if (error.code === 'EADDRINUSE') {
            console.error('Port ' + self.port + ' is already in use');
        }
    });
    
    // Print stats every 30 seconds
    setInterval(function() {
        var stats = self.getStats();
        console.log('[Stats] Clients: ' + stats.connectedClients + 
                  ' | RX: ' + (stats.totalBytesReceived / 1024).toFixed(2) + ' KB' +
                  ' | TX: ' + (stats.totalBytesSent / 1024).toFixed(2) + ' KB');
    }, 30000);
};

// Stop VPN server
VPNServer.prototype.stop = function() {
    var self = this;
    
    console.log('[VPN Server] Shutting down...');
    
    // Disconnect all clients
    Object.keys(self.clients).forEach(function(clientId) {
        self.removeClient(clientId);
    });
    
    // Close server
    if (self.server) {
        self.server.close(function() {
            console.log('[VPN Server] Server stopped');
        });
    }
};

// Handle process termination
process.on('SIGINT', function() {
    console.log('\n[VPN Server] Received SIGINT, shutting down gracefully...');
    if (vpnServer) {
        vpnServer.stop();
    }
    setTimeout(function() {
        process.exit(0);
    }, 1000);
});

process.on('SIGTERM', function() {
    console.log('\n[VPN Server] Received SIGTERM, shutting down gracefully...');
    if (vpnServer) {
        vpnServer.stop();
    }
    setTimeout(function() {
        process.exit(0);
    }, 1000);
});

// Create and start VPN server
var vpnServer = new VPNServer({
    port: VPN_PORT,
    host: VPN_HOST
});

vpnServer.start();

// Export for use as module
module.exports = VPNServer;
