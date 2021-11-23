const constants = require('../constants');

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

/* External Functions */
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
    }
}
