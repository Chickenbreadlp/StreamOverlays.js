<template>
  <v-dialog
    v-model="open"
    width="400"
  >
    <v-card>
      <v-card-title>
        Manage Accounts
        <v-spacer />
        <v-btn
          icon
          @click="open = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-row class="mx-0 mb-0">
        <v-col cols="4" align-self="center">
          Service:
        </v-col>
        <v-col cols="8">
          <v-select
            v-model="service"
            :items="services"
            :disabled="requestingToken.active"
          />
        </v-col>
      </v-row>

      <v-tabs
        v-model="currentTab"
        grow
        :color="`primary ${$vuetify.theme.dark ? 'lighten-2' : ''}`"
      >
        <v-tab>
          Main
        </v-tab>
        <v-tab>
          Bot
        </v-tab>
      </v-tabs>

      <v-tabs-items v-model="currentTab">
        <v-tab-item>
          <v-card
            flat
          >
            <account-handler
              :service="service"
              channel="main"
              @login="requestToken('main')"
              @logout="clearToken('main')"
            />
          </v-card>
        </v-tab-item>
        <v-tab-item>
          <v-card
            flat
          >
            <account-handler
              :service="service"
              channel="bot"
              @login="requestToken('bot')"
              @logout="clearToken('bot')"
            />
          </v-card>
        </v-tab-item>
      </v-tabs-items>
    </v-card>
  </v-dialog>
</template>

<script>
import {mapMutations} from "vuex";
import AccountHandler from "@/components/accountHandler";

export default {
  name: "accountDialog",
  components: {AccountHandler},
  props: {
    value: {
      type: Boolean,
      required: true
    }
  },
  data: () => ({
    requestingToken: false,
    services: [
      {
        text: 'Twitch',
        value: 'twitch'
      }
    ],
    currentTab: 0
  }),
  mounted() {
    this.readTokenFromLs('twitch', 'main');
    this.readTokenFromLs('twitch', 'bot');

    window.ipc.receive('auth', (args) => {
      if (args.error === 'Cancelled Token Request') {
        this.requestingToken = false;
      }
      else if (args.type === 'request') {
        const data = args.data;
        console.log(data);
        localStorage.setItem(`${this.service}.${args.channel}`, JSON.stringify(data.token));

        this.setUserToken({
          service: args.service,
          type: args.channel,
          token: data.token
        });
        this.setUserInfo({
          service: args.service,
          type: args.channel,
          info: data.userInfo
        });

        this.requestingToken = false;
      }
      else if (args.type === 'load') {
        this.setUserInfo({
          service: 'twitch',
          type: args.channel,
          info: args.info
        });
      }
    });
  },
  computed: {
    open: {
      get() {
        return this.value;
      },
      set(value) {
        this.$emit('input', value);
      }
    },
    service: {
      get() {
        return this.$store.state.currentService;
      },
      set(newService) {
        this.changeService(newService);
      }
    }
  },
  methods: {
    requestToken(channel) {
      this.requestingToken = true;

      window.ipc.send('auth', {
        service: this.service,
        cmd: 'request',
        channel
      });
    },
    clearToken(channel) {
      window.ipc.send('auth', {
        service: this.service,
        cmd: 'clear',
        channel
      });
      this.clearUser({
        service: 'twitch',
        type: channel
      })
      localStorage.removeItem(`${this.service}.${channel}`)
    },

    readTokenFromLs(service, channel) {
      const lsToken = localStorage.getItem(`${service}.${channel}`);
      if (
        String(lsToken).substr(0,1) === '{' ||
        String(lsToken).substr(0,1) === '"'
      ) {
        const token = JSON.parse(lsToken);
        this.setUserToken({
          service: service,
          type: channel,
          token
        });

        window.ipc.send('auth', {
          service: 'twitch',
          cmd: 'load',
          channel,
          token
        });
      }
    },

    ...mapMutations([
      "setUserToken",
      "setUserInfo",
      "clearUser",
      "changeService"
    ])
  }
}
</script>

<style scoped>

</style>