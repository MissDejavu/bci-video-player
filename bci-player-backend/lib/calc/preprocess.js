const _ = require('lodash');
const { REF_CHANNELS, OCC_CHANNELS } = require('../constants');


function filter(arr) {
    return highpass(lowpass(arr));
}

function getChannels(eeg, channels) {
    return eeg.map(e => {
        return channels.map(c => e.levels[c]);
    });
}

function getAvg(array) {
    var total = 0;
    for (var i = 0; i < array.length; i++) {
        total += array[i];
    }
    return total / array.length;
}

function getAvgChannel(eeg, channels) {
    let refChannels = getChannels(eeg, channels);
    //get mean of reference channels for each sample
    return refChannels.map(sample => getAvg(sample));
}

function getDiff(v1, v2) {
    return v1.map(function (value, index) {
        return value - v2[index];
    });
}

function preprocess(eeg) {
    // get one calculated reference channel 
    let reference = getAvgChannel(eeg, REF_CHANNELS);

    // get one averaged channel of occipital electrodes O1 and O2
    let occ = getAvgChannel(eeg, OCC_CHANNELS);

    return getDiff(occ, reference);
}

module.exports = preprocess;