const { BrowserWindow } = require('electron');

const clientId = process.env.VUE_APP_TWITCH_CLIENT_ID;
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
        url += `?client_id=${clientId}`;
        url += `&redirect_uri=${process.env.VUE_APP_TWITCH_REDIRECT}`;
        url += `&response_type=token`;
        url += `&scope=chat:read chat:edit`;
        url += `&force_verify=true`;
        url += `&state=${channel}`;

        win.loadURL(url);

        win.on('closed', () => {
            const token = config.getToken('twitch', channel);
            if (token.pending) {
                reject();
            }
            else {
                resolve(token);
            }
        });
    });
}

module.exports = {
    setup: setupConfig,
    requestToken: requestTwitchToken
}
