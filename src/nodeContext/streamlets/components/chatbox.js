const express = require('express');

const { title } = require('../../../../package.json');

const TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} Chatbox</title>
    <script src="https://code.jquery.com/jquery-3.6.0.slim.min.js" integrity="sha256-u7e5khyithlIdTpu22PHhENmPcRdFiHRjhAuHcs05RI=" crossorigin="anonymous"></script>
    <style>
        * {
            font-family: Arial, Helvetica, sans-serif;
            color: #fff;
        }
        
        @keyframes card-incoming {
            from {
                transform: rotateX(90deg);
            }
            to {
                transform: rotateX(0deg);
            }
        }
        
        .chatContainer {
            display: flex;
            position: fixed;
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;
            overflow: hidden;
            flex-flow: column;
            justify-content: flex-end;
            gap: 16px;
            padding: 18px;
        }
        .chatMessage {
            background: linear-gradient(
                rgba(100,100,100,.65),
                rgba(50,50,50,.65)
            );
            border-radius: 8px;
            padding: 12px;
            overflow: hidden;
            box-shadow: 0 8px 12px 4px rgba(0,0,0,.4);
            
            animation: card-incoming 1s ease-in-out;
        }
        
        .spacer {
            flex: 1;
        }
        
        .user {
            display: flex;
            flex-flow: row;
            
            font-size: 20px;
            margin-bottom: 4px;
            font-weight: 500;
        }
        .user span {
            margin-right: 4px;
        }
        .user .name {
            font-weight: bold;
            text-shadow: 0 0 2px black;
        }
        .badge img {
            height: 22px;
            position: relative;
            bottom: -3px;
            margin-top: -6px;
        }
        
        .message {
            font-size: 26px;
            line-height: 38px;
        }
        .emoji img {
            height: 38px;
            position: relative;
            bottom: -8px;
            margin-top: -16px;
        }
    </style>
    <style>{{CUSTOM_STYLE}}</style>
</head>
<body>
    <div class="chatContainer"></div>
    <script>
        $(() => {
            let ws;
            let reconnectInterval;
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
                        if (data['channel'] === 'chat' && typeof data['message'] === 'object') {
                            const msg = data['message'];
                            console.log(msg);
                            
                            const chat = $('<div></div>').addClass('chatMessage');
                            const user = $('<div></div>')
                                .addClass('user')
                                .append(
                                    $('<span></span>')
                                        .addClass('name')
                                        .css('color', msg['color'])
                                        .text(msg['from'])
                                )
                                .append(
                                    $('<span></span>').addClass('spacer')
                                );
                            
                            for (const badge of msg['badges']) {
                                user.append(
                                    $('<span></span>')
                                        .addClass('badge')
                                        .addClass('platform--' + badge['platform'])
                                        .addClass('name--' + badge['name'])
                                        .addClass('variant--' + badge['variant'])
                                        .append(
                                            $('<img></img>').attr('src', badge['url'])                                                
                                        )
                                )
                            }
                            
                            chat.append(user);
                            
                            const msgContainer = $('<div></div>').addClass('message');
                            for (const part of msg['text']) {
                                if (typeof part === 'string') {
                                    msgContainer.append(
                                        $('<span></span>').text(part)
                                    );
                                }
                                else if (part['type'] === 'emote') {
                                    msgContainer.append(
                                        $('<span></span>')
                                            .addClass('emoji')
                                            .addClass('platform--' + part['platform'])
                                            .append(
                                                $('<img></img>').attr('src', part['url'])                                                
                                            )
                                    );
                                }
                            }
                            chat.append(msgContainer);
                            
                            $('.chatContainer').append(chat);
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
        });
    </script>
</body>
</html>
`;
let component = TEMPLATE.split(/{{[A-Z0-9_-]+}}/g).join('');

const chatbox = express();
chatbox.get('/', (req, res) => {
    res.contentType('text/html').send(component);
});

function setup(config) {
    component = TEMPLATE.split('{{CUSTOM_STYLE}}').join(config.component.getStyle('chatbox'));
}

module.exports = {
    srv: chatbox,
    setup
};
