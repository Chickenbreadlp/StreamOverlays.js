<template>
  <v-dialog
    v-model="open"
    width="600"
  >
    <v-card>
      <v-card-title>
        Settings
        <v-spacer />
        <v-btn
          icon
          @click="open = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-row class="mx-3 mb-0">
        <v-col cols="12">
          <p class="mb-2 text-h6">Theme</p>
          <v-row class="mx-0">
            <v-col cols="6" v-for="(item, i) in themes" :key="i">
              <v-card
                :class="'themeCard mb-2 ' + themeCardClass[item.data]"
                :light="item.data !== 'dark'"
                :dark="item.data === 'dark'"
              >
                <v-responsive :aspect-ratio="16/9">
                  <aside
                    :class="{
                      'v-navigation-drawer': true,
                      'v-navigation-drawer--open': true,
                      'theme--dark': true
                    }"
                    style="height: 100%; top: 0; transform: translateX(0); width: 30%"
                  >
                    <div class="v-navigation-drawer__content" />
                    <div class="v-navigation-drawer__border" />
                  </aside>
                  <v-app-bar
                    height="20%"
                    absolute
                    color="primary"
                    dark
                    style="left: 30%"
                  />
                  <div class="selectionRing" @click="setTheme(item.data)"></div>
                </v-responsive>
              </v-card>

              <span>{{ item.name }}</span>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "settings",
  props: {
    value: {
      type: Boolean,
      required: true
    }
  },
  data: () => ({
    themes: [
      { data: 'light', name: 'Light'},
      { data: 'dark', name: 'Dark'}
    ],
    selectedTheme: localStorage.sTheme || 'light'
  }),
  computed: {
    open: {
      get() {
        return this.value;
      },
      set(val) {
        this.$emit('input', val);
      }
    },
    themeCardClass() {
      let themeObj = {}
      for (var i = 0; i < this.themes.length; i++) {
        themeObj[this.themes[i].data] = this.getThemeClass(this.themes[i].data)
      }
      return themeObj;
    }
  },
  methods: {
    setTheme (theme) {
      localStorage.sTheme = theme;
      this.selectedTheme = theme;

      this.$vuetify.theme.dark = (theme === 'dark');
    },
    getThemeClass(theme) {
      let themeClass;

      if (theme === 'dark') {
        themeClass = 'themeCard--dark';
      }
      else {
        themeClass = 'themeCard--light';
      }

      if (theme === this.selectedTheme) {
        themeClass += ' themeCard--selected';
      }
      return themeClass;
    }
  }
}
</script>

<style scoped>
  .themeCard--light {
    border-color: #fafafa;
  }
  .themeCard--dark {
    border-color: #303030;
  }

  .themeCard .selectionRing {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 5;

    transition: opacity .2s ease-in-out;
    border: 5px solid rgb(141, 157, 243);
    opacity: 0;
  }
  .themeCard .selectionRing:hover {
    opacity: 0.45;
  }
  .themeCard--selected .selectionRing {
    opacity: 0.85 !important;
  }
</style>
