const express = require('express');

// TODO: implement code for streamlets

const server = express();
let runningSrv;

server.get('/', (req, res) => {
    res.send('Hello World!');
});

function startServer(port) {
    runningSrv = server.listen(port, () => {
        console.log(`Listing on Port ${port}`);
    });
}
function closeServer() {
    return new Promise((resolve) => {
        if (runningSrv) {
            console.log('Closing Express');
            runningSrv.close(() => {
                console.log('express closed');
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
    close: closeServer
}