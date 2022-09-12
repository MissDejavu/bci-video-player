
<template>
  <!-- WEIßES FLICKERN -->
  <div class="control-panel">
    <div class="container-fluid">
      <div v-if="training_active" class="c-center ssvep-training">
        <div class="row">
          <div class="ml-5 mr-5">
            <p>Concentrate on symbol:</p>
            <p>Get ready... {{countdown}}</p>
          </div>
          <div>
            <font-awesome-icon :icon="icons[current_symbol]" size="2x" class="symbol"/>
          </div>
        </div>
      </div>

      <div class="ssvep-bg top-left" v-bind:class="[last_command=='B' ? 'bg-green' : '']">
        <div class="row">
          <div class="box">
            <canvas ref="canvas-0" class="background"></canvas>
          </div>
          <div>
            <font-awesome-icon icon="backward" size="4x" class="symbol"/>
          </div>
          <div>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary top-left ml-1"
              v-on:click="setCommand('B')"
            >Backwards</button>
          </div>
        </div>
      </div>

      <div class="ssvep-bg top-center" v-bind:class="[last_command=='F' ? 'bg-green' : '']">
        <div class="row">
          <div class="box">
            <canvas ref="canvas-1" class="background"></canvas>
          </div>
          <div>
            <font-awesome-icon icon="forward" size="4x" class="symbol"/>
          </div>
          <div>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary top-center ml-1"
              v-on:click="setCommand('F')"
            >Forwards</button>
          </div>
        </div>
      </div>

      <div class="ssvep-bg top-right" v-bind:class="[last_command=='S' ? 'bg-green' : '']">
        <div class="row">
          <div class="box">
            <canvas ref="canvas-2" class="background"></canvas>
          </div>

          <div>
            <font-awesome-icon icon="times" size="5x" class="symbol"/>
          </div>
          <div>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary top-right mr-1"
              v-on:click="setCommand('S')"
            >Quit</button>
          </div>
        </div>
      </div>

      <div class="ssvep-bg bottom-left" v-bind:class="[last_command=='D' ? 'bg-green' : '']">
        <div class="row">
          <div class="box">
            <canvas ref="canvas-3" class="background"></canvas>
          </div>
          <div>
            <font-awesome-icon icon="volume-down" size="5x" class="symbol"/>
          </div>
          <div>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary bottom-left ml-1"
              v-on:click="setCommand('D')"
            >Volume down</button>
          </div>
        </div>
      </div>

      <div class="ssvep-bg bottom-center" v-bind:class="[last_command=='U' ? 'bg-green' : '']">
        <div class="row">
          <div class="box">
            <canvas ref="canvas-4" class="background"></canvas>
          </div>
          <div>
            <font-awesome-icon icon="volume-up" size="4x" class="symbol"/>
          </div>
          <div>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary bottom-center ml-1"
              v-on:click="setCommand('U')"
            >Volume up</button>
          </div>
        </div>
      </div>

      <div class="center-right">
        <button type="button" class="btn btn-outline-danger" v-on:click="quit">Close UI</button>
      </div>

      <div class="ssvep-bg bottom-right" v-bind:class="[last_command=='C' ? 'bg-green' : '']">
        <div class="row">
          <div class="box">
            <canvas ref="canvas-5" class="background"></canvas>
          </div>
          <div>
            <font-awesome-icon icon="play" size="3x" class="symbol mr-2"/>
            <font-awesome-icon icon="pause" size="3x" class="symbol"/>
          </div>
          <div>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary bottom-right mr-1"
              v-on:click="setCommand('C')"
            >Play/Pause</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
     

<script>
import { mapState, mapMutations, mapActions } from "vuex";
import { ALPHABET } from "../store/store";

function draw(context, color, w, h) {
  context.fillStyle = color;
  context.fillRect(0, 0, w, h);
}

let curr_symbol = null;
let colors = ["black", "red"]; // change flicker color here
let margin = 5;
let running = false;
let blinkies;

function run(timestamp) {
  let blinky = null;
  for (let i = 0; i < blinkies.length; i += 1) {
    blinky = blinkies[i];

    if (curr_symbol !== null && curr_symbol !== blinky.symbol) {
      continue;
    }

    const diff = timestamp - blinky.last;
    if (blinky.state === blinky.white_frames) {
      blinky.state = 0;
      draw(
        blinky.context,
        colors[0],
        blinky.canvas.width,
        blinky.canvas.height
      );
      continue;
    }

    if (blinky.state > 0) {
      blinky.state += 1;
      continue;
    }

    if (diff + margin >= blinky.ms) {
      blinky.last = timestamp;
      blinky.state = 1;
      draw(
        blinky.context,
        colors[blinky.state],
        blinky.canvas.width,
        blinky.canvas.height
      );
    }
  }

  if (running) {
    requestAnimationFrame(run);
    return;
  }

  for (let i = 0; i < blinkies.length; i += 1) {
    draw(
      blinkies[i].context,
      colors[1],
      blinkies[i].canvas.width,
      blinkies[i].canvas.height
    );
  }
}

export default {
  name: "SSVEPPanel",
  props: {
    single: {
      type: Boolean,
      default: false
    }
  },

  data: () => {
    return {
      alphabet: ALPHABET,
      icons: {
        B: "backward",
        F: "forward",
        S: "times",
        D: "volume-down",
        U: "volume-up",
        C: "pause",
        X: "spinner"
      },
      frequencies: [6.66667, 7.5, 8.57, 10, 12, 15]
    };
  },

  computed: {
    ...mapState("Controls", ["commands", "flashing"]),
    ...mapState("Training", ["training_active", "current_symbol", "countdown"]),
    ...mapState("Live", [
      "live_active",
      "last_command",
      "symbol",
      "requested_controls"
    ])
  },

  watch: {
    flashing: function() {
      running = this.flashing;
      if (running) {
        if (this.single) {
          curr_symbol = this.current_symbol;
        }
        requestAnimationFrame(run);
      }
    },
    requested_controls: function() {
      if (this.requested_controls && !this.training_active) {
        this.quit();
        this.setRequested(false);
      }
    }
  },

  methods: {
    ...mapActions("Socket", ["postMessage"]),
    ...mapActions("Live", ["setNewCommand"]),
    ...mapMutations("Controls", ["resetControls"]),
    ...mapMutations("Live", ["resetLive", "setRequested"]),
    ...mapMutations("Training", ["resetTraining"]),
    ...mapMutations("Timeouts", ["killTimeouts"]),

    quit() {
      // send test request to server
      var t = "live";
      if (this.training_active) {
        t = "training";
      }
      var msg = {
        type: t
      };
      this.postMessage({
        type: "quit",
        message: JSON.stringify(msg)
      });
      this.resetControls();
      this.resetLive();
      this.resetTraining();
      this.killTimeouts();
    },
    setCommand(command) {
      this.setNewCommand(command);
    }
  },

  mounted() {
    blinkies = [];
    for (let i = 0; i < this.frequencies.length; i += 1) {
      const canvas = this.$refs["canvas-" + i];
      const context = canvas.getContext("2d");
      const freq = this.frequencies[i];
      const ms = 1000 / freq;
      let frames = 0;
      let symbol;

      switch (freq) {
        case 6.66667:
          frames = 9;
          symbol = "B";
          break;
        case 7.5:
          frames = 8;
          symbol = "F";
          break;
        case 8.57:
          frames = 7;
          symbol = "S";
          break;
        case 10:
          frames = 6;
          symbol = "D";
          break;
        case 12:
          frames = 5;
          symbol = "U";
          break;
        case 15:
          frames = 4;
          symbol = "C";
          break;
        default:
          frames = 4;
          symbol = "X";
          break;
      }

      const white_frames = parseInt(frames / 2);

      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      blinkies.push({
        symbol,
        white_frames,
        freq,
        ms,
        canvas,
        context,
        last: performance.now(),
        state: 0
      });
    }

    for (let i = 0; i < blinkies.length; i += 1) {
      draw(
        blinkies[i].context,
        colors[1],
        blinkies[i].canvas.width,
        blinkies[i].canvas.height
      );
    }

    if (this.flashing) {
      running = true;
      requestAnimationFrame(run);
    }
  },

  beforeDestroy() {
    curr_symbol = null;
    running = false;
  }
};
</script>

    