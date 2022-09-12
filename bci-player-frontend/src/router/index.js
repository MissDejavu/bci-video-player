import Vue from 'vue';
import Router from 'vue-router';
import SSVEPVideos from '../components/SSVEPVideos';
import Settings from '../components/Settings';
import Video from '../components/Video';

Vue.use(Router);

export default new Router({
    mode: 'history',
    routes: [
        {
            path: '/settings',
            name: 'Settings',
            component: Settings
        },
        {
            path: '',
            redirect: '/settings'
        },
        {
            path: '/ssvepvideos',
            name: 'SSVEPVideos',
            component: SSVEPVideos
        },
        {
            path: '/videos',
            redirect: '/ssvepvideos'
        },
        {
            path: '/videos/video',
            name: 'Video',
            component: Video
        },

    ]
})
