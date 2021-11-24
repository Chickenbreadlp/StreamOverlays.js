const twitch = require('./services/twitch');

let currentService;
let currentAPI;

function setup(configObj, broadcastFn) {
    twitch.setup(configObj, broadcastFn);
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
    setup,
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