const componentProvider = require('./streamlets/componentProvider');
const dataProvider = require('./streamlets/dataProvider');

let config;
let running = false;

function setConfig(configObj) {
    config = configObj;
    componentProvider.setup(configObj);
}
function startServers() {
    running = true;
    dataProvider.start(config.wsPort.get());
    componentProvider.start(config.slPort.get());
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
