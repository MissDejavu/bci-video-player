<template>
  <div class="ml-5 mr-5 mt-2">
    <div class="row">
      <div class="col-3">
        <Connection/>
      </div>
      <div>
        <div class="v-line mr-4"></div>
      </div>
      <div class="col-6 mr-4">
        <Training/>
      </div>
      <div>
        <div class="v-line mr-4"></div>
      </div>
      <div class="col-2">
        <Start/>
      </div>
    </div>
  </div>
</template>

<script>
import Connection from "./Connection.vue";
import Training from "./Training.vue";
import Start from "./Start.vue";

export default {
  name: "Settings",
  components: { Connection, Training, Start }
};
</script>
