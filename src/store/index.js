import Vue from 'vue'
import Vuex from 'vuex'
import axios from "axios";

const twitchClientId = process.env.VUE_APP_TWITCH_CLIENT_ID;

function validateTwitch(token, callback) {
  const headers = {
    'Authorization': `Bearer ${token}`
  }
  console.log(token);

  axios.get('https://id.twitch.tv/oauth2/validate', { headers }).then(res => {
    console.log(res);
    headers['Client-Id'] = twitchClientId;
    callback(headers);
  }).catch(() => {});
}

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
    requestUserInfo({ commit, state }, args) {
      if (args.service === 'twitch') {
        const token = state.twitch[args.type].token;

        if (token && token.token) {
          validateTwitch(token.token, (headers) => {
            axios.get('https://api.twitch.tv/helix/users', {headers}).then(res => {
              if (Array.isArray(res.data.data) && res.data.data.length > 0) {
                commit('setUserInfo', {
                  service: 'twitch',
                  type: args.type,
                  info: res.data.data[0]
                });
              }
            })
          });
        }
      }
    }
  },
  modules: {
  }
})
