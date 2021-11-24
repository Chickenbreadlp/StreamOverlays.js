const net = require('net');

const componentProvider = require('./streamlets/componentProvider');
const dataProvider = require('./streamlets/dataProvider');

let running = false;

function isPortTaken(port) {
    return new Promise((resolve, reject) => {
        const tester = net.createServer()
            .once('error', function (err) {
                if (err.code !== 'EADDRINUSE') reject(err);
                reject(false);
            })
            .once('listening', function() {
                tester.once('close', function() { resolve(true); })
                    .close()
            })
            .listen(port)
    });
}

function setup(configObj, serviceMan) {
    componentProvider.setup(configObj, serviceMan);
}
function startServers() {
    running = true;
    dataProvider.start(process.env.VUE_APP_WEB_SOCKET_PORT);
    componentProvider.start(process.env.VUE_APP_STREAMLET_PORT);
}
function closeServers() {
    return Promise.all([
        componentProvider.close(),
        dataProvider.close()
    ]).then(() => {
        running = false;
    });
}

function checkPorts() {
    const checks = [
        isPortTaken(process.env.VUE_APP_WEB_SOCKET_PORT),
        isPortTaken(process.env.VUE_APP_STREAMLET_PORT)
    ];

    return Promise.all(checks);
}

module.exports = {
    setup,
    checkPorts,
    startAll: startServers,
    closeAll: closeServers,
    isServiceRunning: () => (running),
    broadcastData: dataProvider.broadcast
}
