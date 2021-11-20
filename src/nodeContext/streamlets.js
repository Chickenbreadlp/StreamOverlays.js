const componentProvider = require('./streamlets/componentProvider');
const dataProvider = require('./streamlets/dataProvider');

let running = false;

function setConfig(configObj) {
    componentProvider.setup(configObj);
}
function startServers() {
    running = true;
    dataProvider.start(process.env.VUE_APP_WEB_SOCKET_PORT);
    componentProvider.start(process.env.VUE_APP_STREAMLET_PORT);
}

module.exports = {
    setConfig,
    startAll: startServers,
    closeAll: () => {
        return Promise.all([
            componentProvider.close(),
            dataProvider.close()
        ]).then(() => {
            running = false;
        });
    },
    isServiceRunning: () => (running)
}
