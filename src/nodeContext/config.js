const fs = require('fs');
const constants = require('../constants');

const componentStore = {
    chatbox: {
        style: ''
    }
};
const tokenStore = {
    pending: {
        service: null,
        channel: null
    }
};
const infoStore = {};

/* Internal Functions */
function storeToken(service, channel, token) {
    if (
        tokenStore[service] === undefined ||
        tokenStore[service] === null
    ) {
        tokenStore[service] = {};
    }

    tokenStore[service][channel] = token;
}
function saveComponents() {
    fs.writeFileSync('./config.json', JSON.stringify(componentStore), {encoding: 'utf8'});
}
function loadComponents() {
    if (fs.existsSync('./config.json')) {
        const file = fs.readFileSync('./config.json', {encoding: 'utf8'});
        const newConfig = JSON.parse(file);

        for (let key of Object.keys(newConfig)) {
            // Suppressing ES-Lint here, as the app is developed with Node 14 and .hasOwn is not available
            // eslint-disable-next-line no-prototype-builtins
            if (componentStore.hasOwnProperty(key)) {
                componentStore[key] = newConfig[key];
            }
        }
    }
}

/* External Functions */
// Token Functions
function setPendingToken(service, channel) {
    if (constants.isSupported(service)) {
        if (tokenStore.pending.service === null) {
            tokenStore.pending.service = service;
            tokenStore.pending.channel = channel;

            return true;
        }
    }

    return false;
}
function getPendingToken() {
    return tokenStore.pending;
}
function receiveToken(service, token) {
    if (
        tokenStore.pending.service === service
    ) {
        storeToken(service, tokenStore.pending.channel, token);
        tokenStore.pending.service = null;
        tokenStore.pending.channel = null;
        return true;
    }

    return false;
}
function setToken(service, channel, token) {
    if (constants.isSupported(service)) {
        storeToken(service, channel, token);
    }
}
function getToken(service, channel) {
    if (constants.isSupported(service)) {
        if (
            tokenStore[service] !== undefined &&
            tokenStore[service] !== null
        ) {
            return tokenStore[service][channel];
        }
    }
    
    return null;
}

// User Info functions
function setUserInfo(service, channel, info) {
    if (constants.isSupported(service)) {
        if (
            infoStore[service] === undefined ||
            infoStore[service] === null
        ) {
            infoStore[service] = {};
        }
        
        infoStore[service][channel] = info;
    }
}
function getUserInfo(service, channel) {
    if (constants.isSupported(service)) {
        if (
            infoStore[service] !== undefined &&
            infoStore[service] !== null
        ) {
            return infoStore[service][channel];
        }
    }

    return null;
}

// Component functions
function setComponentStyle(component, style) {
    if (componentStore[component] && typeof style === 'string') {
        componentStore[component].style = style;
        saveComponents();
    }
}
function getComponentStyle(component) {
    if (componentStore[component]) {
        return componentStore[component].style;
    }
}

loadComponents();

module.exports = {
    token: {
        setPending: setPendingToken,
        getPending: getPendingToken,
        receive: receiveToken,
        set: setToken,
        get: getToken
    },
    userInfo: {
        set: setUserInfo,
        get: getUserInfo
    },
    component: {
        setStyle: setComponentStyle,
        getStyle: getComponentStyle
    }
}
