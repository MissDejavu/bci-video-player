<template>
  <div class="container mt-5">
    <div class="row">
      <div class="ssvep-bg top-left" v-bind:class="[last_command=='B' ? 'bg-green' : '']">
        <div class="row">
          <div class="box">
            <canvas ref="canvas-0" class="background"></canvas>
          </div>
          <div>
            <font-awesome-icon icon="angle-up" size="5x" class="symbol"/>
          </div>
          <div>
            <button
              type="button"
              class="btn btn-outline-secondary ml-4"
              v-on:click="setCommand('B')"
            >Up</button>
          </div>
        </div>
      </div>
      <div class="ssvep-bg bottom-left" v-bind:class="[last_command=='U' ? 'bg-green' : '']">
        <div class="row">
          <div class="box">
            <canvas ref="canvas-2" class="background"></canvas>
          </div>
          <div>
            <font-awesome-icon icon="angle-down" size="5x" class="symbol"/>
          </div>
          <div>
            <button
              type="button"
              class="btn btn-outline-secondary ml-1"
              v-on:click="setCommand('U')"
            >Down</button>
          </div>
        </div>
      </div>
      <div class="ssvep-bg top-right" v-bind:class="[last_command=='S' ? 'bg-green' : '']">
        <div class="row">
          <div class="box">
            <canvas ref="canvas-1" class="background"></canvas>
          </div>
          <div>
            <font-awesome-icon icon="times" size="5x" class="symbol"/>
          </div>
          <div>
            <button
              type="button"
              class="btn btn-outline-secondary"
              v-on:click="setCommand('S')"
            >Close</button>
          </div>
        </div>
      </div>
      <div class="ssvep-bg bottom-right" v-bind:class="[last_command=='C' ? 'bg-green' : '']">
        <div class="row">
          <div class="box">
            <canvas ref="canvas-3" class="background"></canvas>
          </div>
          <div>
            <font-awesome-icon icon="play" size="4x" class="symbol"/>
          </div>
          <div>
            <button
              type="button"
              class="btn btn-outline-secondary ml-2"
              v-on:click="setCommand('C')"
            >Play</button>
          </div>
        </div>
      </div>
    </div>
    <Playlist/>
  </div>
</template>

<script>
import Playlist from "./Playlist";
import { mapState, mapActions, mapMutations } from "vuex";

function draw(context, color, w, h) {
  context.fillStyle = color;
  context.fillRect(0, 0, w, h);
}

let colors = ["black", "white"];
let margin = 5;
let running = false;
let blinkies;

function run(timestamp) {
  let blinky = null;
  for (let i = 0; i < blinkies.length; i += 1) {
    blinky = blinkies[i];

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
      colors[0],
      blinkies[i].canvas.width,
      blinkies[i].canvas.height
    );
  }
}

export default {
  name: "SSVEPVideos",
  components: { Playlist },
  data: () => {
    return {
      frequencies: [6.66667, 8.57, 12, 15]
    };
  },
  computed: {
    ...mapState("Live", ["live_active", "last_command"]),
    ...mapState("Training", ["selected_ssvep_classifier"])
  },

  watch: {
    last_command: function() {
      switch (this.last_command) {
        case "B":
          this.rotateUp();
          break;
        case "U":
          this.rotateDown();
          break;
        case "S":
          this.close();
          break;
        case "C":
          this.play();
          break;
      }
    }
  },

  methods: {
    ...mapActions("Socket", ["postMessage"]),
    ...mapMutations("Videos", ["rotateUp", "rotateDown", "selectIndex"]),
    ...mapMutations("Live", ["resetLive", "setRequested"]),
    ...mapMutations("Controls", ["resetControls"]),
    ...mapActions("Live", ["setNewCommand"]),

    close() {
      this.endAnalysis();
      this.$router.push("/settings");
      this.resetControls();
      this.resetLive();
      this.setRequested(false);
    },

    play() {
      this.endAnalysis();
      this.resetControls();
      this.resetLive();
      this.setRequested(false);
      this.$router.push("/videos/video");
    },

    endAnalysis() {
      // send test request to server
      var msg = {
        type: "live"
      };
      this.postMessage({
        type: "quit",
        message: JSON.stringify(msg)
      });
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
      switch (freq) {
        case 6.66667:
          frames = 9;
          break;
        case 7.5:
          frames = 8;
          break;
        case 8.57:
          frames = 7;
          break;
        case 10:
          frames = 6;
          break;
        case 12:
          frames = 5;
          break;
        case 15:
          frames = 4;
          break;
        default:
          frames = 4;
          break;
      }

      const white_frames = parseInt(frames / 2);

      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      blinkies.push({
        white_frames,
        freq,
        ms,
        canvas,
        context,
        last: performance.now(),
        state: 0
      });
    }

    running = true;
    requestAnimationFrame(run);
  },

  beforeDestroy() {
    running = false;
  }
};
</script>





