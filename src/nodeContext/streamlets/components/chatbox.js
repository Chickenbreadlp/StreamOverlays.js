const express = require('express');

const { title } = require('../../../../package.json');

const TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title} Chatbox</title>
    <script src="https://code.jquery.com/jquery-3.6.0.slim.min.js" integrity="sha256-u7e5khyithlIdTpu22PHhENmPcRdFiHRjhAuHcs05RI=" crossorigin="anonymous"></script>
    <style>
        .chatcontainer {
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
                                .css('color', msg['color'])
                                .text(msg['from']);
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
                                        $('<img></img>')
                                            .attr('src', part['url'])
                                            .addClass('emoji')
                                            .addClass('platform--' + part['platform'])
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
