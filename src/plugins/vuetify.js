import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';
import * as constants from '../constants';

Vue.use(Vuetify);

export default new Vuetify({
  breakpoint: {
    mobileBreakpoint: 'sm'
  },
  theme: {
    themes: {
      light: {
        primary: constants.themeColor,
        /* secondary: '#424242',
        accent: '#82B1FF',
        error: '#FF5252',
        info: '#2196F3',
        success: '#4CAF50',
        warning: '#FFC107' */
      },
      dark: {
        primary: constants.themeColor
      }
    },
  },
});
