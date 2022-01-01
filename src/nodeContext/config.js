const fs = require('fs');
const constants = require('../constants');

const componentStore = {
    chatbox: {
        style: ''
    },
    alertbox: {
        style: '',
        highlightColor: constants.themeColor,
        alerts: {
            bits: {
                message: 'Thanks for the %b bits %u!',
                messageAnon: 'Thanks for the %b bits Anonymous user!',
                customAnim: false
            },
            host: {
                message: 'Thanks for the host %u!',
                subMessage: '%u is hosting us with %v viewers!',
                customAnim: false
            },
            raid: {
                message: 'Thanks for the raid %u!',
                subMessage: '%u is raiding us with %v viewers!',
                customAnim: false
            },
            sub: {
                message: 'Thanks for the Sub %u!',
                resubMessage: 'Thanks for the Resub %u with a %s month streak!',
                placeholder: '%u has subbed for a total of %t months',
                customAnim: false
            }
        },
        alertSounds: { // null = default
            cheer: null,
            host: null,
            raid: null,
            sub: null
        },
        alertAnimations: { // null = none/default
            cheer: null,
            host: null,
            raid: null,
            sub: null
        }
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
function patchObjValues(orgObj, newObj) {
    for (const key in orgObj) {
        if (
            newObj[key] &&
            typeof newObj[key] === typeof orgObj[key]
        ) {
            if (typeof orgObj[key] === 'object') {
                patchObjValues(orgObj[key], newObj[key]);
            }
            else {
                orgObj[key] = newObj[key];
            }
        }
    }
}
function saveComponents() {
    let fileData;
    if (constants.isDevelopment) {
        fileData = JSON.stringify(componentStore, null, 2);
    }
    else {
        fileData = JSON.stringify(componentStore);
    }

    fs.writeFileSync('./config.json', fileData, {encoding: 'utf8'});
}
function loadComponents() {
    if (fs.existsSync('./config.json')) {
        const file = fs.readFileSync('./config.json', {encoding: 'utf8'});
        const newConfig = JSON.parse(file);

        patchObjValues(componentStore, newConfig);
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
function setAlertHighlight(newColor) {
    if (
        typeof newColor === 'string' &&
        newColor.match(/^(?:#[0-9a-fA-F]{3}|[0-9a-fA-F]{6})|rgb\((?:[0-9]{1,3},){2}[0-9]{1,3}\)$/)
    ) {
        componentStore.alertbox.highlightColor = newColor;
        saveComponents();
    }
}
function getAlertHighlight() {
    return componentStore.alertbox.highlightColor;
}
function setAlertConfig(alert, newConfig) {
    const alConf = componentStore.alertbox.alerts[alert];
    if (alConf) {
        patchObjValues(alConf, newConfig);
        saveComponents();
    }
}
function getFullAlertConfig() {
    return { ...componentStore.alertbox.alerts };
}
function setAlertSound(alert, path) {
    const sounds = componentStore.alertbox.alertSounds;
    if (
        (
            sounds[alert] === null ||
            typeof sounds[alert] === 'string'
        ) && (
            path === null ||
            typeof path === 'string'
        )
    ) {
        sounds[alert] = path;
        saveComponents();
    }
}
function getAlertSound(alert) {
    return componentStore.alertbox.alertSounds[alert];
}
function setAlertAnimation(alert, path) {
    const animations = componentStore.alertbox.alertAnimations;
    if (
        (
            animations[alert] === null ||
            typeof animations[alert] === 'string'
        ) && (
            path === null ||
            typeof path === 'string'
        )
    ) {
        animations[alert] = path;
        saveComponents();
    }
}
function getAlertAnimation(alert) {
    return componentStore.alertbox.alertAnimations[alert];
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
        saveAll: saveComponents,
        setStyle: setComponentStyle,
        getStyle: getComponentStyle,
        setAlert: setAlertConfig,
        setAlertHighlight,
        getAlertHighlight,
        getAlerts: getFullAlertConfig,
        setSound: setAlertSound,
        getSound: getAlertSound,
        setAnimation: setAlertAnimation,
        getAnimation: getAlertAnimation
    }
}
