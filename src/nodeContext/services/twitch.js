const {BrowserWindow} = require("electron");
const WebSocket = require('ws');

const constants = require('../../constants');
const toolkit = require('../toolkit');
const axios = require("axios");
const clientId = process.env.VUE_APP_TWITCH_CLIENT_ID;

let isSelected = false;
let chatSocket;
let chatSocketChannel = null;
let pubSub;
let recurring = [];

let config;
let lastState = null;
let broadcastData = (channel, message) => {
    console.log(`It looks like the Broadcast Function wasn't setup. Perhaps you've missed to run the setup function?`, channel, message);
    return false;
};

function setup(configObj, broadcastFn) {
    config = configObj;
    broadcastData = broadcastFn;
    broadcastData('test', 'This is a test message');
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

                        if (isSelected) {
                            if (
                                chatSocketChannel === null ||
                                (chatSocketChannel === 'main' && channel === 'bot') ||
                                chatSocketChannel === channel
                            ) {
                                configureChatSocket(token);
                            }
                            if (channel === 'main') {
                                reconnectPubSub();
                            }
                        }

                        resolve({
                            token,
                            userInfo
                        });
                    }).catch(() => {
                        reject();
                    });
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
function validate(token) {
    const headers = {
        'Authorization': `Bearer ${token}`
    }

    return new Promise((resolve, reject) => {
        axios.get('https://id.twitch.tv/oauth2/validate', { headers }).then((res) => {
            const expiresIn = Number(res.data.expires_in);
            console.log(res.data, expiresIn);
            if (!isNaN(expiresIn) && expiresIn < 86400) {
                reject('Token life too low');
            }
            else {
                headers['Client-Id'] = clientId;
                resolve(headers);
            }
        }).catch((err) => {
            console.log(err);
            reject(err);
        })
    });
}

/* Get Requests */
function getUserInfo(token) {
    return new Promise((resolve, reject) => {
        validate(token).then(headers => {
            axios.get('https://api.twitch.tv/helix/users', { headers }).then(res => {
                if (Array.isArray(res.data.data) && res.data.data.length > 0) {
                    resolve(res.data.data[0]);
                }
            }).catch((err) => {
                console.log(err);
                reject(err);
            });
        }).catch((err) => {
            reject(err);
        });
    });
}

/* Socket Connections */
// Chat Socket
function initChatSocket(token) {
    // TODO: implement chat connection
}
function configureChatSocket(freshToken) {
    if (freshToken) {
        initChatSocket(freshToken);
    }
    else {
        const botToken = config.token.get('twitch', 'bot');

        if (typeof botToken === 'string') {
            validate(botToken).then(() => {
                initChatSocket(botToken);
            }).catch(() => {
                const mainToken = config.token.get('twitch', 'main');

                if (typeof mainToken === 'string') {
                    validate(mainToken).then(() => {
                        initChatSocket(mainToken);
                    }).catch(() => {});
                }
            })
        }

    }
}

// PubSub
function pingPubSub() {
    return setTimeout(() => {
        const sentPing = recurring.find((obj) => obj.type === '[PubSub] Ping Sent');
        if (!sentPing) {
            console.log('Sending PubSub Ping...');

            const pingObj = recurring.find((obj) => obj.type === '[PubSub] Ping');

            if (pingObj) {
                pubSub.send(
                    JSON.stringify({
                        'type': 'PING'
                    })
                );
                recurring.push({
                    type: '[PubSub] Ping Sent',
                    timeout: setTimeout(() => {
                        reconnectPubSub();
                    }, 10000)
                });

                pingObj.timeout = pingPubSub();
            }
        }
    }, toolkit.generateJitter(60000));
}
function startPubSub() {
    if (!pubSub) {
        pubSub = new WebSocket('wss://pubsub-edge.twitch.tv');

        pubSub.on('open', () => {
            recurring.push({
                type: '[PubSub] Ping',
                timeout: pingPubSub()
            });

            const configInterval = setInterval(() => {
                const token = config.token.get('twitch', 'main');
                const user = config.userInfo.get('twitch', 'main');

                if (token && user) {
                    clearInterval(configInterval);
                    recurring = recurring.filter(rec => rec.type !== '[PubSub] Config');

                    const uID = user.id;

                    pubSub.send(JSON.stringify({
                        type: 'LISTEN',
                        data: {
                            topics: [
                                `channel-bits-events-v2.${uID}`,
                                `channel-points-channel-v1.${uID}`,
                                `channel-subscribe-events-v1.${uID}`
                            ],
                            auth_token: token
                        }
                    }));
                }
            }, 500);

            recurring.push({
                type: '[PubSub] Config',
                interval: configInterval
            });
        })

        pubSub.on('message', (data) => {
            const message = JSON.parse(data);

            console.log(message);

            if (message.type === 'PONG') {
                const sentPing = recurring.find((obj) => obj.type === '[PubSub] Ping Sent');

                if (sentPing) {
                    clearTimeout(sentPing.timeout);
                    recurring.splice(recurring.indexOf(sentPing), 1);
                }
            }
            else if (message.type === 'RECONNECT') {
                reconnectPubSub();
            }
            else if (message.type === 'MESSAGE' && typeof message.data === 'object') {
                // TODO: handle messages
                try {
                    const topic = String(message.data.topic).split('.');
                    let msg;
                    if (message.data.message && typeof message.data.message === 'object') {
                        msg = message.data.message;
                    }
                    else {
                        msg = JSON.parse(message.data.message);
                    }

                    if (topic[0] === 'channel-bits-events-v2') {
                        const broadcastMsg = {
                            bits: msg.data.bits_used,
                            text: msg.data.chat_message,
                            anonymous: msg.data.is_anonymous,
                            userName: ''
                        };

                        if (!msg.is_anonymous) {
                            broadcastMsg.userName = msg.data.user_name;
                        }

                        broadcastData('bits', broadcastMsg);
                    }
                    else if (topic[0] === 'channel-points-channel-v1') {
                        const broadcastMsg = {
                            rewardTitle: msg.data.redemption.reward.title,
                            text: msg.data.redemption.user_input || '',
                            userName: msg.data.redemption.user.display_name,
                            image: msg.data.redemption.reward.default_image.url_4x,
                            color: msg.data.redemption.reward.background_color
                        };

                        if (msg.data.redemption.reward.image) {
                            broadcastMsg.image = msg.data.redemption.reward.image.url_4x;
                        }

                        broadcastData('points', broadcastMsg);
                    }
                    else if (topic[0] === 'channel-subscribe-events-v1') {
                        const broadcastMsg = {
                            subLevel: msg.sub_plan,
                            streak: Number(msg.streak_months || 0),
                            total: Number(msg.cumulative_months || 0),
                            context: msg.context,
                            isGift: msg.is_gift,
                            subMessage: msg.sub_message
                        };

                        if (msg.is_gift) {
                            broadcastMsg.userName = msg.recipient_display_name
                        }
                        else {
                            broadcastMsg.userName = msg.display_name;
                        }

                        broadcastData('subs', broadcastMsg);
                    }
                }
                catch(e) {
                    console.warn(e);
                }
            }
        })
    }
}
function initPubSub() {
    const mainToken = config.token.get('twitch', 'main');

    if (typeof mainToken === 'string') {
        validate(mainToken).then(() => {
            startPubSub();
        }).catch(() => {});
    }
}
function reconnectPubSub() {
    disconnectPubSub();
    setTimeout(() => {
        initPubSub();
    }, 3000);
}
function disconnectPubSub() {
    if (pubSub) {
        const rec = recurring.filter((obj) => obj.type.indexOf('[PubSub]') === 0);

        for (const r of rec) {
            if (r.timeout) {
                clearTimeout(r.timeout);
            }
            if (r.interval) {
                clearInterval(r.interval);
            }

            recurring.splice(recurring.indexOf(r), 1);
        }

        pubSub.close();
        pubSub = null;
    }
}

// Initiators for outside
function connectSockets() {
    isSelected = true;

    if (config) {
        console.log('connecting pubsub/chatbot');
        configureChatSocket();
        initPubSub();
    }
}
function closeSockets() {
    disconnectPubSub();

    recurring.splice(0, recurring.length);
}

module.exports = {
    setup,
    requestToken,
    receiveToken,
    getUserInfo,
    connectSockets,
    closeSockets
}