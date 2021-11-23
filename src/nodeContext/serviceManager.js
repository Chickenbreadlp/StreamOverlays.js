const twitch = require('./services/twitch');

let currentService;
let currentAPI;

function setupConfig(configObj) {
    twitch.setupConfig(configObj);
}

function setService(service) {
    switch (service) {
        case 'twitch':
            currentAPI = twitch;
            currentService = service;
            break;
        default:
            throw 'Not Supported!';
    }
}

setService('twitch');

module.exports = {
    setupConfig,
    setService,
    getCurrentService: () => (currentService),

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