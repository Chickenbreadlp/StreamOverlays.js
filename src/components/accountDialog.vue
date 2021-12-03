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

      <v-row class="mx-0 mb-0 px-3">
        <v-col cols="auto" align-self="center">
          Service:
        </v-col>
        <v-spacer />
        <v-col cols="auto">
          <v-btn-toggle
            v-model="service"
            dense
            mandatory
            color="primary"
          >
            <v-tooltip
              v-for="(s) of services"
              bottom
              :key="s.value"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-btn :value="s.value" v-bind="attrs" v-on="on">
                  <v-icon :color="s.color">mdi-{{ s.icon }}</v-icon>
                </v-btn>
              </template>
              <span>{{ s.text }}</span>
            </v-tooltip>

            <v-btn
              disabled
              class="text-none"
            >
              More to come
            </v-btn>
          </v-btn-toggle>
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
    currentTab: 0,
    tokensLoaded: []
  }),
  mounted() {
    const s = localStorage.getItem('service.selected');
    if (s && s.substr(0,1) === '"') {
      this.service = JSON.parse(s);
    }
    else {
      console.log('No Service preference found; continuing to load defaults')
      this.readTokenFromLs(this.service, 'main');
      this.readTokenFromLs(this.service, 'bot');
      this.tokensLoaded.push(this.service);
    }

    window.ipc.receive('auth', (args) => {
      if (args.error) {
        switch (args.error) {
          case 'Cancelled Token Request':
            this.requestingToken = false;
            break;
          case 'Token invalidated':
            localStorage.removeItem(`${args.service}.${args.channel}`);
            break;
        }
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
    window.ipc.receive('service', (args) => {
      if (args.error) {
        console.log(args.error);
      }
      else if (args.type === 'switch') {
        if (this.tokensLoaded.indexOf(args.service) < 0) {
          console.log(`Tokens not previously loaded for ${args.service}, so loading them now...`);
          this.readTokenFromLs(args.service, 'main');
          this.readTokenFromLs(args.service, 'bot');
          this.tokensLoaded.push(args.service);
        }
      }
    })
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
        window.ipc.send('service', {
          cmd: 'switch',
          service: newService
        });
        localStorage.setItem('service.selected', JSON.stringify(newService));
      }
    },
    services() {
      const sArr = [];

      for (const key in this.$services) {
        sArr.push({
          value: key,
          text: this.$services[key].name,
          color: this.$services[key].color,
          icon: this.$services[key].icon || key
        });
      }

      return sArr;
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