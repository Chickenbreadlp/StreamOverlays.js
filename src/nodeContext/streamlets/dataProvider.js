const WebSocket = require('ws');

let srvRunning = false;
let server;

function heartbeat() {
    this.isAlive = true;
}

function startServer(port) {
    console.log(`Starting up WS on port ${port}`);
    server = new WebSocket.Server({ port: port });

    server.on('connection', (ws) => {
        ws.isAlive = true;

        ws.on('pong', heartbeat);

        ws.on("message", (message) => {
            ws.send(`currently not supported ${message}`);
            broadcast('test', message);
        });
    });

    const aliveCheck = setInterval(() => {
        server.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();

            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);
    server.on('close', () => {
        clearInterval(aliveCheck);
    });

    srvRunning = true;
}
function closerServer() {
    return new Promise((resolve) => {
        if (srvRunning && server) {
            console.log('Closing WS');
            server.clients.forEach((ws) => {
                ws.close();
            });
            server.close(() => {
                console.log('Closed WS');
                resolve();
            });
        }
        else {
            resolve();
        }
    });
}

function broadcast(channel, message) {
    console.log(channel, message);
    if (server) {
        server.clients.forEach((ws) => {
            ws.send(
                JSON.stringify({channel, message})
            )
        });
    }
}

module.exports = {
    broadcast,
    start: startServer,
    close: closerServer
}