<template>
  <div>
    <h2 class="mb-4">Connection</h2>

    <button type="button" class="btn btn-warning btn-lg" v-on:click="connect">Connect</button>
    <p
      class="text-left mt-2 text-danger"
    >Make sure your headset is connected and you are logged in at CortexUI before you connect!</p>

    <div>
      <h4 class="mt-4 mb-4">Server Message:</h4>
      <p>{{ messages[messages.length-1] }}</p>
    </div>
    <hr>
    <div class="mt-4">
      <h4>Cortext Threshold:</h4>
      <b-form-input
        class="custom-range"
        type="range"
        id="range-1"
        v-model="threshold"
        min="0"
        max="1"
        step="0.1"
        v-on:change="setThreshold"
      />
      <div class="mt-2">Value: {{ threshold }}</div>
    </div>

    <div class="toggle">
      <b-form-checkbox
        switch
        v-model="live_mi"
        name="check-button"
        class="custom-switch"
        v-on:change="toggle_live_mi"
      >Enable live MI</b-form-checkbox>
    </div>

    <hr>
    <div class="mt-4">
      <h4>NN Threshold:</h4>
      <b-form-input
        class="custom-range"
        type="range"
        id="range-1"
        v-model="nnThreshold"
        min="0"
        max="1"
        step="0.1"
        v-on:change="setNNThreshold"
      />
      <div class="mt-2">Value: {{ nnThreshold }}</div>
    </div>
    <hr>
    <b-form-group class="mt-1" label>
      <b-form-radio-group
        id="classification"
        buttons
        button-variant="outline-secondary"
        v-model="classification_type"
        :options="classification_options"
        name="classificationOptions"
        v-on:change="setClassification"
      />
    </b-form-group>
  </div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import { ALPHABET, SIZE } from "../store/store";

export default {
  name: "Connection",
  data: () => {
    return {
      classification_type: "classifier",
      classification_options: [
        { text: "Custom Neural Network", value: "nn" },
        { text: "Standard Classification", value: "classifier" }
      ],
      threshold: 0.7,
      nnThreshold: 0.5,
      live_mi: false,
      selected_type: "",
      type_options: [
        { value: "erp", text: "ERP" },
        { value: "ssvep", text: "SSVEP" }
      ]
    };
  },

  mounted: function() {
    this.initControls();
  },

  computed: {
    ...mapState("Socket", ["messages"])
  },

  methods: {
    ...mapActions("Socket", ["postMessage"]),

    initControls: function() {
      this.postMessage({
        type: "init",
        message: JSON.stringify({ alphabet: ALPHABET, size: SIZE })
      });
    },
    connect: function() {
      this.postMessage({ type: "ready", message: "Ready to connect...!" });
    },
    setThreshold: function() {
      this.postMessage({ type: "threshold", message: this.threshold });
    },
    toggle_live_mi: function(value) {
      this.postMessage({ type: "live_mi", message: value });
    },
    setNNThreshold: function() {
      this.postMessage({ type: "nnThreshold", message: this.nnThreshold });
    },
    setClassification: function(value) {
      this.postMessage({ type: "classification", message: value });
    }
  }
};
</script>
