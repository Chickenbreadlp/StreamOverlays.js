const twitch = require('./services/twitch');

let currentService;
let currentAPI;

function setup(configObj, broadcastFn) {
    twitch.setup(configObj, broadcastFn);
}

function setService(service) {
    if (currentAPI && typeof currentAPI.closeSockets === 'function') {
        currentAPI.closeSockets();
    }

    switch (service) {
        case 'twitch':
            currentAPI = twitch;
            currentService = service;
            break;
    }

    currentAPI.connectSockets();
}
function reconnectSockets() {
    if (currentAPI && typeof currentAPI.closeSockets === 'function') {
        currentAPI.closeSockets();
    }
    currentAPI.connectSockets();
}

setService('twitch');

module.exports = {
    setup,
    setService,
    getCurrentService: () => (currentService),
    reconnectSockets,

    api: {
        requestToken: (parentWin, channel) => {
            return currentAPI.requestToken(parentWin, channel);
        },
        receiveToken: (service, tokenObj) => {
            return currentAPI.receiveToken(service, tokenObj);
        },
        getUserInfo: (token) => {
            return currentAPI.getUserInfo(token);
        }
    }
}