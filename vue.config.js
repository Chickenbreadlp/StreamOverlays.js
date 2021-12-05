module.exports = {
  pluginOptions: {
    electronBuilder: {
      preload: 'src/preload.js',

      builderOptions: {
        appId: 'de.chickenbread.streamlets',
        productName: 'StreamOverlays.js',
        win: {
          target: [
            {
              target: 'nsis',
              arch: ['x64']
            },
            {
              target: 'portable',
              arch: ['x64']
            }
          ]
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true
        },
        linux: {
          target: [
            {
              target: 'AppImage',
              arch: ['x64']
            },
            {
              target: 'snap',
              arch: ['x64']
            },
            {
              target: 'deb',
              arch: ['x64']
            }
          ]
        }
      }
    }
  },
  transpileDependencies: [
    'vuetify'
  ]
}
