// bcijs tests
const bci = require('bcijs');
const dsp = require('dsp.js');

const SPS = 256;
const FILE = '../../sessions/tests/BLUE-C_2019.01.15_17.16.36.csv';

const START = 500; // start after ... samples
const SECONDS = 4; // sample length 


bci.loadCSV(FILE)
    .then((eegArray) => {
        eegArray.shift();
        var eeg = eegArray.splice(START, SECONDS * SPS)
        var ref = eeg.map(function (sample) {
            var r = sample.slice(2, 6).concat(sample.slice(11, 15));
            return getAvg(r);
        })

        var occ = eeg.map(function (sample) {
            var c = sample.slice(9, 10);
            return getAvg(c);
        })

        var signal = getDiff(occ, ref);
        var tmp = calcDft(signal);

        
        var dft = [];
        for (var key in tmp) {
            dft.push(tmp[key]);
        }
        dft = dft.splice(10, 100)


        var psdArray = bci.psd(signal, SECONDS * SPS);
        var psd = [];
        for (var i = 1; i < 35; i++) {
            psd.push(bci.psdBandPower(psdArray, SPS, [i, i + 0.001], SECONDS * SPS) / 100)
        }


        //console.log(JSON.stringify(dft));
        console.log(JSON.stringify(psd));
    })
    .catch((error) => {
        console.log(error)
    });


function getAvg(array) {
    var total = 0;
    for (var i = 0; i < array.length; i++) {
        total += array[i];
    }
    return total / array.length;
}

function getDiff(v1, v2) {
    return v1.map(function (value, index) {
        return value - v2[index];
    });
}

// squared descrete fourier transformation
function calcDft(buffer) {
    var dft = new dsp.DFT(SPS * SECONDS, SPS * SECONDS);
    dft.forward(buffer);
    return dft.spectrum;
}