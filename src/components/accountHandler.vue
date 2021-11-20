<template>
  <v-row
    v-if="user[keys.username]"
    class="my-0"
  >
    <v-col cols="12">
      <v-row>
        <v-spacer />
        <v-col cols="auto" class="text-right pt-4">
          <v-avatar size="80">
            <img alt="Profile Picture" :src="user[keys.pfp]">
          </v-avatar>
        </v-col>
        <v-col cols="auto" class="pl-0" align-self="center">
          <div class="text-h6">{{ user[keys.username] }}</div>
          <div v-if="user.broadcaster_type" class="caption text-capitalize mt-n1">{{ user.broadcaster_type }}</div>
        </v-col>
        <v-spacer />
      </v-row>
    </v-col>
    <v-col cols="12">
      <v-row>
        <v-spacer />
        <v-col cols="auto">
          <v-btn
            color="primary"
            @click="$emit('logout')"
          >
            Logout
          </v-btn>
        </v-col>
        <v-spacer />
      </v-row>
    </v-col>
  </v-row>
  <v-row
    v-else
    class="ma-0"
  >
    <v-spacer />
    <v-col cols="auto">
      <v-btn
        color="primary"
        @click="$emit('login')"
      >
        Login
      </v-btn>
    </v-col>
    <v-spacer />
  </v-row>
</template>

<script>
export default {
  name: "accountHandler",
  props: {
    service: {
      type: String,
      required: true
    },
    channel: {
      type: String,
      required: true
    }
  },
  computed: {
    user() {
      return this.$store.state[this.service][this.channel].userInfo
    },
    keys() {
      return this.$serviceKeys[this.service];
    }
  }
}
</script>

<style scoped>

</style>