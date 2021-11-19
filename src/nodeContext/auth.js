const express = require('express');

const tokenSrv = express();
let config;

tokenSrv.get('/:service', (req, res) => {
    const page = `
<script>
    const url = "http://localhost:${req.portUsed}${req.baseUrl}/${req.params.service}";

    let xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = window.close;
    
    let data = {};
    
    if (location.hash.length > 0) {
        let hash = location.hash;
        if (location.hash.substring(0,1) === '#') {
            hash = hash.substr(1);
        }
        hash = hash.split('&');
        
        hash.forEach(el => {
            const fields = el.split('=');
            const key = fields.splice(0,1);
            data[key] = fields.join('=');
        });
    }

    xhr.send(JSON.stringify(data));
</script>
`;
    res.send(page);
});
tokenSrv.post('/:service', (req, res) => {
    config.parseAuthData(req.params.service, req.body);
    res.respond(null, 200);
})

function setupConfig(configObj) {
    config = configObj;
}

module.exports = {
    srv: tokenSrv,
    setup: setupConfig
}