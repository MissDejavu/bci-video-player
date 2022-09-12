import Vue from 'vue'
import App from './App.vue'
import store from './store/store'
import BootstrapVue from 'bootstrap-vue';
import router from './router';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faAngleDoubleRight, faPlay, faAngleRight, faAngleLeft, faPlayCircle, faAngleDown, faAngleUp, faAngleDoubleLeft, faCaretSquareDown, faCaretSquareUp, faFastBackward, faForward,
  faFastForward, faBackward, faVolumeDown, faVolumeUp, faClosedCaptioning, faWindowClose, faTimes, faPause, faSpinner
}
  from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';


import 'video.js/dist/video-js.css';
import 'videojs-youtube';
import 'video.js/dist/video.min.js';
import 'videojs-youtube/dist/Youtube.min.js';
import { videoPlayer } from 'vue-video-player';

library.add(faAngleDoubleRight, faAngleDoubleLeft, faCaretSquareDown, faVolumeDown,
  faCaretSquareUp, faFastBackward, faFastForward, faForward, faBackward, faVolumeDown,
  faVolumeUp, faClosedCaptioning, faWindowClose, faTimes, faAngleDown, faAngleUp, faPlay,
  faPlayCircle, faAngleRight, faAngleLeft, faPause, faSpinner);

Vue.component('font-awesome-icon', FontAwesomeIcon);
Vue.component('videoPlayer', videoPlayer);

Vue.use(BootstrapVue);

new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app')
