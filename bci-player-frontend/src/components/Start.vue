<template>
  <div>
    <h3 class="mb-4">Ready?</h3>
    <div class="mt-4">
      <p>Please choose control type and a matching classifier.</p>

      <b>Control type</b>
      <b-form-select v-model="selected_type" :options="type_options" class="mb-4"/>
    </div>
    <div>
      <button type="button" class="btn btn-success btn-lg" v-on:click="start">Start</button>
    </div>
  </div>
</template>

<script>
import { mapState, mapMutations, mapActions } from "vuex";
export default {
  name: "Start",
  data: () => {
    return {
      selected_type: "ssvep",
      type_options: [
        { value: "ssvep", text: "SSVEP" },
        { value: "erp", text: "ERP" }
      ]
    };
  },

  computed: {
    ...mapState("Training", ["selected_ssvep_classifier", "ssvep_classifier"])
  },

  methods: {
    ...mapMutations("Training", ["setSelectedSsvepClassifier"]),
    ...mapMutations("Controls", ["setFlashing"]),
    ...mapMutations("Live", ["setLive"]),
    ...mapActions("Socket", ["postMessage"]),

    getLastClassifier() {
      if (this.ssvep_classifier.length > 0) {
        return this.ssvep_classifier[this.ssvep_classifier.length - 1];
      }
      return "";
    },

    start() {
      var classifier =
        this.selected_ssvep_classifier == "" ||
        this.selected_ssvep_classifier == undefined
          ? this.getLastClassifier()
          : this.selected_ssvep_classifier;
      if (classifier == undefined || classifier == "") {
        alert(
          "No classifier found. Try refreshing files or train a new classifier."
        );
      } else {
        this.setSelectedSsvepClassifier(classifier);
        this.$router.push("/ssvepvideos");
        this.setLive(true);
        // send training state update to ws
        var msg = {
          state: "start",
          type: "ssvep",
          classifier: this.selected_ssvep_classifier,
          now: Date.now()
        };
        this.postMessage({ type: "live", message: JSON.stringify(msg) });
      }
    }
  }
};
</script>
