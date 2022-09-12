<template>
  <div v-if="erp" class="control-panel">
    <div class="container">
      <div class="row">
        <div v-if="training_active" class="col-11 trainingMessage">
          <p>Concentrate on symbol: {{ current_symbol }}</p>
          <p>Get ready... {{countdown}}</p>
        </div>

        <!-- TODO
        </div>-->
        <div v-if="live_active" class="col-11 notification">
          <p>Last Command: {{ last_command }}</p>
        </div>
        <!--  <div class="col-1 mt-4">
              <button type="button" class="btn btn-danger" v-on:click="quitSession">Quit Session</button>
        </div>-->
      </div>
    </div>
    <div class="container-fluid controls-canvas-erp">
      <div class="row">
        <div class="mx-auto">
          <div v-for="(row, index) in erp_matrix" v-bind:key="index" class="row">
            <div v-for="(box, ci) in row" v-bind:key="ci" class="box commandSymbol">
              <div class="background" v-bind:class="[{blink: box.active}, box.color]"></div>
              {{ box.command }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
import { mapState } from "vuex";

export default {
  name: "ERPPanel",

  data: () => {
    return {};
  },

  computed: {
    ...mapState("Controls", ["erp", "erp_matrix"]),
    ...mapState("Training", ["training_active", "current_symbol", "countdown"]),
    ...mapState("Live", ["live_active", "last_command"])
  },

  methods: {
    quitSession() {
      //TODO
    }
  }
};
</script>
