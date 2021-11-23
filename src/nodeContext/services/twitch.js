const {BrowserWindow} = require("electron");
const constants = require('../../constants');
const toolkit = require('../toolkit');
const axios = require("axios");
const clientId = process.env.VUE_APP_TWITCH_CLIENT_ID;

let config;
let lastState = null;

function setupConfig(configObj) {
    config = configObj;
}

/* Auth Section */
function requestToken(parentWin, channel) {
    return new Promise((resolve, reject) => {
        if (config.token.setPending('twitch', channel)) {
            const win = new BrowserWindow({
                ...constants.authWindowConfig,
                parent: parentWin,
                title: 'Login to Twitch'
            });
            win.setMenuBarVisibility(false);

            let url = 'https://id.twitch.tv/oauth2/authorize';
            url += `?client_id=${clientId}`;
            url += `&redirect_uri=${process.env.VUE_APP_TWITCH_REDIRECT}`;
            url += `&response_type=token`;

            let scopes;
            if (channel.toLowerCase() === 'bot') {
                scopes = process.env.VUE_APP_TWITCH_BOT_SCOPES;
            }
            else {
                scopes = process.env.VUE_APP_TWITCH_MAIN_SCOPES;
            }

            url += `&scope=${scopes}`;
            url += `&force_verify=true`;
            lastState = toolkit.generateRandomString(50);
            url += `&state=${lastState}`;

            win.loadURL(url);

            win.on('closed', () => {
                const pending = config.token.getPending();
                if (pending.service === null) {
                    const token = config.token.get('twitch', channel);

                    getUserInfo(token).then((userInfo) => {
                        config.userInfo.set('twitch', channel, userInfo);
                        resolve({
                            token,
                            userInfo
                        });
                    }).catch(() => {
                        reject();
                    })
                }
                else {
                    reject();
                }
            });
        }
    });
}
function receiveToken(service, tokenObj) {
    if (lastState && tokenObj.state === lastState && tokenObj.access_token) {
        const success = config.token.receive(service, tokenObj.access_token);

        if (success) {
            lastState = null;
        }

        return success;
    }
    return false;
}
function validate(token, callback) {
    const headers = {
        'Authorization': `Bearer ${token}`
    }

    axios.get('https://id.twitch.tv/oauth2/validate', { headers }).then(res => {
        console.log(res);
        headers['Client-Id'] = clientId;
        callback(null, headers);
    }).catch((err) => {
        console.log(err);
        callback(err);
    });
}

/* Get Requests */
function getUserInfo(token) {
    return new Promise((resolve, reject) => {
        validate(token, (err, headers) => {
            if (!err) {
                axios.get('https://api.twitch.tv/helix/users', {headers}).then(res => {
                    if (Array.isArray(res.data.data) && res.data.data.length > 0) {
                        resolve(res.data.data[0]);
                    }
                }).catch((err) => {
                    console.log(err);
                    reject(err);
                });
            }
            else {
                reject(err);
            }
        });
    });
}

module.exports = {
    setupConfig,
    requestToken,
    receiveToken,
    getUserInfo
}