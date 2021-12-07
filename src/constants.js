const supportedServices = {
    twitch: {
        name: 'Twitch',
        color: '#9146FF'
    }
}

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
    supportedServices,
    isSupported: (service) => {
        return !!supportedServices[service];
    },
    isDevelopment,
    mappingKeys: {
        twitch: {
            token: 'access_token',
            username: 'display_name',
            pfp: 'profile_image_url'
        }
    },
    authWindowConfig: {
        width: 400,
        height: 600,
        webPreferences: {
            devTools: isDevelopment,
            nodeIntegration: false,
            contextIsolation: true,
            partition: 'login',
            sandbox: true
        },
        modal: true,
        minimizable: false,
        maximizable: false,
        fullscreenable: false
    },
    twitchMinTokenLife: 86400, // 24 hours in seconds
    userColors: [
        '#f00',
        '#00f',
        '#008000',
        '#b22222',
        '#ff7f50',
        '#9ACD32',
        '#ff4500',
        '#2e8b57',
        '#DAA520',
        '#D2691E',
        '#5F9EA0',
        '#1E90FF',
        '#FF69B4',
        '#8A2BE2',
        '#00FF7F'
    ]
}