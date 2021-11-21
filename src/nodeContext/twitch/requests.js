const axios = require('axios');

const clientId = process.env.VUE_APP_TWITCH_CLIENT_ID;

function validate(token, callback) {
    const headers = {
        'Authorization': `Bearer ${token}`
    }

    axios.get('https://id.twitch.tv/oauth2/validate', { headers }).then(res => {
        console.log(res);
        headers['Client-Id'] = clientId;
        callback(null, headers);
    }).catch((err) => {
        console.log(err);
        callback(err);
    });
}

function getUserInfo(token) {
    return new Promise((resolve, reject) => {
        validate(token.token, (err, headers) => {
            if (!err) {
                axios.get('https://api.twitch.tv/helix/users', {headers}).then(res => {
                    if (Array.isArray(res.data.data) && res.data.data.length > 0) {
                        resolve(res.data.data[0]);
                    }
                }).catch((err) => {
                    console.log(err);
                    reject(err);
                });
            }
            else {
                reject(err);
            }
        });
    });
}

module.exports = {
    validate,
    getUserInfo,
    clientId: clientId
}
