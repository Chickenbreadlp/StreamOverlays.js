<template>
  <v-row>
    <v-col cols="12">
      <v-btn
          @click="dummy()"
      >
        Generate Config File
      </v-btn>
    </v-col>
    <v-col cols="12">
      <hello-world />
    </v-col>
  </v-row>
</template>

<script>
  import HelloWorld from '../components/HelloWorld'

  export default {
    name: 'Home',

    components: {
      HelloWorld,
    },

    methods: {
      dummy() {
        window.ipc.send('config', {
          cmd: 'generateFile'
        });
      }
    }
  }
</script>
