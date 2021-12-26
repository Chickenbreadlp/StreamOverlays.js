const express = require('express');

const { version, name } = require('../../../package.json');
const tokenCatcher = require('./tokenCatcher');
const chatbox = require('./components/chatbox');
const alertbox = require('./components/alertbox');

// TODO: implement code for streamlets

const server = express();
let runningSrv;
let currentPort = 0;

server.use(express.json());
server.use((req, res, next) => {
    res.respond = (data, code, message) => {
        const response = {
            meta: {
                code,
                message: message || ''
            },
            data
        };

        const statusCode = String(code).padEnd(3, '0').substr(0, 3);

        res.status(Number(statusCode)).send(response);
    };

    req.portUsed = currentPort;

    next();
});
server.use('/internal', (req, res, next) => {
    if (req.headers['user-agent']) {
        const ua = req.headers['user-agent'].split(' ');

        if (ua.indexOf(`${name}/${version}`) >= 0) {
            next();
            return;
        }
    }

    res.respond(null, 403);
});

server.use('/internal/auth', tokenCatcher.srv);

// Components
server.use('/chatbox', chatbox.srv);
server.use('/alertbox', alertbox.srv);

function setup(configObj, serviceMan) {
    tokenCatcher.setup(serviceMan);
    chatbox.setup(configObj);
    alertbox.setup(configObj);
}
function startServer(port) {
    if (!runningSrv) {
        currentPort = port;
        runningSrv = server.listen(port, () => {
            console.log(`Streamlets Service listing on Port ${port}`);
        });
    }
}
function closeServer() {
    return new Promise((resolve) => {
        if (runningSrv) {
            console.log('Closing Express');
            runningSrv.close(() => {
                console.log('express closed');
                runningSrv = null;
                currentPort = 0;
                resolve();
            });
        }
        else {
            resolve();
        }
    });
}

module.exports = {
    start: startServer,
    close: closeServer,
    setup
}