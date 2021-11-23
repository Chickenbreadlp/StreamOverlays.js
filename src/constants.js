const supportedServices = {
    twitch: 'Twitch'
}

module.exports = {
    supportedServices,
    isSupported: (service) => {
        return typeof supportedServices[service] === 'string';
    },
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
            // devTools: false,
            nodeIntegration: false,
            contextIsolation: true,
            partition: 'login'
        },
        modal: true,
        minimizable: false,
        maximizable: false,
        fullscreenable: false
    }
}