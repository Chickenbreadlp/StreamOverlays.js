<template>
  <v-navigation-drawer
    v-model="open"
    app
    dark
  >
    <v-list-item two-line>
      <v-list-item-content>
        <v-list-item-title class="text-h6">
          {{ mainUser.userInfo[this.service.keys.username] || (accLoading.main ? 'Loading...' : 'Please log in') }}
        </v-list-item-title>
        <v-list-item-subtitle>
          {{ botUser.userInfo[this.service.keys.username] || (accLoading.bot ? 'Loading...' : 'No bot account configured') }}
        </v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-action>
        <v-btn icon @click="openAccountDlg">
          <v-icon>mdi-account-cog</v-icon>
        </v-btn>
      </v-list-item-action>
    </v-list-item>
    <v-divider />
    <v-list>
    </v-list>
  </v-navigation-drawer>
</template>

<script>
export default {
  name: "sidebar",
  props: {
    value: {
      type: Boolean,
      required: true
    }
  },
  data: () => ({
    dark: false
  }),
  computed: {
    open: {
      get() {
        return this.value;
      },
      set(value) {
        this.$emit('input', value);
      }
    },
    service() {
      const name = this.$store.state.currentService || 'twitch';
      return {
        name,
        keys: this.$serviceKeys[name]
      };
    },
    mainUser() {
      return this.$store.state[this.service.name].main
    },
    botUser() {
      return this.$store.state[this.service.name].bot
    },
    accLoading() {
      return {
        main: Object.keys(this.mainUser.userInfo).length === 0 && Object.keys(this.mainUser.token).length !== 0,
        bot: Object.keys(this.botUser.userInfo).length === 0 && Object.keys(this.botUser.token).length !== 0
      }
    }
  },
  methods: {
    openAccountDlg() {
      if (this.$vuetify.breakpoint.mobile) {
        this.open = false;
      }
      this.$emit('openAccount');
    }
  }
}
</script>

<style scoped>
.v-navigation-drawer--is-mobile {
  top: 32px !important;
}
</style>