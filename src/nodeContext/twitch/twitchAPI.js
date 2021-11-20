const auth = require('./auth');

function setupConfig(configObj) {
    auth.setup(configObj);
    auth.setup = undefined;
}

module.exports = {
    setup: setupConfig,
    auth
}