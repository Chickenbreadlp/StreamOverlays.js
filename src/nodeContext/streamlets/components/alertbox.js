const path = require('path');
const fs = require('fs');
const express = require('express');
const constants = require('../../../constants');

const { title } = require('../../../../package.json');

// language=HTML
const TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} Alertbox</title>
    <script src="https://code.jquery.com/jquery-3.6.0.slim.min.js" integrity="sha256-u7e5khyithlIdTpu22PHhENmPcRdFiHRjhAuHcs05RI=" crossorigin="anonymous"></script>
    <style>
        @keyframes card-incoming {
            0%, 5% {
                left: calc(-100% - 24px);
            }
            100% {
                left: 0;
            }
        }
        @keyframes card-outgoing {
            0% {
                top: 0;
                opacity: 1;
            }
            95%, 100% {
                top: 100px;
                opacity: 0;
            }
        }
    
        body {
            margin: 0;
            padding: 16px;
            overflow: hidden;
        }
        * {
            font-family: Arial, Helvetica, sans-serif;
            color: #fff;
        }
        #alerts {
            width: 100%;
            height: 100%;
        }
        .alertCard {
            background: linear-gradient(
                rgba(100,100,100,.85),
                rgba(50,50,50,.85)
            );
            box-shadow: 0 8px 12px 4px rgba(0,0,0,.4);
            border-radius: 8px;
            overflow: hidden;
            padding: 12px;
            flex-shrink: 0;
            
            width: max-content;
            max-width: calc(100% - 24px);
            position: relative;
            
            display: flex;
            flex-flow: row;
            gap: 12px;
            
            animation: card-incoming 0.7s;
            animation-timing-function: ease-in-out !important;
            animation-fill-mode: both !important;
        }
        .icon {
            max-width: 112px;
            display: block;
            object-fit: contain;
            object-position: 0 0;
        }
        .text {
            display: flex;
            flex-flow: column;
            flex: 1;
            gap: 6px;
        }
        .title {
            font-size: 26px;
            line-height: 38px;
        }
        .highlight {
            text-shadow: 0 0 2px black;
            font-weight: bold;
        }
        .message {
            font-size: 22px;
            line-height: 34px;
        }
        .emoji img {
            height: 34px;
            position: relative;
            bottom: -6px;
            margin-top: -14px;
        }
    </style>
    <style>{{CUSTOM_STYLE}}</style>
</head>
<body>
    <div id="alerts"></div>
    <div id="sounds">
        <audio id="host" src="/alertbox/sound/host"></audio>
        <audio id="raid" src="/alertbox/sound/raid"></audio>
        <audio id="cheer" src="/alertbox/sound/cheer"></audio>
        <audio id="sub" src="/alertbox/sound/sub"></audio>
    </div>
    <script>
        $(() => {
            let ws;
            let reconnectInterval;
            const queue = [];
            
            const defaultBits = {
                1: {
                    url: '${constants.twitchBitURL}gray/4',
                    color: '#a1a1a1'
                },
                100: {
                    url: '${constants.twitchBitURL}purple/4',
                    color: '#be64ff'
                },
                1000: {
                    url: '${constants.twitchBitURL}green/4',
                    color: '#01f0c5'
                },
                5000: {
                    url: '${constants.twitchBitURL}blue/4',
                    color: '#559eff'
                },
                10000: {
                    url: '${constants.twitchBitURL}red/4',
                    color: '#ed3841'
                },
            };
            const injectedConf = '{{ALERT_CONFIG}}';
            const injectedColor = '{{HIGHLIGHT_COLOR}}';
            let config;
            
            try {
                config = JSON.parse(injectedConf);
            }
            catch (e) {
                config = {
                    bits: {
                        message: '%u Cheer Alert',
                        messageAnon: 'Anon Cheer Alert',
                        customAnim: false
                    },
                    host: {
                        message: '%u host',
                        subMessage: '%v viewers',
                        customAnim: false
                    },
                    raid: {
                        message: '%u raid',
                        subMessage: '%v viewers',
                        customAnim: false
                    },
                    sub: {
                        message: '%u sub',
                        resubMessage: '%u resub; %s streak',
                        placeholder: '%t total',
                        customAnim: false
                    }
                };
            }
            console.log(config);
            
            function objReplace(strArr, searchStr, injectObj) {
                for (let i = strArr.length-1; i >= 0; i--) {
                    const part = strArr[i];
                    if (
                        typeof part === 'string' &&
                        part.indexOf('%' + searchStr) >= 0
                    ) {
                        const sPart = part.split('%' + searchStr);
                        for (let j = sPart.length-1; j > 0; j--) {
                            sPart.splice(j, 0, injectObj);
                        }
                        strArr.splice(i, 1, ...sPart);
                    }
                }
                
                return strArr;
            }
            
            function generateCard(iconUrl, titleParts, messageParts, soundID) {
                const card = $('<div></div>')
                    .addClass('alertCard');
                
                if (iconUrl) {
                    card.append(
                        $('<img></img>')
                                .attr('src', iconUrl)
                                .addClass('icon')
                    );
                }
                
                const textSection = $('<div></div>').addClass('text');
                const title = $('<div></div>').addClass('title');
                for (const part of titleParts) {
                    if (typeof part === 'string') {
                        title.append(
                            $('<span></span>').text(part)
                        );
                    }
                    else if (typeof part === 'object' && part !== null) {
                        title.append(
                            $('<span></span>')
                                .text(part.text)
                                .addClass('highlight')
                                .addClass(part.class)
                                .css('color', part.color || injectedColor)
                        );
                    }
                }
                textSection.append(title);
                
                const message = $('<div></div>').addClass('message');
                for (const part of messageParts) {
                    if (typeof part === 'string') {
                        message.append(
                            $('<span></span>').text(part)
                        );
                    }
                    else if (part['type'] === 'emote' || part['type'] === 'cheer') {
                        message.append(
                            $('<span></span>')
                                .addClass('emoji')
                                .addClass('platform--' + part['platform'])
                                .append(
                                    $('<img></img>').attr('src', part['url'])                                                
                                )
                        );
                    }
                    else if (part['type'] === 'highlight') {
                        message.append(
                            $('<span></span>')
                                .text(part.text)
                                .addClass('highlight')
                                .addClass(part.class)
                                .css('color', part.color || injectedColor)
                        );
                    }
                }
                textSection.append(message);
                
                card.append(textSection);
                $('#alerts').append(card);
                
                if (typeof soundID === 'string' && soundID !== '') {
                    setTimeout(() => {
                        const sound = $('#sounds #' + soundID);
                        for (let i = 0; i < sound.length; i++) {
                            try {
                                sound[i].play();
                            } catch (e) {}
                        }
                    }, 200);
                }
            }
            function clearCards() {
                return new Promise((resolve) => {
                    $('#alerts').children().css('animation', 'card-outgoing 1s');
                    setTimeout(() => {
                        $('#alerts').empty();
                        resolve();
                    }, 1500);
                });
            }
            
            function handleBitAlert(bitData) {
                /* bits: msgInfo['bits'],
                   text: streamletData.text,
                   anonymous: false,
                   userName: msgInfo['display-name']
                */
                const bitAmount = Number(bitData['bits']);
                if (!isNaN(bitAmount) && bitAmount > 0) {
                    const levels = Object.keys(defaultBits);
                    levels.sort((a,b) => b-a);
                    let bitColor;
                    let url = null;
                    for (const level of levels) {
                        if (bitAmount >= level && url === null) {
                            url = defaultBits[level].url;
                            bitColor = defaultBits[level].color;
                        }
                    }
                    
                    if (config.bits.customAnim) {
                        url = '/alertbox/animation/cheer';
                    }
                    
                    let title;
                    if (bitData.anonymous) {
                        title = [config.bits.messageAnon];
                    }
                    else {
                        title = [config.bits.message];
                        
                        title = objReplace(title, 'u', {
                            text: bitData['userName'],
                            class: 'user'
                        });
                    }

                    title = objReplace(title, 'b', {
                        text: bitData['bits'],
                        class: 'bitAmount',
                        color: bitColor
                    });
                    
                    queue.push({
                        inProgress: false,
                        process: generateCard,
                        processArgs: [
                            url,
                            title,
                            bitData['text'],
                            'cheer'
                        ]
                    });
                }
            }
            function handleHostAlert(data, isRaid) {
                let localConf = config.host;
                if (isRaid) {
                    localConf = config.raid;
                }
                
                if (data['viewers'] > 0) {
                    let title = [localConf.message];
                    title = objReplace(title, 'u', {
                        text: data['username'],
                        class: 'user'
                    });
                    title = objReplace(title, 'v', {
                        text: data['viewers'],
                        class: 'viewerCount'
                    });
                    
                    let msg = [localConf.subMessage];
                    msg = objReplace(msg, 'u', {
                        type: 'highlight',
                        text: data['username'],
                        class: 'user'
                    });
                    msg = objReplace(msg, 'v', {
                        type: 'highlight',
                        text: data['viewers'],
                        class: 'viewerCount'
                    });
                    
                    let anim = null;
                    if (localConf.customAnim) {
                        anim = '/alertbox/animation/';
                        anim += isRaid ? 'raid' : 'host';
                    }

                    queue.push({
                        inProgress: false,
                        process: generateCard,
                        processArgs: [
                            anim,
                            title,
                            msg,
                            isRaid ? 'raid' : 'host'
                        ]
                    });
                }
            }
            function handleSubAlert(subData) {
                /* {
                    streak: Number(msg['streak_months'] || 0),
                    total: Number(msg['cumulative_months'] || 0),
                    isResub: msg['context'] === 'resub',
                    isPrime: String(msg['sub_plan']).toLowerCase() === 'prime',
                    isGift: msg['is_gift'],
                    subMessage -- Formatted like any other chat message
                    userName
                } */
                
                let msg = subData['subMessage'];
                if (!msg) {
                    msg = [];
                }
                
                let title = [];
                if (subData['isResub'] && (subData['streak'] || 0) > 0) {
                    title.push(config.sub.resubMessage);
                }
                else {
                    title.push(config.sub.message);
                }
                title = objReplace(title, 'u', {
                    type: 'highlight',
                    text: subData['userName'],
                    class: 'user'
                });
                title = objReplace(title, 't', {
                    type: 'highlight',
                    text: subData['total'],
                    class: 'subTotal'
                });
                title = objReplace(title, 's', {
                    type: 'highlight',
                    text: subData['streak'],
                    class: 'subStreak'
                });

                let anim = null;
                if (config.customAnim) {
                    anim = '/alertbox/animation/sub';
                }

                queue.push({
                    inProgress: false,
                    process: generateCard,
                    processArgs: [
                        anim,
                        title,
                        msg,
                        'sub'
                    ]
                });
            }
            
            function digestQueue() {
                if (queue.length > 0) {
                    const current = queue[0];
                    
                    if (
                        !current.inProgress &&
                        typeof current.process === 'function'
                    ) {
                        current.inProgress = true;
                        if (current.processArgs) {
                            current.process(...current.processArgs);
                        }
                        else {
                            current.process();
                        }
                        
                        current.timeout = setTimeout(() => {
                            clearCards().then(() => {
                                queue.splice(0, 1);
                                digestQueue();
                            });
                        }, 10000);
                    }
                }
            }
            
            function setupWS() {
                ws = new WebSocket('ws://localhost:${process.env.VUE_APP_WEB_SOCKET_PORT}');
                ws.onerror = (err) => {
                    // console.error(err);
                };
                ws.onopen = () => {
                    console.log('Connected!');
                    if (reconnectInterval) {
                        clearInterval(reconnectInterval);
                        reconnectInterval = null;
                    }
                };
                ws.onmessage = (msg) => {
                    if (msg.data && String(msg.data).indexOf('{') === 0) {
                        const data = JSON.parse(msg.data);
                        
                        if (typeof data['message'] === 'object') {
                            const msgData = data['message'];
                            switch(data['channel']) {
                                case 'bits':
                                    handleBitAlert(msgData);
                                    break;
                                case 'host':
                                    handleHostAlert(msgData, false);
                                    break;
                                case 'raid':
                                    handleHostAlert(msgData, true);
                                    break;
                                case 'subs':
                                    handleSubAlert(msgData);
                                    break;
                            }
                            
                            digestQueue();
                        }
                    }
                };
                ws.onclose = () => {
                    if (!reconnectInterval) {
                        console.log('Disconnected!');
                        reconnectInterval = setInterval(() => {
                            setupWS();
                        }, 10000);
                    }
                }
            }
            
            setupWS();
            
            setTimeout(() => {
                handleSubAlert({
                    streak: 0,
                    total: 0,
                    isResub: false,
                    isPrime: false,
                    isGift: false,
                    subMessage: ['This is my first sub'],
                    userName: 'CBStream'
                });
                handleSubAlert({
                    streak: 3,
                    total: 9,
                    isResub: true,
                    isPrime: false,
                    isGift: false,
                    subMessage: ['Resub baby!'],
                    userName: 'Chickenbread'
                });
                handleSubAlert({
                    streak: 0,
                    total: 0,
                    isResub: false,
                    isPrime: false,
                    isGift: true,
                    subMessage: [],
                    userName: 'Xaphais'
                });
                handleSubAlert({
                    streak: 0,
                    total: 5,
                    isResub: false,
                    isPrime: true,
                    isGift: false,
                    subMessage: [],
                    userName: 'CryptForce'
                });

                console.log(queue);
                digestQueue();
            }, 500);
            setTimeout(() => {
                handleHostAlert({
                    username: 'CBStream',
                    viewers: 5
                }, false);
                handleHostAlert({
                    username: 'CBStream',
                    viewers: 10
                }, true);

                console.log(queue);
                digestQueue();
            }, 1000);
            setTimeout(() => {
                handleBitAlert({
                    bits: 10000,
                    text: ['This is a cheer Test!'],
                    anonymous: false,
                    userName: 'Chickenbread'
                });
                handleBitAlert({
                    bits: 9999,
                    text: ['This is a second test!'],
                    anonymous: true,
                    userName: null
                });
                handleBitAlert({
                    bits: 1000,
                    text: ['Another one!'],
                    anonymous: false,
                    userName: 'CBStream'
                });
                handleBitAlert({
                    bits: 100,
                    text: ['Another one!'],
                    anonymous: false,
                    userName: 'FakeUser#69'
                });
                handleBitAlert({
                    bits: 5,
                    text: ['Another one!'],
                    anonymous: true,
                    userName: null
                });

                console.log(queue);
                digestQueue();
            }, 3000);
        });
    </script>
</body>
</html>
`;
let config;

const alertbox = express();
alertbox.get('/', (req, res) => {
    let component = TEMPLATE;
    if (config) {
        component = component.split('{{CUSTOM_STYLE}}').join(config.component.getStyle('alertbox'));
        component = component.split('{{ALERT_CONFIG}}').join(
            JSON.stringify(config.component.getAlerts())
        );
        component = component.split('{{HIGHLIGHT_COLOR}}').join(config.component.getAlertHighlight());
    }
    else {
        component = component.split(/{{[A-Z0-9_-]+}}/g).join('');
    }

    res.contentType('text/html').send(component);
});

alertbox.get('/sound/:soundId', (req, res) => {
    let fileSent = false;
    res.set('Cache-Control', 'no-cache');

    if (config) {
        // Get the configured audio source
        const soundId = req.params.soundId || '';
        const filePath = config.component.getSound(soundId);

        // Send out the file if a sound overwrite was configured and the file still exists
        if (
            typeof filePath === 'string' &&
            fs.existsSync(filePath) &&
            fs.lstatSync(filePath).isFile()
        ) {

            res.sendFile(filePath);
            fileSent = true;
        }
    }

    // Send the default audio-file if no overwrite was found, the file didn't exist of the config isn't setup...
    if (!fileSent) {
        res.sendFile('defaultAlert.wav', {
            // Supressing an ESLint error here, as it doesn't know what to do with the Vue-Electron "__static" Constant
            // eslint-disable-next-line no-undef
            root: path.join(__static)
        });
    }
});
alertbox.get('/animation/:animationId', (req, res) => {
    let fileSent = false;
    res.set('Cache-Control', 'no-cache');

    if (config) {
        // Get the configured audio source
        const animationId = req.params.animationId || '';
        const filePath = config.component.getAnimation(animationId);

        // Send out the file if a sound overwrite was configured and the file still exists
        if (
            typeof filePath === 'string' &&
            fs.existsSync(filePath) &&
            fs.lstatSync(filePath).isFile()
        ) {

            res.sendFile(filePath);
            fileSent = true;
        }
    }

    // Send the default audio-file if no overwrite was found, the file didn't exist of the config isn't setup...
    if (!fileSent) {
        res.sendFile('placeholder.png', {
            // Supressing an ESLint error here, as it doesn't know what to do with the Vue-Electron "__static" Constant
            // eslint-disable-next-line no-undef
            root: path.join(__static)
        });
    }
});

function setup(configObj) {
    config = configObj;
}

module.exports = {
    srv: alertbox,
    setup
};
