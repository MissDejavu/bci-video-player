const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const assert = require('assert');
const stringify = require('csv-stringify/lib/sync');
const math = require('mathjs');
const Fili = require('fili');
const _ = require('lodash');
const { Matrix, Vector } = require('vectorious');

require('@tensorflow/tfjs-node');

function log() {
    console.log.apply(console, arguments);
}

function print() {
    console.log.apply(console, arguments);
}

function writeFilterOutput(eeg) {
    let matrix = new Matrix(eeg).transpose().toArray();
    let output = stringify(matrix);
    fs.writeFileSync('original.csv', output);
    console.log('done');

    output = stringify(matrix.map(lowpass));
    fs.writeFileSync('lowpass.csv', output);
    console.log('done');


    output = stringify(matrix.map(hightpass));
    fs.writeFileSync('hightpass.csv', output);
    console.log('done');

    output = stringify(matrix.map(filter));
    fs.writeFileSync('both.csv', output);
    console.log('done');
}

function buildModel(config) {
    const model = tf.models.sequential();

    config.forEach(l => {
        switch (l.type) {
            case "conv1d":
                layer = tf.layers.conv1d(l.config || {});
                break;
            case "conv2d":
                layer = tf.layers.conv2d(l.config || {});
                break;
            case "dense":
                layer = tf.layers.dense(l.config || {});
                break;
            case "batchNormalization":
                layer = tf.layers.batchNormalization(l.config || {});
                break;
            case "maxPooling1d":
                layer = tf.layers.maxPooling1d(l.config || {});
                break;
            case "maxPooling2d":
                layer = tf.layers.maxPooling2d(l.config || {});
                break;
            case "flatten":
                layer = tf.layers.flatten(l.config || {});
                break;
        }
        model.add(layer);
    });
}

function createNormalModel(inputShape, outputShape) {

    const model = tf.models.sequential();
    model.add(tf.layers.dense({
        inputShape: inputShape,
        units: 50,
        activation: 'sigmoid',
        kernelInitializer: 'leCunNormal'
    }));

    model.add(tf.layers.dense({
        units: 50,
        activation: 'sigmoid',
        kernelInitializer: 'leCunNormal'
    }));

    model.add(tf.layers.dense({ units: outputShape }));

    model.summary();
    return model;

}

function createConvModel(inputShape, outputShape) {

    const model = tf.sequential();

    model.add(tf.layers.conv1d({
        inputShape: inputShape,
        kernelSize: 1,
        strides: 1,
        filters: inputShape[1],
        activation: 'relu',
        kernelInitializer: 'ones'
        //kernelInitializer: 'ones'
    }));

    model.add(tf.layers.batchNormalization({}));

    model.add(tf.layers.maxPooling1d({
        poolSize: 2,
        strides: 2
    }));

    model.add(tf.layers.flatten({}));

    model.add(tf.layers.dense({ units: 600, activation: 'relu' }));

    model.add(tf.layers.dense({ units: outputShape, activation: 'softmax' }));

    model.summary();

    return model;
}

/**
 * Compile and train the given model.
 *
 * @param {*} model The model to
 */
async function train(model, data, onIteration) {

    const learningRage = 0.01;

    const optimizer = ["sgd", "momentum", "adagrad", "adadelta", "adam", "adamax", "rmsprop"]
        .reduce((p, c) => {
            let a = {}; a[c] = c;
            return Object.assign(p, a);
        }, {});

    const loss = ["computeWeightedLoss", "cosineDistance", "hingeLoss", "huberLoss", "logLoss", "meanSquaredError", "sigmoidCrossEntropy", "softmaxCrossEntropy"]
        .reduce((p, c) => {
            let a = {}; a[c] = c;
            return Object.assign(p, a);
        }, {});





    // Leave out the last 15% of the training data for validation, to monitor
    // overfitting during training.
    const validationSplit = 0;

    // Get number of training epochs from the UI.
    const trainEpochs = 100;

    const { training, test } = convert(split(data, .75));

    model.compile({
        optimizer: optimizer.adagrad,
        loss: "categoricalCrossentropy",
        metrics: ['accuracy']
    });


    //const input = training.map(sample => tf.tensor2d(sample.input));
    let inputs = tf.tensor3d(training.map(sample => sample.input));
    //const targets = training.map(sample => tf.tensor1d(sample.label));
    let targets = tf.tensor2d(training.map(sample => sample.label));
    const batchSize = Math.floor(training.length / 10);

    let valAcc;
    await model.fit(
        inputs,
        targets,
        {
            batchSize,
            validationSplit,
            epochs: trainEpochs,
            verbose: 2,
            shuffle: false,
            callbacks: {
                onBatchEnd: async (batch, logs) => {
                    //trainBatchCount++;
                    await tf.nextFrame();
                },
                onEpochEnd: async (epoch, logs) => {
                    valAcc = logs.val_acc;
                    await tf.nextFrame();
                }
            }
        })
    //.catch(log);


    inputs = tf.tensor3d(test.map(sample => sample.input));
    targets = tf.tensor2d(test.map(sample => sample.label));
    const testResult = model.evaluate(inputs, targets);
    const testAccPercent = testResult[1].dataSync()[0] * 100;
    const finalValAccPercent = valAcc * 100;
    console.log(
        `Final validation accuracy: ${finalValAccPercent.toFixed(1)}%; ` +
        `Final test accuracy: ${testAccPercent.toFixed(1)}%`);
}


/**
 * Show predictions on a number of test examples.
 *
 * @param {tf.Model} model The model to be used for making the predictions.
 */
async function showPredictions(model, data) {

    tf.tidy(() => {
        const output = model.predict(data.inputs);

        const axis = 1;
        const labels = Array.from(data.labels.argMax(axis).dataSync());
        const predictions = Array.from(output.argMax(axis).dataSync());

        log(data, predictions, labels);
    });
}

function convert({ training, test }) {
    let classes = _.uniq(training.map(s => s.label)).length;
    training = training.map(sample => {
        let l = sample.label;
        sample.label = Vector.zeros(classes).toArray();
        sample.label[l] = 1;
        return sample;
    });
    test = test.map(sample => {
        let l = sample.label;
        sample.label = Vector.zeros(classes).toArray();
        sample.label[l] = 1;
        return sample;
    });
    return {
        training,
        test
    }
}

function split(data, ratio) {
    let all = _.flatten(data.map(range => range.samples));
    let training = all.slice(0, Math.ceil(all.length * ratio));
    let test = all.slice(Math.ceil(all.length * ratio));
    log(all.length, training.length, test.length);
    // check if every symbol is definetely in test
    assert.equal(_.uniq(training.map(s => s.label)).length, _.uniq(test.map(s => s.label)).length);
    return {
        training: training,
        test: test
    }
}

function lowpass(arr) {
    const iirCalculator = new Fili.CalcCascades();

    const iirFilterCoeffs = iirCalculator.lowpass({
        order: 3,
        characteristic: 'butterworth',
        Fs: 128,
        Fc: 16,
    });

    const iirFilter = new Fili.IirFilter(iirFilterCoeffs);

    return iirFilter.multiStep(arr);
}


function hightpass(arr) {
    const iirCalculator = new Fili.CalcCascades();

    const iirFilterCoeffs = iirCalculator.highpass({
        order: 3,
        characteristic: 'butterworth',
        Fs: 128,
        Fc: 1,
    });

    const iirFilter = new Fili.IirFilter(iirFilterCoeffs);

    return iirFilter.multiStep(arr);
}

function filter(arr) {
    return hightpass(lowpass(arr));
}

function filterEeg(eeg) {
    return new Matrix(eeg)
        .transpose()
        .toArray()
        .map(filter);
}

function flattenEeg(eeg, channels) {
    return eeg.map(e => {
        return channels.map(c => e.levels[c]);
    });
}

function buildRanges(display, total) {
    let times = Object.keys(display).map(k => parseFloat(k));
    let alphabet = Object.keys(display).map(k => display[k]);


    let ranges = [];
    for (let i = 0; i < times.length; i++) {
        let isLast = i + 1 == times.length;
        let start = times[i];
        let end = isLast ? total - 1 : times[i + 1] - 1;
        ranges.push({
            symbol: alphabet[i],    // symbol for range
            start: start,           // start index
            end: end,               // end index
            frames: end - start     // # of frames
        });
    }

    return ranges;
}


function toErp(ranges, fullmatrix, electrodes, fps = 128) {
    let keys = Object.keys(fullmatrix);
    // build samples for each range
    return ranges
        .map(range => {
            let eeg = electrodes
                .map(channel => channel.slice(range.start, range.end));

            let sequence = keys
                .filter(k => k >= range.start && k <= range.end)
                .map(s => parseFloat(s));

            let matrix = sequence.map(k => fullmatrix[k]);

            let samples = sequence
                .map((key, index) => ({
                    input: _.flatten(eeg
                        .map(e => e.slice(key - range.start, (key - range.start) + fps))
                        .map(winsor)),
                    label: matrix[index] == range.symbol ? 1 : 0
                }));

            return Object.assign(range, {
                //eeg,
                samples,
                //sequence, // index for each blink
                //matrix,   // symbols for each blink
            });
        });
}


function toSsvep(ranges, electrodes, alphabet, fps = 128) {
    return ranges
        .map(range => {
            let eeg = electrodes
                .map(channel => channel.slice(range.start, range.end));

            let samples = _.range(math.floor(range.frames / fps))
                .map(n => {
                    let start = n * fps;
                    let end = start + fps;

                    return {
                        input: eeg
                            .map(channel => channel.slice(start, end))
                            .map(winsor),
                        label: alphabet.indexOf(range.symbol)
                    }
                });

            return Object.assign(range, {
                //eeg,
                samples
            });
        });
}


function winsor(arr) {
    let rv = arr.slice();
    const len = rv.length;

    const mean = math.mean(rv);
    const std = math.std(rv);

    rv = rv.map(v => (v - mean) / std);

    const min = math.min(rv);
    const max = math.max(rv);
    for (let i = 0; i < len; i++) {
        if (rv[i] < min) rv[i] = min;
        else if (rv[i] > max) rv[i] = max;
    }

    return rv;
}

function greenYellowRed(min, max, number) {

    let r, g, b;
    if (number < 0) {
        // green to yellow
        r = Math.floor(255 * (Math.abs(number / 2) / Math.abs(min)));
        g = 255;

    } else {
        // yellow to red
        r = 255;
        g = Math.floor(255 * ((max - number % max) / max));
    }
    b = 0;

    return [r, g, b];
}

function plotRanges(ranges, dim) {
    const PNG = require('pngjs').PNG;
    ranges
        .forEach((range, i) => {
            let png = new PNG({
                width: dim[1],
                height: dim[0] * range.samples.length,
                filterType: -1
            });
            range.samples
                .forEach((epoch, index) => {
                    let matrix = epoch.input.map(r => r.map(greenYellowRed.bind(null, _.min(r), _.max(r))));
                    for (var y = 0; y < matrix.length; y++) {
                        for (var x = 0; x < png.width; x++) {
                            var idx = (png.width * (y + (dim[0] * index)) + x) << 2;
                            png.data[idx] = matrix[y][x][0];
                            png.data[idx + 1] = matrix[y][x][1];
                            png.data[idx + 2] = matrix[y][x][2];
                            png.data[idx + 3] = 255;
                        }
                    }

                });
            fs.writeFileSync('images/' + range.symbol + '-' + i + '-' + '.png', PNG.sync.write(png, { colorType: 6 }));
        });
}


function toColor(ranges) {

}

//let channels = ["AF3", "F7", "F3", "FC5", "T7", "P7", "O1", "O2", "P8", "T8", "FC6", "F4", "F8", "AF4"];
let channels = ["O1", "O2", "P7", "P8", "F3", "F4"];
//


/*
let erp = JSON.parse(fs.readFileSync("erp-neu.json"));
let eeg = filterEeg(flattenEeg(erp.data.electrodes, channels));
let ranges = buildRanges(erp.data.display, erp.data.time.length, 5);
log(ranges);
fs.writeFileSync('erp-ranges.json', JSON.stringify(toErp(ranges, erp.data.matrix, eeg)));
*/

let frames = 128;
//let ssvep = JSON.parse(fs.readFileSync("sessions/ssvep/2018.12.31_16.08.30.json"));
let ssvep = JSON.parse(fs.readFileSync("../../sessions/ssvep2019.01.01_12.31.58.json"));
let eeg = filterEeg(flattenEeg(ssvep.data.electrodes, channels));
//let ranges = toColor(toSsvep(buildRanges(ssvep.data.display, ssvep.data.time.length), eeg, ssvep.meta.matrixSettings.alphabet, frames));
let ranges = toSsvep(buildRanges(ssvep.data.display, ssvep.data.time.length), eeg, ssvep.meta.matrixSettings.alphabet, frames);

plotRanges(ranges, [channels.length, frames]);

let model = createConvModel([channels.length, frames], 6);
train(model, ranges, () => { });

//fs.writeFileSync('ssvep-ranges.json', JSON.stringify(toSsvep(ranges, eeg, ssvep.meta.matrixSettings.alphabet)));




/*
let x = Object.keys(data.matrix)
            .map(k => parseFloat(k))
            .reduce((acc, cv, ci, arr) => {
                acc.push(cv - arr[ci-1]);
                return acc;
            }, []);

console.log(JSON.stringify(x));


let diff = data.time.reduce((acc, cv, ci, arr) => {
    acc.push(cv - arr[ci-1]);
    return acc;
}, []);

console.log(data.time.length);
console.log('0', diff.filter(v => v==0).length);
console.log('1', diff.filter(v => v==1).length);
console.log('2', diff.filter(v => v==2).length);
console.log('>2', diff.filter(v => v>2).length);

ranges
    .forEach(range => {
        console.log(data.time[range.end] - data.time[range.start], 'ms');
    });

let a = nj.array(eeg);

for(let i=0; i < a.shape[1]; i++) {
    let col = a.slice(null,[i, i+1]);
    col.subtract(col.min(), false);
    col.divide(col.max(), false);
}

stringify(a.tolist(), (err, output) => {
    fs.writeFileSync('data.csv', output);
    console.log('done');
});*/