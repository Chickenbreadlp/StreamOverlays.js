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
            partition: 'login'
        },
        modal: true,
        minimizable: false,
        maximizable: false,
        fullscreenable: false
    },
    twitchMinTokenLife: 86400 // 24 hours in seconds
}