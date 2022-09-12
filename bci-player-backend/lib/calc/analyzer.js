const EventEmitter = require('events');
const _ = require('lodash');
const brain = require('brain.js');
const fs = require('fs');
const { processEpoch, getMostLikely } = require('./methods-ssvep');
const { predict } = require('./classifier');
const preprocess = require('./preprocess');
const { SPS, SECONDS } = require('../constants');

process.env.classification = "classifier";

/**
 * This class handles the analysis of the eeg epochs.
 */
class Analyzer extends EventEmitter {
    constructor() {
        super();
        this.running = false;   // current state of the analyzer
        this.epoch = [];        // the epoch to be analyzed
        this.paused = false;    // detailed state of the analyzer
    }

    /**
    * starts analyzer
    * @param  {CortexClient} client the client the eeg data comes from
    * @param  {string} classifier name of the file containing the neural network model
    */
    start(client, classifier, type = 'ssvep') {
        this.running = true;
        this.client = client;
        this.classifier = classifier;
        this.type = type;

        //load nn from classifier
        if (!this.classifier) {
            console.log('no neural network - using standard classification');
        } else {
            const { model, opts } = JSON.parse(fs.readFileSync(`./nn-models/${type}/${classifier}`));

            this.net = new brain.NeuralNetwork(opts);
            this.net.fromJSON(model);
        }

        this.eegListener = this.onEmotivData.bind(this);
        //collect eeg data 
        this.client.on('eeg', this.eegListener);
    }

    /**
    * listens to eeg data from eeg device emotiv epoc and collects data to epoch
    * @param  {Obejct[]} data the eeg data sample
    */
    onEmotivData(data) {
        if (this.paused) {
            this.epoch = [];
            return;
        }
        if (this.epoch.length < SECONDS * SPS) {
            this.epoch.push(data);
        } else {
            this.analyze(this.epoch).catch((error) => console.log(error));

            this.epoch.splice(0, (SECONDS / 2) * SPS);
            this.epoch.push(data);
        }
    }

    /**
    * stops the analyzer
    */
    stop() {
        if (this.eegListener) {
            this.client.removeListener('eeg', this.eegListener);
        }
        this.running = false;
        this.epoch = [];
    }

    /**
     * ansynchonous analyzation of the epoch with eeg data, emits result with EventEmitter
     * @param {Object[]} epoch full epoch with eeg data samples
     */
    async analyze(epoch) {
        let mostLikely = "X";
        epoch = preprocess(epoch);
        epoch = processEpoch(epoch);
        if (process.env.classification == "nn" && this.net) {
            let prediction = this.net.run(epoch);
            console.log(prediction);
            mostLikely = getMostLikely(prediction);
        } else if (process.env.classification == "classifier") {
            mostLikely = predict(epoch);
        } else {
            console.log("ERROR: please check classification type and file");
        }

        console.log('COMMAND: ', mostLikely);

        if (mostLikely != 'X') {
            console.log("NOT X")
            this.paused = true;
            setTimeout(() => {
                this.paused = false;
            }, 1500);
        }

        this.emit('msg', 'command', mostLikely);
    }
}

module.exports = new Analyzer();
