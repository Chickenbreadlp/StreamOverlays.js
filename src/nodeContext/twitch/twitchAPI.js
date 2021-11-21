const auth = require('./auth');
const requests = require('./requests');

function setupConfig(configObj) {
    auth.setup(configObj);
    auth.setup = undefined;
}

module.exports = {
    setup: setupConfig,
    auth,
    requests
}