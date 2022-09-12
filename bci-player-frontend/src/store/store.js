import Vue from "vue"
import Vuex from "vuex"

import SocketClient from './socket'

Vue.use(Vuex);

export const ALPHABET = "BFSDUC";
export const SIZE = { rows: 2, cols: 3 };
export const TRAINING_MSG = ALPHABET;
export const COLORS = ['lightblue', 'red', 'lightgreen', 'yellow', 'white', 'orange', 'brown', 'blue', 'purple', 'green', 'pink'];

const socket = new SocketClient();

export default new Vuex.Store({
  modules: {
    // socket 
    'Socket': {
      namespaced: true,
      state: {
        messages: [],
        error: "",
      },
      mutations: {
        incoming(state, msg) {
          state.messages.push(msg);
        },
        error(state, error) {
          state.error = error;
        },
      },
      actions: {
        postMessage(context, { type, message, cb }) {
          if (!socket) {
            throw new Error("don't have connection")
          }
          socket.send(type, message, cb)
        }
      }
    },

    'Type': {
      namespaced: true,
      state: {
        erp: false,
        ssvep: false
      },
      mutations: {
        setERP(state, value) {
          state.erp = value;
          state.ssvep = false;
        },

        setSSVEP(state, value) {
          state.ssvep = value;
          state.erp = false;
        },
      }
    },

    'Timeouts': {
      namespaced: true,
      state: {
        timeouts: []
      },
      mutations: {
        addTimeout(state, timeout) {
          state.timeouts.push(timeout);
        },
        killTimeouts(state) {
          for (var i = 0; i < state.timeouts.length; i++) {
            clearTimeout(state.timeouts[i]);
          }
          state.timeouts = [];
        }
      }
    },

    'Training': {
      namespaced: true,
      state: {
        erp_classifier: [],
        ssvep_classifier: [],
        selected_ssvep_classifier: "",
        selected_erp_classifier: "",
        countdown: 20,
        training_active: false,
        current_symbol: "",
        symbolcounter: 0
      },
      mutations: {
        setSelectedErpClassifier(state, classifier) {
          state.selected_erp_classifier = classifier;
        },
        setSelectedSsvepClassifier(state, classifier) {
          state.selected_ssvep_classifier = classifier;
        },
        setErpClassifier(state, classifier) {
          state.erp_classifier = classifier;
        },
        setSsvepClassifier(state, classifier) {
          state.ssvep_classifier = classifier;
        },
        setTraining(state, value) {
          state.training_active = value;
        },
        setCurrentSymbol(state, symbol) {
          state.current_symbol = symbol;
        },
        resetCountdown(state) {
          state.countdown = 20;
        },
        decreaseCountdown(state) {
          state.countdown--;
        },
        increaseSymbolCounter(state) {
          state.symbolcounter++;
        },
        resetTraining(state) {
          state.countdown = 20;
          state.current_symbol = "";
          state.training_active = false;
          state.current_symbol = "";
          state.symbolcounter = 0;
        },
      },

      actions: {
        countDown(context) {
          //reset countdown
          if (context.state.countdown == "START") {
            context.commit('resetCountdown')
          }
          //countdown with recursive setTimeout
          var timeout = setTimeout(
            function () {
              if (context.state.countdown > 1) {
                context.commit('decreaseCountdown')
                context.dispatch('countDown');
              } else {
                context.state.countdown = "START";
              }
            }.bind(this),
            1000
          );
          context.commit('Timeouts/addTimeout', timeout, { root: true })
        },

      }
    },

    'Live': {
      namespaced: true,
      state: {
        requested_controls: false,
        live_active: false,
        last_command: "X",
        symbol: "X"  // equals last command, but doesn't change in between 
      },
      mutations: {
        setRequested(state, value) {
          state.requested_controls = value;
        },
        setLive(state, value) {
          state.live_active = value;
        },
        setCommand(state, command) {
          state.last_command = command;
        },
        setSymbol(state, symbol) {
          state.symbol = symbol;
        },
        resetLive(state) {
          state.live_active = false;
          state.last_command = "X";
          state.symbol = "X";
        }
      },
      actions: {
        setNewCommand(context, command) {
          context.commit('setCommand', command);
          context.commit('setSymbol', command);
          setTimeout(() => {
            context.commit('setCommand', "X")
          }, 1000)
        }
      }
    },

    // everything realted to the erp/ssep stimulation
    'Controls': {
      namespaced: true,
      state: {
        flashing: false,
        erp_matrix: [],
        //video controls - blink active
        commands: {
          B: false, //backwards
          F: false, //forwards
          S: false, //Subtitles
          D: false, //volumeDown
          U: false, //volumeUp
          C: false  //close
        },

      },
      mutations: {
        resetControls(state) {
          state.flashing = false;
          state.erp_matrix = [];
          state.commands.B = false;
          state.commands.F = false;
          state.commands.S = false;
          state.commands.D = false;
          state.commands.U = false;
          state.commands.C = false;
        },

        setErpMatrix(state, matrix) {
          state.erp_matrix = matrix;
        },

        setFlashing(state, value) {
          state.flashing = value;
        },

        setCommand(state, command) {
          state.commands[command] = true;
        },

        resetAllCommands(state) {
          state.commands.B = false;
          state.commands.F = false;
          state.commands.S = false;
          state.commands.D = false;
          state.commands.U = false;
          state.commands.C = false;
        },
      },
    },

    'Videos': {
      namespaced: true,
      state: {
        selectIndex: 3,
        links: [
          "https://www.youtube.com/embed/Lb09u0qlSwY",
          "https://www.youtube.com/embed/I-QfPUz1es8",
          "https://www.youtube.com/embed/eJnQBXmZ7Ek",
          "https://www.youtube.com/embed/Vx_66WKl33k",
          "https://www.youtube.com/embed/32M8qRGrUE8",
          "https://www.youtube.com/embed/45AVU5cv93k",
          "https://www.youtube.com/embed/_VlmoCQXYas",
        ],
      },

      mutations: {
        setSelectIndex(state, index) {
          state.selectIndex = index;
        },
        addLink(state, link) {
          state.links.push(link);
        },
        rotateUp(state) {
          var tmp = state.links.pop();
          state.links.unshift(tmp);
        },
        rotateDown(state) {
          var tmp = state.links.shift();
          state.links.push(tmp);
        },
      }
    },
  }
});
