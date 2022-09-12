const WebsocketServer = require('./lib/websocketServer');
const CortexClient = require('./lib/emotiv/cortexClient');
const SessionManager = require('./lib/session/session-manager');

// create Client for Cortex connection 
const client = new CortexClient();

const sessionManager = new SessionManager(client);

// start Websocket Server 
const server = new WebsocketServer(client, sessionManager);

module.exports = server;
