<template>
  <div>
    <SSVEPPanel v-if="live_active"></SSVEPPanel>
  </div>
</template>

<script>
import SSVEPPanel from "./SSVEPPanel";
import { mapState, mapActions, mapMutations } from "vuex";

export default {
  name: "SSVEPLive",

  components: { SSVEPPanel },

  data: () => {
    return {};
  },

  computed: {
    ...mapState("Live", ["live_active"]),
    ...mapState("Training", ["selected_ssvep_classifier"])
  },

  watch: {
    live_active: function() {
      if (this.live_active) {
        this.setSSVEP(true);
        this.setFlashing(true);
        // send live state update to ws
        var msg = {
          state: "start",
          type: "ssvep",
          classifier: this.selected_ssvep_classifier,
          now: Date.now()
        };
        this.postMessage({ type: "live", message: JSON.stringify(msg) });
      }
    }
  },

  methods: {
    ...mapActions("Socket", ["postMessage"]),
    ...mapMutations("Controls", ["setFlashing"]),
    ...mapMutations("Type", ["setSSVEP"])
  }
};
</script>
