<template>
  <div class="row">
    <div class="col align-self-center">
      <div class="row float-right">
        <font-awesome-icon icon="angle-right" size="5x" class="pull-right"/>
      </div>
    </div>
    <div class="col justify-content-center">
      <div v-for="(video, index) in links" v-bind:key="video" class="row video mb-1">
        <b-embed type="iframe" v-bind:src="links[index]"></b-embed>
      </div>
    </div>
    <div class="col align-self-center">
      <div class="row">
        <font-awesome-icon icon="angle-left" size="5x"/>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapMutations } from "vuex";

export default {
  name: "Playlist",
  data: () => {
    return {
      selectedVideo: ""
    };
  },

  watch: {
    links: function() {
      this.$data.selectedVideo = this.links[2];
    }
  },

  mounted: function() {
    if (this.links.length < 3) this.setSelectIndex(0);
  },

  computed: {
    ...mapState("Videos", ["links"])
  },

  methods: {
    ...mapMutations("Videos", ["selectIndex"])
  }
};
</script>
