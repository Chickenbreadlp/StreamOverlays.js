import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    twitch: {
      main: {
        token: {},
        userInfo: {}
      },
      bot: {
        token: {},
        userInfo: {}
      }
    },
    currentService: 'twitch'
  },
  mutations: {
    setUserToken(store, args) {
      if (args.service === 'twitch') {
        if (
            (args.type === 'main' || args.type === 'bot')
            && typeof args.token === 'object'
        ) {
          store.twitch[args.type].token = args.token;
        }
      }
    },
    setUserInfo(store, args) {
      if (args.service === 'twitch') {
        if (
            (args.type === 'main' || args.type === 'bot')
            && typeof args.info === 'object'
        ) {
          store.twitch[args.type].userInfo = args.info;
        }
      }
    },
    clearUser(store, args) {
      if (store[args.service] && store[args.service][args.type]) {
        store[args.service][args.type] = {
          token: {},
          userInfo: {}
        }
      }
    },
    changeService(store, service) {
      store.currentService = service;
    }
  },
  actions: {
  },
  modules: {
  }
})
