function generateRandomString(length) {
    const l = Number(length);
    if (isNaN(l)) {
        throw 'Length is not a number!';
    }

    let str = '';
    let rNum;
    for (let i = 0; i < length; i++) {
        rNum = Math.floor(Math.random() * 62);
        if (rNum < 10) {
            rNum += 48;
        }
        else if (rNum < 36) {
            rNum += 55;
        }
        else {
            rNum += 61;
        }

        str += String.fromCharCode(rNum);
    }

    return str;
}

function generateJitter(baseTime) {
    const r = Math.random();
    const j = 0.9 + r * 0.2;

    return baseTime * j;
}

module.exports = {
    generateRandomString,
    generateJitter
}