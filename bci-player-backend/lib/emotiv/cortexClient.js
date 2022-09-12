const EventEmitter = require('events');
const Cortex = require('./cortex');
const onEvent = require('./events');

const { channels } = require('../constants');

const GOAL_COMMAND = 'surprise';

// choose profile (TODO set with UI)
const SELECTED_PROFILE = '***';

//const server = require('../index');

// We can set LOG_LEVEL=2 or 3 for more detailed errors
const verbose = process.env.LOG_LEVEL || 2;
const options = { verbose, threshold: 0 };

// create client id and secret in the emotiv account - research licence required for raw eeg data (TODO set with UI)
const client_id = "***";
const client_secret = "***";

const debit = 100;

// The emotiv epoc device number
let HEADSET = "EPOCPLUS-3B9AECAC";

let currentUser = null;
let auth = "none";

let counter = 0;
let last_command = 'neutral';

process.env.live_mi = false;

class CortexClient extends EventEmitter {
  constructor() {
    super();
  }

  start(socket) {
    this.socket = socket;
    this.cortex = new Cortex(options);
    this.cortex.ready.then(() => this._init());

  }

  // handle auth
  _init() {
    this.cortex.getUserLogin()
      .then(users => {
        currentUser = users[0];
        if (currentUser != "") {
          this.socket.emit('current_user', users);
          // user is logged in -> try to authorize with id and secret 
          this.cortex.authorize({ client_id, client_secret, debit })
            .then(({ _auth }) => {
              auth = _auth;
              this.cortex.set_auth(_auth); // TODO: check where auth needed
              this.cortex.queryProfile({ _auth })
                .then(profiles => {
                  if (profiles) {
                    console.log('Profiles:');
                    for (const profile of profiles) {
                      console.log(profile.name);
                    }
                  } else {
                    console.log("No profiles");
                  }
                })
                .then(() => {
                  this.cortex.setupProfile({ _auth: auth, headset: HEADSET, profile: SELECTED_PROFILE, status: "load" });
                })

                .then(() => {
                  onEvent(this.cortex, ({ eyes, brows, mouth, command, eeg }) => {
                    this.handle_incoming(eyes, brows, mouth, command, eeg);
                  })
                })

                .then(() => {
                  //onRaw(this.cortex, rawData => {
                  //  this.handle_rawEEG(rawData);
                  //})
                })
                .catch((error) => {
                  console.log("Error occured: " + error);
                  this.socket.emit('c_error', 'Error occured: ' + error);
                });
            })

            .catch((error) => {
              console.log("Error occured: " + error);
              this.socket.emit('c_error', 'Error occured: ' + error);
            });
        } else {
          this.socket.emit('c_error', 'No user logged in!');
        }
      });
  }

  disconnectCortex() {
    this.cortex.close()
      .then(() => delete this.cortex, console.log("WS connection closed"))
      .catch((err) => console.log(err));
  }

  isConnected() {
    if (this.cortex) {
      return true;
    }
    return false;
  }

  handle_incoming(eyes, brows, mouth, command, eeg) {
    var now = Date.now();
    var formatted_eeg = _format_eeg(eeg);
    this.emit('eeg', formatted_eeg, now);
    //console.log(`eyes: ${pad(eyes, 10)} | brows: ${pad(brows, 10)} | mouth: ${pad(
    // mouth, 10)} | command: ${command}`);
    if (brows == GOAL_COMMAND && (Date.now() - counter) > 2000 && last_command != GOAL_COMMAND) {
      console.log("TOGGLE UI with: " + brows)
      if (process.env.live_mi == "true") {
        this.socket.emit('command', 'toggle_controls');
      }
      counter = Date.now();
      
    }
    last_command = brows;
  }
}

function _format_eeg(eeg) {
  var formatted = {};
  // remove "COUNTER","INTERPOLATED","RAW_CQ"
  var new_eeg = eeg.slice(3);

  //write channel name and value into object
  for (var i = 0; i < channels.length; i++) {
    formatted[channels[i]] = new_eeg[i];
  }
  return { levels: formatted };
}

module.exports = CortexClient;
