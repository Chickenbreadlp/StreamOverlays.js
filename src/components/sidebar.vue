<template>
  <v-navigation-drawer
    v-model="open"
    app
    dark
  >
    <v-list-item two-line>
      <v-list-item-content>
        <v-list-item-title class="text-h6">
          {{ mainUser[this.service.keys.username] || 'Please log in' }}
        </v-list-item-title>
        <v-list-item-subtitle>
          {{ botUser[this.service.keys.username] || 'No bot account configured' }}
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
      return this.$store.state[this.service.name].main.userInfo
    },
    botUser() {
      return this.$store.state[this.service.name].bot.userInfo
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