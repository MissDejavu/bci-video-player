<template>
  <div>
    <div class="mb-4">
      <button
        type="button"
        class="btn btn-info btn-lg"
        v-on:click="startERPTraining"
      >Start ERP Session</button>
      <ERPPanel/>
    </div>
    <div class="mb-4">
      <button type="button" class="btn btn-outline-info" v-on:click="trainERP">Train ERP Classifier</button>
    </div>
    <div class="float-left">Training Records (ERP Sessions):</div>
    <select class="form-control" size="6" v-model="selected_session">
      <option v-for="session in sessions" v-bind:key="session">{{ session }}</option>
    </select>
    <div class="mt-4 mb-4">
      <button type="button" class="btn btn-outline-info" v-on:click="testERP">Test ERP Classifier</button>
    </div>
    <div class="float-left">Trained Classifiers for ERP:</div>
    <select class="form-control" size="4" v-model="selected_erp_classifier">
      <option v-for="c in erp_classifier" v-bind:key="c">{{ c }}</option>
    </select>
    <button
      type="button"
      class="btn btn-outline-secondary btn-sm btn-block mt-2"
      v-on:click="loadFiles"
    >Refresh ERP Files</button>
    <div class="mt-4">
      <button type="button" class="btn btn-outline-success" v-on:click="liveERP">Live ERP</button>
    </div>
  </div>
</template>


<script>
import ERPPanel from "./ERPPanel";
import { mapState, mapMutations, mapActions } from "vuex";
import { COLORS, ALPHABET, TRAINING_MSG } from "../store/store";
import { getRndInteger, shuffleArray } from "../helpers";

const ERP_MATRIX_SIZE = { rows: 4, cols: 5 };
const ERP_TRAINING_COUNT = 180;
const INTERVALL = 250;

export default {
  name: "ERPTraining",

  components: { ERPPanel },

  data: () => {
    return {
      sessions: [],
      selected_session: "",
      shuffled_matrixes: [],
      shuffled_commands: [],
      initMatrix: [],
      runcounter: 0
    };
  },

  mounted: function() {
    this.loadFiles();
  },

  computed: {
    ...mapState("Controls", ["erp", "commands", "erp_matrix"]),
    ...mapState("Training", [
      "current_symbol",
      "countdown",
      "selected_erp_classifier",
      "erp_classifier",
      "symbolcounter"
    ])
  },

  watch: {
    countdown: function() {
      if (this.erp && this.countdown == "START") {
        this.runSymbol();
      }
    }
  },

  methods: {
    ...mapActions("Socket", ["postMessage"]),
    ...mapActions("Training", ["countDown"]),
    ...mapMutations("Training", [
      "setTraining",
      "setCurrentSymbol",
      "resetTraining",
      "increaseSymbolCounter"
    ]),
    ...mapMutations("Controls", [
      "setERP",
      "setCommand",
      "resetControls",
      "setErpMatrix"
    ]),

    ...mapMutations("Training", ["setErpClassifier"]),
    ...mapMutations("Timeouts", ["addTimeout"]),
    loadFiles: function() {
      this.postMessage({
        type: "files",
        message: JSON.stringify({ type: "erp" }),
        cb: (s, c) => {
          this.$data.sessions = s;
          this.setErpClassifier(c);
        }
      });
    },

    quitSession() {
      // TODO
    },

    reset() {
      this.$data.shuffled_matrixes = [];
      this.$data.shuffled_commands = [];
      this.setErpMatrix([]);
      this.$data.initMatrix = [];
      this.$data.runcounter = 0;
      this.resetTraining();
    },

    trainERP: function() {
      // send train erp request to server
      var msg = {
        type: "erp",
        session: this.$data.selected_session
      };
      this.postMessage({
        type: "train_classifier",
        message: JSON.stringify(msg)
      });
    },

    testERP() {
      // send test request to server
      var msg = {
        type: "erp",
        session: this.$data.selected_session,
        classifier: this.selected_erp_classifier
      };
      this.postMessage({
        type: "test_classifier",
        message: JSON.stringify(msg)
      });
    },

    //start Training Session for ERP
    startERPTraining() {
      //init matrix
      this.initERPMatrix();
      // update training state
      this.setERP(true);
      this.setTraining(true);
      // send training state update to ws
      var msg = {
        state: "start",
        msg: TRAINING_MSG,
        symbolLength: (ERP_TRAINING_COUNT * INTERVALL) / 1000,
        type: "erp"
      };
      this.postMessage({ type: "training", message: JSON.stringify(msg) });
      this.runTraining();
    },

    runTraining() {
      var current = TRAINING_MSG[this.symbolcounter];
      this.setCurrentSymbol(current);
      this.countDown();
    },

    runSymbol() {
      this.createShuffledMatrixes();

      // send training state update to ws
      var msg = {
        state: "run",
        symbol: this.current_symbol,
        now: Date.now()
      };
      this.postMessage({ type: "training", message: JSON.stringify(msg) });

      //start display
      this.runERP();
    },

    runERP() {
      //reset counter
      if (this.$data.runcounter == Number.MAX_SAFE_INTEGER) {
        this.$data.runcounter = 0;
      }
      this.addTimeout(
        setTimeout(
          function() {
            if (this.$data.runcounter < ERP_TRAINING_COUNT) {
              this.randomBlink();

              this.$data.runcounter++;
              this.runERP();
            } else {
              this.$data.runcounter = Number.MAX_SAFE_INTEGER;

              //check if all symbols from message are trained
              if (this.symbolcounter < TRAINING_MSG.length - 1) {
                // run training for next symbol
                this.increaseSymbolCounter();
                var current = TRAINING_MSG[this.symbolcounter];
                this.setCurrentSymbol(current);
                this.runTraining();
              } else {
                // end training
                this.addTimeout(
                  setTimeout(
                    function() {
                      this.postMessage({
                        type: "training",
                        message: JSON.stringify({ state: "end" })
                      });
                      this.quitSession();
                    }.bind(this),
                    2000
                  )
                );
              }
            }
          }.bind(this),
          INTERVALL
        )
      );
    },

    randomBlink() {
      this.setErpMatrix(this.$data.shuffled_matrixes[this.$data.runcounter]);

      var command = this.$data.shuffled_commands[this.$data.runcounter];
      this.setCommand(command);

      // send data with timestamp
      var msg = {
        state: "data",
        symbol: command,
        now: Date.now()
      };
      this.postMessage({ type: "training", message: JSON.stringify(msg) });
    },

    //create empty/default matrix for erp stimulation
    initERPMatrix() {
      if (this.erp_matrix.length > 0) {
        return;
      }
      var matrix = [];
      for (let i = 0; i < ERP_MATRIX_SIZE.rows; i++) {
        var row = [];
        for (let j = 0; j < ERP_MATRIX_SIZE.cols; j++) {
          row.push({ command: null, active: false, color: "" });
        }
        matrix.push(row);
      }
      var counter = 0;
      for (let i = 0; i < ERP_MATRIX_SIZE.rows; i = i + 2) {
        for (let j = 0; j < ERP_MATRIX_SIZE.cols; j = j + 2) {
          if (counter < ALPHABET.length) {
            matrix[i][j].command = ALPHABET[counter];
            counter++;
          }
        }
      }
      this.$data.initMatrix = JSON.parse(JSON.stringify(matrix));
      this.setErpMatrix(matrix);
    },

    createShuffledMatrixes() {
      //get random command blink
      var commands = ALPHABET.split("");
      this.$data.shuffled_matrixes = [];
      this.$data.shuffled_commands = [];
      while (this.$data.shuffled_commands.length < ERP_TRAINING_COUNT) {
        var shuffled = shuffleArray(commands);
        //avoid same command directly after
        if (
          shuffled[0] ==
          this.$data.shuffled_commands[this.$data.shuffled_commands.length - 1]
        ) {
          var tmp = shuffled[0];
          shuffled[0] = shuffled[1];
          shuffled[1] = tmp;
        }
        this.$data.shuffled_commands = this.$data.shuffled_commands.concat(
          shuffled
        );
      }
      this.$data.shuffled_commands = this.$data.shuffled_commands.slice(
        0,
        ERP_TRAINING_COUNT
      );
      //get random fake blinks
      var random_fakes = []; // array of fake blink matrixes
      var fake_indexes = [];
      var size = ERP_MATRIX_SIZE.cols * ERP_MATRIX_SIZE.rows;
      for (let i = 0; i < size; i++) {
        if (
          !this.erp_matrix[parseInt(i / ERP_MATRIX_SIZE.cols, 10)][
            i % ERP_MATRIX_SIZE.cols
          ].command
        ) {
          fake_indexes.push(i);
        }
      }
      for (let i = 0; i < ERP_TRAINING_COUNT; i++) {
        var tmp_fakes = fake_indexes.slice(0, fake_indexes.length);
        var fake_blinks = []; // fake blinks per one matrix
        for (let j = 0; j < parseInt(size / commands.length, 10); j++) {
          var new_fake = tmp_fakes[getRndInteger(0, tmp_fakes.length - 1)];
          fake_blinks.push(new_fake);
          tmp_fakes.splice(tmp_fakes.indexOf(new_fake), 1);
        }
        random_fakes.push(fake_blinks);
      }

      //set command blinks, fake blinks and colors for each object in matrix
      var shuffledMatrix = [];
      var matrix_count = 0;

      while (matrix_count < ERP_TRAINING_COUNT) {
        var new_matrix = JSON.parse(JSON.stringify(this.$data.initMatrix));

        //set command blinks+color
        for (let i = 0; i < ERP_MATRIX_SIZE.rows; i++) {
          for (let j = 0; j < ERP_MATRIX_SIZE.cols; j++) {
            if (
              new_matrix[i][j].command ==
              this.$data.shuffled_commands[matrix_count]
            ) {
              new_matrix[i][j].active = true;
              new_matrix[i][j].color =
                COLORS[getRndInteger(0, COLORS.length - 1)];
            }
          }
        }
        //set fake blinks+color
        for (let i = 0; i < random_fakes[matrix_count].length; i++) {
          var index = random_fakes[matrix_count][i];
          new_matrix[parseInt(index / ERP_MATRIX_SIZE.cols, 10)][
            index % ERP_MATRIX_SIZE.cols
          ].active = true;
          new_matrix[parseInt(index / ERP_MATRIX_SIZE.cols, 10)][
            index % ERP_MATRIX_SIZE.cols
          ].color = COLORS[getRndInteger(0, COLORS.length - 1)];
        }
        shuffledMatrix.push(new_matrix);
        matrix_count++;
      }

      this.$data.shuffled_matrixes = shuffledMatrix;
    },

    // changeERPMatrix(matrix) {
    //   for (let i = 0; i < ERP_MATRIX_SIZE.rows; i++) {
    //     for (let j = 0; j < ERP_MATRIX_SIZE.cols; j++) {
    //       this.$data.erpMatrix[i][j].active = matrix[i][j].active;
    //       this.$data.erpMatrix[i][j].color = matrix[i][j].color;
    //     }
    //   }
    // },

    liveERP() {
      // TODO
    }
  }
};
</script>