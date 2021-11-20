const fs = require('fs');

// Default config
const config = {
}

const tokenStore = {
    twitch: {
        main: {
            token: '',
            tokenType: '',
            pending: false
        },
        bot: {
            token: '',
            tokenType: '',
            pending: false
        }
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

function clearAuthData(service, channel) {
    console.log(tokenStore)
    const s = tokenStore[service][channel];
    if (s) {
        s.token = '';
        s.tokenType = '';
    }
    console.log(tokenStore)
}
function setPendingRequest(service, channel, pending) {
    const s = tokenStore[service][channel];
    if (s) {
        s.pending = pending;
    }
}
function parseAuthData(service, authData) {
    console.log(service, authData);
    if (service === 'twitch') {
        const channel = authData.state;
        if (channel) {
            console.log(tokenStore.twitch[channel])
            if (tokenStore.twitch[channel].pending) {
                tokenStore.twitch[channel].token = authData.access_token || '';
                tokenStore.twitch[channel].tokenType = authData.token_type || '';
                tokenStore.twitch[channel].pending = false;
                return true;
            }
        }
    }
    console.log(tokenStore);
    return false;
}
function loadToken(service, channel, token) {
    const s = tokenStore[service][channel];
    if (s) {
        s.token = token.token;
        s.tokenType = token.tokenType;
        s.pending = token.pending;
    }
}
function getToken(service, channel) {
    const s = tokenStore[service][channel];
    if (s) {
        return s;
    }
    else {
        return null;
    }
}

load();

module.exports = {
    clearAuthData,
    setPendingRequest,
    parseAuthData,
    loadToken,
    getToken
}
