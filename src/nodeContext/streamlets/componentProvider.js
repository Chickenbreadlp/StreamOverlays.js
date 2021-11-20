const express = require('express');
const twitchAuth = require('../tokenCatcher');
const { version, name } = require('./../../../package.json');
console.log(version, name);

// TODO: implement code for streamlets

const server = express();
let config;
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
    const ua = req.headers['user-agent'].split(' ');

    if (ua.indexOf(`${name}/${version}`) >= 0) {
        next();
    }
    else {
        res.respond(null, 403);
    }
})


server.get('/', (req, res) => {
    res.send('Hello World!');
});

server.use('/internal/auth', twitchAuth.srv);

function setupConfig(configObj) {
    config = configObj;
    twitchAuth.setup(configObj);
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
    setup: setupConfig
}