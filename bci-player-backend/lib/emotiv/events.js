/*
 * Events // MODIFIED -> SUBSCRIPTION TO EVENTS + RAW EEG 
 * ******
 *
 * This example demonstrates using Cortex to subscribe to events for mental
 * commands and facial expressions. We take all the different kinds and
 * combine them together into a single event that only fires when something's
 * changed.
 *
 * It also accepts a threshold for hwo confident it should be before it
 * reports a result.
 *
 * If require()d as a library, it should be called with a callback function
 * like this:
 *     const onEvent = require('./events')
 *     onEvent(client, threshold, (event) => console.log('got an event!', event))
 *
 * If you run it from the command line it will do this for you and just print
 * out events as they happen.
 *
 */

const Cortex = require("./cortex");

process.env.threshold = 0.7;

// Small wrapper function  to turn the column-oriented format we get from the
// API into key:value pairs
const columns2obj = headers => cols => {
  const obj = {};
  for (let i = 0; i < cols.length; i++) {
    obj[headers[i]] = cols[i];
  }
  return obj;
};

function events(client, onResult) {
  return client
    .createSession({ status: "active" })
    .then(() => client.subscribe({ streams: ["com", "fac", "eeg"] }))
    .then(subs => {
      if (!subs[0].com || !subs[1].fac || !subs[2].eeg) throw new Error("failed to subscribe");

      const current = {
        command: "neutral",
        eyes: "neutral",
        brows: "neutral",
        mouth: "neutral",
        eeg: "0000",
      };

      // Here we listen for facial expressions
      const fac2obj = columns2obj(subs[1].fac.cols);
      const onFac = ev => {
        const data = fac2obj(ev.fac);

        let updated = false;
        let update = (k, v) => {
          if (current[k] !== v) {
            updated = true;
            current[k] = v;
          }
          else {
            current[k] = 'neutral';
          }
        };

        // Eye direction doesn't have a power rating, so we send every change
        update("eyes", data.eyeAct);
        if (data.uPow >= parseFloat(process.env.threshold)) update("brows", data.uAct);
        if (data.lPow >= parseFloat(process.env.threshold)) update("mouth", data.lAct);

        if (updated) onResult(Object.assign({}, current));
      };
      client.on("fac", onFac);

      // And here we do mental commands
      const com2obj = columns2obj(subs[0].com.cols);
      const onCom = ev => {
        const data = com2obj(ev.com);
        if (data.act !== current.command && data.pow >= parseFloat(process.env.threshold)) {
          current.command = data.act;
          onResult(Object.assign({}, current));
        } else {
          current.command = 'neutral';
        }
      };
      client.on("com", onCom);

      // raw eeg 
      const headers = subs[2].eeg.cols.slice();
      //headers.unshift("seq", "time");
      headers.headers = true;

      let n = 0;
      const onEeg = data => {
        if (n === 0) {
          current.eeg = headers;
        } else {
          current.eeg = data.eeg; //[n, data.time].concat(data.eeg);
        }
        onResult(Object.assign({}, current));
        n++;
      };

      client.on("eeg", onEeg);


      // Return a function to call to finish up
      return () =>
        client
          .inspectApi()
          .then(() => client.unsubscribe({ streams: ["com", "fac", "eeg"] }))
          .then(() => client.updateSession({ status: "close" }))
          .then(() => {
            client.removeListener("com", onCom);
            client.removeListener("fac", onFac);
            client.removeListener("eeg", onEeg);
          });
    });
}

module.exports = events;
