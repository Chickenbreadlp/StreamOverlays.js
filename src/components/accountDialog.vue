<template>
  <v-dialog
    v-model="open"
  >
    <v-card>
      <v-card-title>
        Test
      </v-card-title>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "accountDialog",
  props: {
    value: {
      type: Boolean,
      required: true
    }
  },
  computed: {
    open: {
      get() {
        return this.value;
      },
      set(value) {
        this.$emit('input', value);
      }
    }
  }
}
</script>

<style scoped>

</style>