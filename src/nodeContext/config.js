const fs = require('fs');

// Default config
const config = {
    slPort: 28007,
    wsPort: 28008
}

const tokenStore = {
    twitch: {
        token: '',
        tokenType: ''
    }
}

function save() {
    fs.writeFileSync('./config.json', JSON.stringify(config), { encoding: 'utf8' });
}
function load() {
    if (fs.existsSync('./config.json')) {
        const file = fs.readFileSync('./config.json', { encoding: 'utf8' });
        const newConfig = JSON.parse(file);

        for (let key of Object.keys(newConfig)) {
            // Suppressing ES-Lint here, as the app is developed with Node 14 and .hasOwn is not available
            // eslint-disable-next-line no-prototype-builtins
            if (config.hasOwnProperty(key)) {
                config[key] = newConfig[key];
            }
        }
    }
}

function getSlPort() {
    return config.slPort;
}
function setSlPort(newPort) {
    const nPort = Number(newPort);
    if (!isNaN(nPort)) {
        config.slPort = nPort;

        save();
        return true;
    }

    return false;
}

function getWsPort() {
    return config.wsPort;
}
function setWsPort(newPort) {
    const nPort = Number(newPort);
    if (!isNaN(nPort)) {
        config.wsPort = nPort;

        save();
        return true;
    }

    return false;
}

function parseAuthData(service, authData) {
    if (service === 'twitch') {
        tokenStore.twitch.token = authData.access_token || '';
        tokenStore.twitch.tokenType = authData.token_type || '';
    }

    console.log(tokenStore);
}

load();

module.exports = {
    slPort: {
        get: getSlPort,
        set: setSlPort,
    },
    wsPort: {
        get: getWsPort,
        set: setWsPort
    },
    parseAuthData
}
