<template>
  <div>
    <div class="mb-4">
      <button
        type="button"
        class="btn btn-info btn-lg"
        v-on:click="startSSVEPTraining"
      >Start SSVEP Training</button>
      <b-form-group class="mt-1" label>
        <b-form-radio-group
          id="trLng"
          buttons
          button-variant="outline-secondary"
          v-model="training_length"
          :options="training_options"
          name="trainingsLength"
        />
      </b-form-group>
      <b-form-checkbox
        id="singleCheckbox"
        v-model="single"
        :value="true"
        :unchecked-value="false"
      >Single blinks</b-form-checkbox>
      <SSVEPPanel v-if="training_active" v-bind:single="single"></SSVEPPanel>
    </div>
    <div class="mb-4">
      <button
        type="button"
        class="btn btn-outline-info"
        v-on:click="trainSSVEP"
      >Train SSVEP Classifier</button>
    </div>
    <div class="float-left">Training Records (SSVEP Sessions):</div>
    <select class="form-control" size="6" v-model="selected_session">
      <option v-for="session in sessions" v-bind:key="session">{{ session }}</option>
    </select>
    <div class="mb-4 mt-4">
      <button
        type="button"
        class="btn btn-outline-info"
        v-on:click="testSSVEP"
      >Test SSVEP Classifier</button>
    </div>
    <div class="float-left">Trained Classifiers for SSVEP:</div>
    <select class="form-control" size="6" v-model="selected_ssvep_classifier">
      <option v-for="c in ssvep_classifier" v-bind:key="c">{{ c }}</option>
    </select>
    <button
      type="button"
      class="btn btn-outline-secondary btn-sm btn-block mt-2"
      v-on:click="loadFiles"
    >Refresh SSVEP Files</button>
    <div class="mt-4">
      <button type="button" class="btn btn-outline-success" v-on:click="liveSSVEP">Live SSVEP</button>
    </div>
    <SSVEPLive/>
    <b-modal ref="sessionNameModal" hide-footer title="Session Name">
      <div class="d-block text-center">
        <h3>Enter Session name:</h3>
        <b-form-input ref="sessionName" type="text" placeholder="Session name"/>
      </div>
      <b-button class="mt-3" variant="success" block @click="hideModal">Save</b-button>
    </b-modal>
  </div>
</template>

<script>
import SSVEPPanel from "./SSVEPPanel";
import SSVEPLive from "./SSVEPLive";
import { mapState, mapMutations, mapActions } from "vuex";
import { TRAINING_MSG } from "../store/store";

export default {
  name: "SSVEPTraining",

  components: { SSVEPPanel, SSVEPLive },

  data: () => {
    return {
      single: false,
      training_length: 33,
      training_options: [
        { text: "Short", value: 17 },
        { text: "Long", value: 33 }
      ],
      sessions: [],
      selected_session: ""
    };
  },

  mounted: function() {
    this.loadFiles();
  },

  computed: {
    ...mapState("Live", ["requested_controls", "live_active"]),
    ...mapState("Type", ["ssvep"]),
    ...mapState("Training", [
      "training_active",
      "current_symbol",
      "countdown",
      "ssvep_classifier",
      "selected_ssvep_classifier",
      "symbolcounter"
    ]),

    symbol_length() {
      return this.modes[this.mode];
    },

    selected_ssvep_classifier: {
      get() {
        return this.$store.state.Training.selected_ssvep_classifier;
      },
      set(classifier) {
        this.$store.commit("Training/setSelectedSsvepClassifier", classifier);
      }
    },

    ssvep_classifier: {
      get() {
        return this.$store.state.Training.ssvep_classifier;
      }
    }
  },

  watch: {
    countdown: function() {
      if (this.ssvep && this.countdown == "START") {
        this.runSymbol();
      }
    },
    requested_controls: function() {
      if (this.requested_controls && !this.training_active) {
        this.liveSSVEP();
        this.setRequested(false);
      }
    }
  },

  methods: {
    ...mapActions("Socket", ["postMessage"]),
    ...mapActions("Training", ["countDown"]),
    ...mapMutations("Controls", ["resetControls", "setFlashing"]),
    ...mapMutations("Training", [
      "setTraining",
      "setCurrentSymbol",
      "resetTraining",
      "setSsvepClassifier",
      "setSelectedSsvepClassifier",
      "increaseSymbolCounter"
    ]),

    ...mapMutations("Live", ["setLive", "setRequested"]),
    ...mapMutations("Type", ["setSSVEP"]),
    ...mapMutations("Timeouts", ["addTimeout"]),

    loadFiles: function() {
      this.postMessage({
        type: "files",
        message: JSON.stringify({ type: "ssvep" }),
        cb: (s, c) => {
          this.$data.sessions = s;
          this.setSsvepClassifier(c);
        }
      });
    },

    startSSVEPTraining() {
      // update training state
      this.setSSVEP(true);
      this.setTraining(true);
      // send training state update to ws
      var msg = {
        state: "start",
        msg: TRAINING_MSG,
        symbolLength: this.training_length,
        type: "ssvep"
      };
      this.postMessage({ type: "training", message: JSON.stringify(msg) });

      this.runTraining();
    },

    quitSession() {
      this.resetTraining();
      this.resetControls();
    },

    runTraining() {
      this.setCurrentSymbol(TRAINING_MSG[this.symbolcounter]);
      this.countDown();
    },

    runSymbol() {
      // send training state update to ws
      var msg = {
        state: "run",
        symbol: this.current_symbol,
        now: Date.now()
      };
      this.postMessage({ type: "training", message: JSON.stringify(msg) });

      //start display
      this.runSSVEP();
    },

    runSSVEP() {
      this.setFlashing(true);
      this.addTimeout(
        setTimeout(
          function() {
            // send training state update to ws
            var msg = {
              state: "pause",
              symbol: this.current_symbol,
              now: Date.now()
            };

            this.postMessage({
              type: "training",
              message: JSON.stringify(msg)
            });

            this.setFlashing(false);

            //check if all symbols from message are trained
            if (this.symbolcounter < TRAINING_MSG.length - 1) {
              // run training for next symbol
              this.increaseSymbolCounter();
              var current = TRAINING_MSG[this.symbolcounter];
              this.setCurrentSymbol(current);
              this.runTraining();
            } else {
              // end training
              this.postMessage({
                type: "training",
                message: JSON.stringify({ state: "end" })
              });
              this.$refs.sessionNameModal.show();
              /*
              this.addTimeout(
                setTimeout(
                  function() {
                    this.quitSession();
                  }.bind(this),
                  2000
                )
              );*/
            }
          }.bind(this),
          this.training_length * 1000
        )
      );
    },

    trainSSVEP() {
      // send train request to server
      var msg = {
        type: "ssvep",
        session: this.$data.selected_session
      };
      this.postMessage({
        type: "train_classifier",
        message: JSON.stringify(msg)
      });
    },

    testSSVEP() {
      // send test request to server
      var msg = {
        type: "ssvep",
        session: this.$data.selected_session,
        classifier: this.selected_ssvep_classifier
      };
      this.postMessage({
        type: "test_classifier",
        message: JSON.stringify(msg)
      });
    },

    getLastClassifier() {
      // if no classifiers, load automatically and check if then classifiers available
      if (this.ssvep_classifier.length > 0) {
        return this.ssvep_classifier[this.ssvep_classifier.length - 1];
      }
      return "";
    },

    liveSSVEP() {
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
        this.toggleUI();
      }
    },
    toggleUI() {
      if (!this.live_active) {
        this.setLive(true);
      } else {
        this.setLive(false);
        var msg = {
          type: "live"
        };
        this.postMessage({
          type: "quit",
          message: JSON.stringify(msg)
        });
      }
    },
    hideModal() {
      const name = this.$refs.sessionName.$el.value;
      if (name !== "") {
        this.$refs.sessionNameModal.hide();
        this.postMessage({
          type: "training",
          message: JSON.stringify({ state: "rename", name })
        });
        this.quitSession();
      }
    }
  }
};
</script>

    