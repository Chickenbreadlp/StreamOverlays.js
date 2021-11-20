<template>
  <v-app>
    <v-system-bar
      app
      window
      dark
      color="primary darken-1"
      class="window-bar"
    >
      <span>Streamlets</span>
      <v-spacer />
      <button @click="minimizeWindow()">
        <v-icon class="ma-0">mdi-minus</v-icon>
      </button>
      <button @click="maximizeWindow()">
        <v-icon class="ma-0">mdi-window-{{ this.maximized ? 'restore' : 'maximize' }}</v-icon>
      </button>
      <button @click="closeWindow()">
        <v-icon class="ma-0">mdi-window-close</v-icon>
      </button>
    </v-system-bar>

    <sidebar
      v-model="sidebarOpen"
      @openAccount="accountDlg = true"
    />
    <v-app-bar
      app
      color="primary"
      dark
      min-height="64"
    >
      <v-app-bar-nav-icon
        @click="sidebarOpen = !sidebarOpen"
      />
      <v-spacer></v-spacer>
      <v-btn
        icon
        @click="settingsDlg = true"
      >
        <v-icon>mdi-cog</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <router-view/>
    </v-main>

    <account-dialog
      v-model="accountDlg"
    />
    <settings
      v-model="settingsDlg"
    />
  </v-app>
</template>

<script>

import Sidebar from "@/components/sidebar";
import AccountDialog from "@/components/accountDialog";
import Settings from "@/components/settings";
export default {
  name: 'App',
  components: {Settings, AccountDialog, Sidebar},
  data: () => ({
    sidebarOpen: false,
    maximized: false,
    accountDlg: false,
    settingsDlg: false
  }),
  mounted() {
    if (!localStorage.sTheme) {
      const themeQuery = window.matchMedia('(prefers-color-scheme: dark)');

      if (themeQuery.matches) {
        localStorage.sTheme = 'dark';
      }
      else {
        localStorage.sTheme = 'light';
      }
    }

    if (localStorage.sTheme === 'dark') {
      this.$vuetify.theme.dark = true;
    }

    this.sidebarOpen = !this.$vuetify.breakpoint.mobile;

    window.ipc.receive('maximize', (wasMaximized) => {
      this.maximized = wasMaximized;
    });
  },
  methods: {
    closeWindow () {
      window.ipc.send('close');
    },
    minimizeWindow () {
      window.ipc.send('minimize');
    },
    maximizeWindow () {
      window.ipc.send('maximize', !this.maximized);
    }
  }
};
</script>

<style>
.window-bar {
  -webkit-app-region: drag;
  -webkit-user-select: none;
  z-index: 9000 !important;
}
.window-bar button {
  -webkit-app-region: no-drag;

  height: 100%;
  padding-left: 5px;
  padding-right: 5px;
}
.window-bar button:hover {
  background-color: rgba(255,255,255,.1);
}

html {
  overflow: hidden !important;
}

main.v-main {
  width: 100vw;
  height: calc(100vh - 96px);
  flex-direction: column;
  overflow-y: scroll;
  margin-top: 96px;
  padding-top: 0 !important;
  transition: width 0s;
}
</style>
