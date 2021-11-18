const WebSocket = require('ws');

let server;
let sockets = [];

function startServer(port) {
    server = new WebSocket.Server({ port: port });
    server.on('connection', (ws) => {
        sockets.push(ws);
        ws.send('TODO');

        ws.on("message", (message) => {
            ws.send(`currently not supported ${message}`);
            broadcast('test', message);
        });

        ws.on('close', () => {
            sockets = sockets.filter(s => s !== ws);
        });
    });
}
function closerServer() {
    return new Promise((resolve) => {
        console.log('Closing WS');
        server.close(() => {
            console.log('Closed WS');
            resolve();
        });
    });
}

function broadcast(channel, message) {
    sockets.forEach(ws => ws.send({ channel, message }));
}

module.exports = {
    broadcast,
    start: startServer,
    close: closerServer
}