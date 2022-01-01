const {BrowserWindow} = require("electron");
const WebSocket = require('ws');
const axios = require("axios");
const tmi = require('tmi.js');

const constants = require('../../constants');
const toolkit = require('../toolkit');
const clientId = process.env.VUE_APP_TWITCH_CLIENT_ID;

let isSelected = false;
let chatSocket;
let botChatSocket;
let pubSub;
let recurring = [];

// Configuration and Temporary storage
let config;
const cheermotes = {
    regex: /\w+/,
    emotes: {}
};
const globalBadges = {};
let channelBadges = {};
const userColorCache = {};

let lastState = null;
let tokenRequestWin = null;
let broadcastData = (channel, message) => {
    console.log(`It looks like the Broadcast Function wasn't setup. Perhaps you've missed to run the setup function?`, channel, message);
    return false;
};
let triggerCommand = (cmd, args, extra) => {
    console.log(`It looks like the Command Trigger wasn't setup. Commands are being ignored!`, cmd, args, extra);
    return false;
}

/* Misc */
function setup(configObj, broadcastFn) {
    config = configObj;
    broadcastData = broadcastFn;
    broadcastData('test', 'This is a test message');
}
function getBadgeURL(name, variant) {
    if (globalBadges[name]) {
        let foundVariant;

        if (variant) {
            if (channelBadges[name]) {
                foundVariant = channelBadges[name].find(v => v.id === variant);
            }

            if (!foundVariant) {
                foundVariant = globalBadges[name].find(v => v.id === variant);
            }
        }

        if (!variant || !foundVariant) {
            foundVariant = globalBadges[name][0]
        }

        return foundVariant;
    }
}
function getRandomColor() {
    const r = Math.floor(Math.random() * constants.userColors.length);
    return constants.userColors[r];
}
function parseEmoteList(emotes) {
    // Generate array of Emotes to be replaced
    const emoteReplaceTable = [];
    for (const emote in emotes) {
        const url = `https://static-cdn.jtvnw.net/emoticons/v2/${emote}/default/dark/3.0`;

        for (const occurrence of emotes[emote]) {
            const start = Number(occurrence.split('-')[0])
            const end = Number(occurrence.split('-')[1]) + 1;

            emoteReplaceTable.push({
                url,
                start,
                end
            });
        }
    }

    // Sort Emoji list by order of occurrence
    emoteReplaceTable.sort((a, b) => a.start - b.start);
    return emoteReplaceTable;
}
function parseBadgeList(badgeList) {
    const badges = [];
    for (const badgeName in badgeList) {
        const variant = badgeList[badgeName];
        const badgeObj = getBadgeURL(badgeName, variant);

        if (badgeObj && typeof badgeObj['image_url_4x'] === 'string') {
            badges.push({
                name: badgeName,
                variant: variant,
                platform: 'twitch',
                url: badgeObj['image_url_4x']
            });
        }
    }
    return badges;
}
function parseMessage(message, msgInfo, emoteList) {
    let color = msgInfo['color'];

    if (!color) {
        const user = msgInfo['username'];

        if (userColorCache[user]) {
            color = userColorCache[user];
        }
        else {
            userColorCache[user] = getRandomColor();
            color = userColorCache[user];
        }
    }

    return {
        from: msgInfo['display-name'],
        color: color,
        text: parseChatMessage(message, emoteList)
    }
}
function parseChatMessage(message, emoteList) {
    // Split up original chat messages at Emojis and insert Emojis as Objects
    let offset = 0;
    let textSplit = [
        message
    ];
    for (const emote of emoteList) {
        const wrkTxt = textSplit[textSplit.length-1];
        const startTxt = wrkTxt.substring(0, emote.start - offset);
        const endTxt = wrkTxt.substring(emote.end - offset);
        offset = emote.end;

        textSplit[textSplit.length-1] = startTxt;
        textSplit.push(
            { type: 'emote', platform: 'twitch', url: emote.url },
            endTxt
        )
    }

    // Remove empty message sections
    textSplit = textSplit.filter(entry => typeof entry === 'object' || entry.length > 0);

    return textSplit;
}
function parseCheerEmotes(splitMessage) {
    const msgCopy = [...splitMessage];
    for (let i = 0; i < msgCopy.length; i++) {
        const part = msgCopy[i];
        if (typeof part === 'string') {
            const cmoteMatches = part.matchAll(cheermotes.regex);

            const newPart = [part];
            for (const match of cmoteMatches) {
                const cmoteTiers = cheermotes.emotes[match[1].toLowerCase()];
                if (cmoteTiers) {
                    const amount = Number(match[2]);
                    let cmote = cmoteTiers.filter(tier => tier['can_cheer'] && tier['min_bits'] <= amount);
                    if (cmote.length > 0) {
                        cmote = cmote[cmote.length-1];

                        const end = match.index + match[0].length;
                        const str = newPart[newPart.length - 1];

                        newPart[newPart.length - 1] = str.substring(0, match.index);
                        newPart.push(
                            { type: 'cheer', platform: 'twitch', url: cmote['images']['dark']['animated'][4] },
                            str.substring(end)
                        );
                    }
                }
            }

            msgCopy.splice(i, 1, ...newPart);
            i += newPart.length - 1;
        }
    }

    return msgCopy;
}
function parseCommand(message, msgInfo, emoteList) {
    const args = message.slice(1).split(' ');
    const cmd = args.shift().toLowerCase();
    const badgeList = Object.keys(msgInfo['badges'] || {});

    triggerCommand(cmd, args, {
        from: msgInfo['display-name'],
        color: msgInfo['color'],
        badgeInfo: msgInfo['badge-info'] || {},
        emotes: emoteList,
        isMod: msgInfo['mod'] || (badgeList.indexOf('broadcaster') >= 0),
        isSubscriber: msgInfo['subscriber']
    });
}

/* Auth Section */
function requestToken(parentWin, channel) {
    return new Promise((resolve, reject) => {
        if (!tokenRequestWin) {
            if (config.token.setPending('twitch', channel)) {
                const windowConfig = {
                    ...constants.authWindowConfig,
                    parent: parentWin,
                    title: 'Login to Twitch'
                };
                windowConfig.webPreferences.partition += `--twitch-${channel}`;

                tokenRequestWin = new BrowserWindow(windowConfig);
                tokenRequestWin.setMenuBarVisibility(false);

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

                tokenRequestWin.loadURL(url);

                tokenRequestWin.on('closed', () => {
                    const pending = config.token.getPending();
                    if (pending.service === null) {
                        const token = config.token.get('twitch', channel);

                        getUserInfo(token).then((userInfo) => {
                            config.userInfo.set('twitch', channel, userInfo);

                            if (isSelected) {
                                if (channel === 'main') {
                                    reconnectPubSub();
                                }
                                configureChatSocket(token, userInfo.login, channel === 'bot');
                            }

                            resolve({
                                token,
                                userInfo
                            });
                        }).catch(() => {
                            reject();
                        });
                    } else {
                        reject();
                    }
                });
            }
            else {
                reject();
            }
        }
        else {
            reject();
        }
    });
}
function receiveToken(service, tokenObj) {
    if (
        lastState &&
        tokenObj.state === lastState &&
        tokenObj.access_token
    ) {
        const success = config.token.receive(service, tokenObj.access_token);

        if (success) {
            lastState = null;
        }

        if (tokenRequestWin) {
            tokenRequestWin.close();
            tokenRequestWin = null;
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
            if (!isNaN(expiresIn) && expiresIn < 86400) {
                reject('Token life too low');
            }
            else {
                headers['Client-Id'] = clientId;
                resolve({ headers, login: res.data.login, userId: res.data.user_id });
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
        validate(token).then(({ headers }) => {
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
function getBadges(token) {
    return new Promise((resolve, reject) => {
        validate(token).then(({ headers, userId }) => {
            const params = { 'broadcaster_id': userId };
            channelBadges = {};

            const promises = [
                axios.get('https://api.twitch.tv/helix/chat/badges', { headers, params }).then(res => {
                    if (res.data.data && typeof res.data.data === 'object') {
                        const badges = res.data.data;

                        for (const badge of badges) {
                            channelBadges[badge['set_id']] = badge['versions'];
                        }
                    }
                })
            ];

            if (Object.keys(globalBadges).length === 0) {
                promises.push(
                    axios.get('https://api.twitch.tv/helix/chat/badges/global', { headers }).then(res => {
                        if (res.data.data && typeof res.data.data === 'object') {
                            const badges = res.data.data;

                            for (const badge of badges) {
                                globalBadges[badge['set_id']] = badge['versions'];
                            }
                        }
                    })
                );
            }
            if (Object.keys(cheermotes.emotes).length === 0) {
                promises.push(
                    axios.get('https://api.twitch.tv/helix/bits/cheermotes', { headers }).then(res => {
                        if (res.data.data && typeof res.data.data === 'object') {
                            const emotes = res.data.data;
                            let regexList = '';

                            for (const emote of emotes) {
                                const prefix = String(emote['prefix']).toLowerCase();
                                cheermotes.emotes[prefix] = emote['tiers'];
                                regexList += prefix + '|';
                            }

                            regexList = regexList.substring(0, regexList.length-1);
                            cheermotes.regex = new RegExp(`(?<=^|\\s)(${regexList})(\\d+)(?=\\s|$)`, 'gi');
                        }
                    })
                );
            }

            Promise.all(promises).then(() => {
                resolve();
            }).catch(() => {
                reject();
            })
        }).catch(() => {
            reject();
        });
    })
}

/* Socket Connections */
// Chat Socket
function createSocket(token, login, channel) {
    if (!channel) {
        channel = login;
    }

    return new tmi.Client({
        channels: [ channel ],
        identity: {
            username: login,
            password: `oauth:${token}`
        },
        connection: {
            secure: true,
            reconnect: true
        }
    });
}
function initMainChat(token, login) {
    if (!chatSocket) {
        console.log('Init chat socket');
        chatSocket = createSocket(token, login);

        chatSocket.on('chat', (channel, msgInfo, message, self) => {
            const emoteList = parseEmoteList(msgInfo['emotes'] || {});
            const badgeList = parseBadgeList(msgInfo['badges'] || {});

            const streamletData = parseMessage(message, msgInfo, emoteList);
            streamletData.badges = badgeList;

            // Broadcast the chat message
            broadcastData('chat', streamletData);

            // Execute commands, if not send by the bot itself
            if (!self && message.indexOf('!') === 0 && botChatSocket) {
                parseCommand(message, msgInfo, emoteList);
            }
        });

        chatSocket.on('cheer', (channel, msgInfo, message) => {
            console.log('cheer', msgInfo, message);
            const emoteList = parseEmoteList(msgInfo['emotes'] || {});
            const badgeList = parseBadgeList(msgInfo['badges'] || {});

            const streamletData = parseMessage(message, msgInfo, emoteList);
            streamletData.badges = badgeList;
            console.log(streamletData.text);
            streamletData.text = parseCheerEmotes(streamletData.text);
            console.log(streamletData.text);
            broadcastData('chat', streamletData);

            const broadcastMsg = {
                bits: msgInfo['bits'],
                text: streamletData.text,
                anonymous: false,
                userName: msgInfo['display-name']
            };
            broadcastData('bits', broadcastMsg);
            /*
            {
              'badge-info': { subscriber: '23' },
              badges: { subscriber: '6', bits: '1000' },
              bits: '1',
              color: '#9ACD32',
              'display-name': 'CBStream',
              emotes: null,
              'first-msg': false,
              flags: null,
              id: '5154a4c8-4984-4644-b58e-de8c3bcc87b0',
              mod: false,
              'room-id': '42875281',
              subscriber: true,
              'tmi-sent-ts': '1639163666675',
              turbo: false,
              'user-id': '39705228',
              'user-type': null,
              'emotes-raw': null,
              'badge-info-raw': 'subscriber/23',
              'badges-raw': 'subscriber/6,bits/1000',
              username: 'cbstream',
              'message-type': 'chat'
            },
            Do bits work now though? Cheer1
            */
        });
        chatSocket.on('hosted', (channel, username, viewers, autohost) => {
            console.log('host', username, viewers, autohost);
            if (!autohost) {
                broadcastData('host', {
                    username,
                    viewers
                });
            }
        });
        chatSocket.on('raided', (channel, username, viewers) => {
            console.log('raid', username, viewers);
            broadcastData('raid', {
                username,
                viewers
            });
        });

        chatSocket.connect().then();
    }
}
function initBotChat(token, login, channel) {
    if (!botChatSocket) {
        console.log('Init bot chat socket');
        botChatSocket = createSocket(token, login, channel);

        botChatSocket.on('chat', (channel, msgInfo, message, self) => {
            // Execute commands, if not send by the bot itself
            if (!self && message.indexOf('!') === 0) {
                parseCommand(
                    message,
                    msgInfo,
                    parseEmoteList(msgInfo['emotes'] || {})
                );
            }
        });

        botChatSocket.connect().then();
    }
}
function configureChatSocket(freshToken, name, isBot) {
    if (freshToken && name) {
        const mainAcc = config.userInfo.get('twitch', 'main');
        if (isBot) {
            botChatSocket.disconnect();
            botChatSocket = null;
            initBotChat(freshToken, name, mainAcc.login);
        }
        else {
            chatSocket.disconnect();
            chatSocket = null;
            initMainChat(freshToken, name);
        }
    }
    else {
        disconnectChatSocket();
        const mainToken = config.token.get('twitch', 'main');

        if (typeof mainToken === 'string') {
            validate(mainToken).then((main) => {
                getBadges(mainToken).then();
                initMainChat(mainToken, main.login);

                const botToken = config.token.get('twitch', 'bot');
                if (typeof botToken === 'string') {
                    validate(botToken).then(({login}) => {
                        initBotChat(botToken, login, main.login);
                    });
                }
            });
        }
    }
}
function disconnectChatSocket() {
    if (chatSocket) {
        chatSocket.disconnect();
        chatSocket = null;
    }
    if (botChatSocket) {
        botChatSocket.disconnect();
        botChatSocket = null;
    }
}

// PubSub
function pingPubSub() {
    return setTimeout(() => {
        const sentPing = recurring.find((obj) => obj.type === '[PubSub] Ping Sent');
        if (!sentPing) {
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
                console.log(message);

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
                        if (msg.data.is_anonymous) {
                            const broadcastMsg = {
                                bits: msg.data.bits_used,
                                //text: msg.data.chat_message,
                                text: parseCheerEmotes([msg.data.chat_message]),
                                anonymous: true,
                                userName: ''
                            };
                            broadcastData('bits', broadcastMsg);
                        }
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
                        let subMessage = [];

                        if (msg['sub_message'] && msg['sub_message']['message'] !== '') {
                            const emoteList = (msg['sub_message']['emotes'] || []).map(emote => {
                                emote['end'] += emote['start'];
                                emote['url'] = `https://static-cdn.jtvnw.net/emoticons/v2/${emote['id']}/default/dark/3.0`;
                                return emote;
                            });

                            subMessage = parseChatMessage(msg['sub_message']['message'], emoteList);
                        }

                        const broadcastMsg = {
                            streak: Number(msg['streak_months'] || 0),
                            total: Number(msg['cumulative_months'] || 0),
                            isResub: msg['context'] === 'resub',
                            isPrime: String(msg['sub_plan']).toLowerCase() === 'prime',
                            isGift: msg['is_gift'],
                            subMessage
                        };

                        if (msg['is_gift']) {
                            broadcastMsg.userName = msg['recipient_display_name'] || msg['recipient_user_name'];
                        }
                        else {
                            broadcastMsg.userName = msg['display_name'] || msg['user_name'];
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
    disconnectChatSocket();

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