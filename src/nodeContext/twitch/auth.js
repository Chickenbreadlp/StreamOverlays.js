const { BrowserWindow } = require('electron');
const requests = require('./requests');

let config;

function setupConfig(configObj) {
    config = configObj;
}

function requestTwitchToken(parentWin, channel) {
    return new Promise((resolve, reject) => {
        config.setPendingRequest('twitch', channel, true);

        let win = new BrowserWindow({
            width: 400,
            height: 600,
            webPreferences: {
                devTools: false,
                nodeIntegration: false,
                contextIsolation: true,
                partition: 'twitchLogin'
            },
            parent: parentWin,
            modal: true,
            minimizable: false,
            maximizable: false,
            fullscreenable: false,
            title: 'Login to Twitch'
        });
        win.setMenuBarVisibility(false);

        let url = 'https://id.twitch.tv/oauth2/authorize';
        url += `?client_id=${requests.clientId}`;
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
        url += `&state=${channel}`;

        win.loadURL(url);

        win.on('closed', () => {
            const token = config.getToken('twitch', channel);
            if (token.pending) {
                reject();
            }
            else {
                requests.getUserInfo(token).then((userInfo) => {
                    config.setUserInfo('twitch', channel, userInfo);
                    resolve({
                        token,
                        userInfo
                    });
                }).catch(() => {
                    reject();
                })
            }
        });
    });
}

module.exports = {
    setup: setupConfig,
    requestToken: requestTwitchToken
}
