module.exports = {
  pluginOptions: {
    electronBuilder: {
      preload: 'src/preload.js',
      appId: 'de.chickenbread.streamlets'
    }
  },
  transpileDependencies: [
    'vuetify'
  ]
}
