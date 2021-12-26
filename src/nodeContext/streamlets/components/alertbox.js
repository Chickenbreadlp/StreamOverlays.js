const express = require('express');

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
            width: 112px;
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
    <script>
        $(() => {
            let ws;
            let reconnectInterval;
            const queue = [];
            
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
                        animation: {
                            1: {
                                url: '',
                                color: ''
                            }
                        }
                    },
                    host: {
                        message: '%u host',
                        subMessage: '%v viewers'
                    },
                    raid: {
                        message: '%u raid',
                        subMessage: '%v viewers'
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
            
            function generateCard(iconUrl, titleParts, messageParts) {
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
                    const levels = Object.keys(config.bits.animation);
                    levels.sort((a,b) => b-a);
                    let bitColor;
                    let url = null;
                    for (const level of levels) {
                        if (bitAmount >= level && url === null) {
                            url = config.bits.animation[level].url;
                            bitColor = config.bits.animation[level].color;
                        }
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
                            bitData['text']
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

                    queue.push({
                        inProgress: false,
                        process: generateCard,
                        processArgs: [
                            localConf.animation,
                            title,
                            msg
                        ]
                    });
                }
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
    component = component.split(/{{[A-Z0-9_-]+}}/g).join('');

    res.contentType('text/html').send(component);
});

function setup(configObj) {
    config = configObj;
}

module.exports = {
    srv: alertbox,
    setup
};
