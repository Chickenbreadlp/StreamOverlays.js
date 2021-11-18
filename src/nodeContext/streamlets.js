const componentProvider = require('./streamlets/componentProvider');
const dataProvider = require('./streamlets/dataProvider');

let running = false;

function startServers() {
    running = true;
    dataProvider.start(28008);
    componentProvider.start(3005);
}

module.exports = {
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
