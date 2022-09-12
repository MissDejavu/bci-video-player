const Fili = require('fili');
const fs = require('fs');
const brain = require('brain.js');
const mkdirp = require('mkdirp');
const m = require('mathjs');
const dateformat = require('dateformat');
const preprocess = require('./preprocess');
const bci = require('bcijs');
var hamming = require('window-function/hamming');
var applyWindow = require('window-function/apply');
const { performance } = require('perf_hooks');

//const { predict } = require('./classifier');
const { SPS, SECONDS } = require('../constants');

process.env.nnThreshold = 0.5; // threshold for the neural network

function log() {
    console.log.apply(console, arguments);
}

function getSymbolData(preppedEEG, recording) {
    let symbolData = {};
    const symbolLength = parseInt(recording.meta.session.symbolLength);
    const displayTimeKeys = Object.keys(recording.data.display);
    displayTimeKeys.forEach((k, i) => {
        const symbol = recording.data.display[k];
        // get eeg data for each symbol 
        // k+SPS => cut off little less then firt second of each training (little less => balance missing samples at the end to still get full epoch)
        k = parseInt(k);
        var electrodes = preppedEEG.slice((k + SPS - 50), (k + SPS * symbolLength));
        symbolData[symbol] = electrodes;
    });
    return symbolData;
}

function filter(signal) {
    return highpass(lowpass(signal));
}

function lowpass(signal) {
    const iirCalculator = new Fili.CalcCascades();

    const iirFilterCoeffs = iirCalculator.lowpass({
        order: 3,
        characteristic: 'butterworth',
        Fs: 256,
        Fc: 40,
    });

    const iirFilter = new Fili.IirFilter(iirFilterCoeffs);

    return iirFilter.multiStep(signal);
}


function highpass(signal) {
    const iirCalculator = new Fili.CalcCascades();

    const iirFilterCoeffs = iirCalculator.highpass({
        order: 3,
        characteristic: 'butterworth',
        Fs: 256,
        Fc: 4,
    });

    const iirFilter = new Fili.IirFilter(iirFilterCoeffs);

    return iirFilter.multiStep(signal);
}

/**
 * calculate the power spectral density -> get eeg data in frequency format in orientation to pwelch function (matlab)
 * uses hamming window to preprocess
 * calculates standard deviation and squares values after psd tranform to get more clear results
 * @param {Object[]} signal the eeg data
 * @returns {Object[]} the psd
 */
function calcPsdSpectrum(signal) {
    var windowedSignal = applyWindow(signal, hamming);
    var psdArray = bci.psd(windowedSignal, SECONDS * SPS);
    var psd = [];
    for (var i = 0; i < 6 * 40; i++) {
        psd.push(bci.psdBandPower(psdArray, SPS, [i / 6, (i + 1) / 6], SECONDS * SPS))
    }
    const mean = m.mean(psd);
    const std = m.std(psd);

    psd = psd.map(v => (v - mean) / std);
    psd = psd.map(v => v * v);
    return psd;
}

function processEpoch(epoch) {
    epoch = filter(epoch);
    var psd = calcPsdSpectrum(epoch);

    // set frequencies smaller 6 to 0
    for (var i = 0; i < 6 * 6; i++) {
        psd[i] = 0;
    }
    return psd;
}

function getMostLikely(prediction) {
    var pred = null;
    var highest = 0;
    Object.keys(prediction).forEach(function (key) {
        if (prediction[key] > highest) {
            pred = key;
            highest = prediction[key];
        }
    });
    //treshhold for command prediction
    if (highest < parseFloat(process.env.nnThreshold)) {
        pred = 'X';
    }
    return pred;
}

function getSSVEPSession(recording) {
    // get preprocessed eeg data in form of one calculated (virtual) channel 
    let preppedEEG = preprocess(recording.data.electrodes);

    //split recording into training data for each symbol
    let symbolData = getSymbolData(preppedEEG, recording);

    let targets = [];
    //split data into training and test 
    //split both in small epochs (seconds, overlap = 50%) 
    //preprocess epochs
    Object.keys(symbolData).forEach(function (key) {
        //split into epochs
        var data = symbolData[key];
        while (data.length > SECONDS * SPS) {
            var epoch = data.slice(0, SECONDS * SPS);
            epoch = processEpoch(epoch);

            targets.push({ input: Array.from(epoch), output: { [key]: 1 } });
            data.splice(0, SPS * SECONDS); // data.splice(0, SPS*(SECONDS/2)); //TODO: OVERLAP?
        }
    });

    return targets;
}

function classifySSVEP(net, data) {
    var wrong = 0;
    var right = 0;
    var xcounter = 0;
    for (var i = 0; i < data.length; i++) {
        const prediction = net.run(data[i].input);
        log("SYMBOL:", data[i].output, "network: ", prediction);
        var mostLikely = getMostLikely(prediction);
        log("PREDICTION: ", mostLikely)
        if (mostLikely == "X") {
            xcounter++;
        }
        if (Object.keys(data[i].output)[0] == mostLikely) {
            right++;
        } else {
            if (mostLikely != "X") {
                wrong++;
            }
        }
    }
    var accuracy = right / (wrong + right);
    log("ACCURACY = " + accuracy)
    log("RIGHT: " + right);
    log("WRONG: " + wrong);
    log("X: " + xcounter);
}

function filterBadTargets(data) {
    let removed = 0;
    for (var i = 0; i < data.length; i++) {
        let copy = JSON.parse(JSON.stringify(data[i].input));
        const prediction = predict(copy);

        if (Object.keys(data[i].output)[0] !== prediction) {
            let spliced = data.splice(i, 1)
            removed++;
            console.log("removed: ", spliced);
        }
    }
    console.log("REMOVED: " + removed + " FROM " + data.length);
    return data;
}

function trainSSVEP(data, modelFilename, file) {
    if (modelFilename) {
        log("found classifier (filename given)");
        const { model, opts } = require(modelFilename);

        const net = new brain.NeuralNetwork(opts);
        return net.fromJSON(model);
    }
    log("no classifier - train new nn");

    // filter bad epochs from targets 
    //data = filterBadTargets(data);

    const opts = {
        iterations: 1500,
        learningRate: 0.005,
        hiddenLayers: [512, 256, 64],
    };

    const net = new brain.NeuralNetwork(opts);
    console.log("created neural network");
    const startTime = performance.now();
    const o = net.train(data, {
        log: true,
    });

    const time = performance.now() - startTime;
    fs.appendFileSync('./nn-models/training_times.txt', `Date: ${dateformat(new Date(), 'yyyy.mm.dd_HH.MM.ss')} Training time: ${time}\n`);

    log(o);

    mkdirp.sync(`./nn-models/ssvep`);
    const savedData = {
        opts: {
            learningRate: net.learningRate,
            sizes: net.sizes,
            errorThresh: net.errorThresh || brain.NeuralNetwork.trainDefaults.errorThresh,
        },
        model: net.toJSON(),
        output: o,
    };

    let filename = `${dateformat(new Date(), 'yyyy.mm.dd_HH.MM.ss')}.json`;
    if (file) {
        filename = `${file.replace('.json', '')}_${filename}`;
    }

    console.log(`./nn-models/ssvep/${filename}`);
    fs.writeFileSync(`./nn-models/ssvep/${filename}`, JSON.stringify(savedData, null, '\t'));

    console.log("done training")

    return net;
}

// do training and test together 
function processSSVEP(recording) {
    // get preprocessed eeg data in form on one calculated (virtual) channel 
    let preppedEEG = preprocess(recording.data.electrodes);

    //split recording into training data for each symbol
    let symbolData = getSymbolData(preppedEEG, recording);

    let training = [];
    let test = [];
    //split data into training and test 
    //split both in small epochs (seconds, overlap = 50%) 
    //preprocess epochs
    Object.keys(symbolData).forEach(function (key) {
        //split into training and test
        var trainingSymbol = symbolData[key].slice(0, symbolData[key].length * 0.7);
        var testSymbol = symbolData[key].slice(symbolData[key].length * 0.7, symbolData[key].length);
        //split into epochs
        while (trainingSymbol.length > SECONDS * SPS) {
            var epoch = trainingSymbol.slice(0, SECONDS * SPS);
            epoch = processEpoch(epoch)
            training.push({ input: Array.from(epoch), output: { [key]: 1 } });
            trainingSymbol.splice(0, SPS);
        }
        while (testSymbol.length > SECONDS * SPS) {
            var epoch = testSymbol.slice(0, SECONDS * SPS);
            epoch = processEpoch(epoch);
            test.push({ input: Array.from(epoch), output: { [key]: 1 } });
            testSymbol.splice(0, SPS);
        }
    });

    const net = trainSSVEP(training);

    classifySSVEP(net, test);

    log("done");
}

//processSSVEP('2019.01.16_NEW.json');

module.exports = { processSSVEP, trainSSVEP, classifySSVEP, getSSVEPSession, getMostLikely, processEpoch, getSymbolData, filter };


