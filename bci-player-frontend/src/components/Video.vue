<template>
  <div class="container-video">
    <videoPlayer ref="videoPlayer" :options="playerOptions"></videoPlayer>
    <div class="buttons">
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary top-right"
        v-on:click="toggleUI"
      >Toggle UI</button>
    </div>
    <SSVEPLive/>
  </div>
</template>

<script>
import { mapState, mapMutations, mapActions } from "vuex";
import SSVEPLive from "./SSVEPLive";

export default {
  name: "Video",
  components: { SSVEPLive },
  data: () => {
    return {};
  },

  computed: {
    ...mapState("Training", ["selected_ssvep_classifier"]),
    ...mapState("Videos", ["links", "selectIndex"]),
    ...mapState("Live", ["live_active", "last_command", "requested_controls"]),

    player() {
      return this.$refs.videoPlayer.player;
    },
    playerOptions() {
      return {
        fluid: false,
        autoplay: true,
        techOrder: ["youtube"],
        controls: 1,
        inactivityTimeout: 0,
        controlBar: {
          playToggle: true,
          volumePanel: true,
          currentTimeDisplay: true,
          durationDisplay: true,
          progressControl: true,
          remainingTimeDisplay: false,
          playbackRateMenuButton: false,
          chaptersButton: false,
          descriptionsButton: false,
          subsCapsButton: false,
          audioTrackButton: false,
          fullscreenToggle: false
        },
        class: "vjs-default-skin vjs-has-started vjs-control-bar",
        youtube: {
          ytControls: 0,
          modestbranding: 1
        },
        sources: [
          {
            type: "video/youtube",
            src: this.links[this.selectIndex]
          }
        ]
      };
    }
  },

  watch: {
    live_active: function() {
      if (this.live_active) {
        // send training state update to ws
        var msg = {
          state: "start",
          type: "ssvep",
          classifier: this.selected_ssvep_classifier,
          now: Date.now()
        };
        this.postMessage({ type: "live", message: JSON.stringify(msg) });
      } else {
        var msg2 = {
          type: "live"
        };
        this.postMessage({
          type: "quit",
          message: JSON.stringify(msg2)
        });
      }
    },

    requested_controls: function() {
      if (this.requested_controls) {
        this.toggleUI();
        this.setRequested(false);
      }
    },

    last_command: function() {
      switch (this.last_command) {
        case "B":
          this.stepBack();
          break;
        case "F":
          this.stepForward();
          break;
        case "S":
          this.close();
          break;
        case "D":
          this.volDown();
          break;
        case "U":
          this.volUp();
          break;
        case "C":
          this.playPause();
          break;
      }
    }
  },

  // mounted: function() {
  //   this.$nextTick(function() {
  //    this.player.volume(0.5);
  //   });
  // },

  methods: {
    ...mapActions("Socket", ["postMessage"]),
    ...mapMutations("Live", ["setLive", "setRequested"]),
    ...mapMutations("Controls", ["resetControls"]),

    playPause() {
      if (this.player.paused()) {
        this.player.play();
      } else {
        this.player.pause();
      }
    },

    volDown() {
      var volume = this.player.volume();
      volume = volume - 0.2;
      if (volume < 0) {
        volume = 0;
      }
      this.player.volume(volume);
    },

    volUp() {
      var volume = this.player.volume();
      volume = volume + 0.2;
      if (volume > 1) {
        volume = 1;
      }
      this.player.volume(volume);
    },

    stepBack() {
      var length = this.player.duration();
      var oneStep = length / 10;
      var time = this.player.currentTime();
      var newTime = time;
      if (time - oneStep < 0) {
        newTime = 0;
      } else {
        newTime = time - oneStep;
      }
      this.player.currentTime(newTime);
    },

    stepForward() {
      var length = this.player.duration();
      var oneStep = length / 20;
      var time = this.player.currentTime();
      var newTime = time;
      if (time + oneStep > length) {
        newTime = length - 1;
      } else {
        newTime = time + oneStep;
      }
      this.player.currentTime(newTime);
    },

    close() {
      this.setLive(false);
      this.resetControls();
      this.setLive(true);
      this.$router.push("/ssvepvideos");
    },

    toggleUI() {
      if (!this.live_active) {
        this.setLive(true);
      } else {
        this.setLive(false);
      }
    }
  }
};
</script>

<style>
.vjs-default-skin .vjs-has-started .vjs-control-bar {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  bottom: -3.4em !important;
  background-color: rgba(7, 20, 30, 1) !important;
}

.vjs-fade-out {
  display: block;
  visibility: hidden;
  opacity: 1;

  -webkit-transition: visibility 1.5s, opacity 1.5s;
  -moz-transition: visibility 1.5s, opacity 1.5s;
  -ms-transition: visibility 1.5s, opacity 1.5s;
  -o-transition: visibility 1.5s, opacity 1.5s;
  transition: visibility 1.5s, opacity 1.5s;

  /* Wait a moment before fading out the control bar */
  -webkit-transition-delay: 2s;
  -moz-transition-delay: 2s;
  -ms-transition-delay: 2s;
  -o-transition-delay: 2s;
  transition-delay: 2s;
}

.container-video {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  overflow: hidden;
}

.container-video .video-player,
.container-video .video-player .video-js {
  height: 100% !important;
  width: 100% !important;
}

.container-video .video-player {
  padding-bottom: 1.75em !important;
}

.container-video .buttons {
  position: absolute;
  top: 1px;
  right: 0;
}

.container-video .vjs-control-bar {
  bottom: -3em !important;
}

.container-video .vjs-big-play-button {
  display: none !important;
}

.container-video .video-js .vjs-current-time,
.container-video .video-js .vjs-duration,
.container-video .vjs-time-divider {
  display: block !important;
}
</style>


