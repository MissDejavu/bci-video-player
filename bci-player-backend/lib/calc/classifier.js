// methods for a general classifier without neural network

const m = require('mathjs');

/**
 * checks if value is close to another value, uses interval +- 0.2 from otherValue
 * @param {number} value the value of interest
 * @param {number} otherValue the value it should be close to
 */
function closeTo(value, otherValue) {
    let minFreq = value.freq - 0.2;
    let maxFreq = value.freq + 0.2;
    if (otherValue.freq > minFreq && otherValue.freq < maxFreq) {
        return true;
    }
    return false;
}

/**
 * Checks if frequency is one of these: "6.67", "7.50", "8.50", "8.67", "10.00", "12.00", "15.00", "13.33", "17.17", "20.00", "24.00", "30.00"
 * @param {number} freq the frequency of interest
 */
function isAccFreq(freq) {
    freq = parseFloat(freq).toFixed(2);
    let frequencies = ["6.67", "7.50", "8.50", "8.67", "10.00", "12.00", "15.00", "13.33", "17.17", "20.00", "24.00", "30.00"];
    if (frequencies.includes(freq)) {
        return true;
    }
    return false;
}

/**
 * Finds the highest values in epoch
 * @param {Object[]} epoch the eeg data 
 * @param {number} amount the number of max values
 * @returns {Object[]} formatted like this: {value: 20, freq: 7.5} or this {value: 19, freq: 22}, ...
 */
// 
function getMaxValues(epoch, amount) {
    let maxValues = [];
    for (let i = 0; i < amount; i++) {
        let max = 0;
        for (let j = 0; j < epoch.length; j++) {
            if (epoch[j] > max) { max = epoch[j] }
        }
        let index = epoch.indexOf(max);
        maxValues.push({ value: max, freq: index / 6 });
        epoch[index] = 0;
    }

    // filter values close to peak
    let filtered = 0;
    for (var valueIndex in maxValues) {
        var value = maxValues[valueIndex];
        for (var otherValueIndex in maxValues) {
            var otherValue = maxValues[otherValueIndex];
            if ((value.freq != otherValue.freq) && closeTo(value, otherValue)) {
                if (value.value < otherValue.value && !isAccFreq(value.freq)) {
                    maxValues.splice(valueIndex, 1);
                    filtered++;
                } else if (value.value >= otherValue.value && !isAccFreq(otherValue.freq)) {
                    maxValues.splice(otherValueIndex, 1);
                    filtered++;
                }
            }
        }
    }

    while (filtered > 0) {
        let max = 0;
        for (let j = 0; j < epoch.length; j++) {
            if (epoch[j] > max) { max = epoch[j] }
        }
        let index = epoch.indexOf(max);
        maxValues.push({ value: max, freq: index / 6 });
        epoch[index] = 0;

        filtered--;
    }
    return maxValues;
}

/**
 * set all values until freq to zero 
 * @param {Object[]} epoch 
 * @param {number} freq 
 * @returns {Object[]} the changed epoch
 */
function setZero(epoch, freq) {
    let cutOff = parseInt(freq * 6);
    for (let i = 0; i < cutOff; i++) {
        epoch[i] = 0;
    }
    return epoch;
}

/**
 * Calculates score for accuracy, how close freq to frequency is.
 * @param {number} freq the frequency of interest 
 * @param {number} frequency the frequency that is used for comparison
 */
function getAccuracy(freq, frequency) {
    let diff = Math.abs(freq - frequency);
    let accuracy = 0;
    if (diff < 0.1) {
        accuracy = 3;
    } else if (diff < 0.25) {
        accuracy = 2;
    } else {
        accuracy = 1;
    }
    return accuracy;
}

/**
 * Analyses the peak and creates score
 *  analyze aspects: {
 * - frequency: the rounded frequency
 * - accuracy: 0/1/2/3 (3 for most accurate, 0 if no fitting frequency found)
 * - value: the peak height }
 * @param {Object[]} peak one of the max values in epoch, peak = {value, freq}
 * @returns {Object[]} the score for the peak with additional information
 */
function analyzePeak(peak) {
    let freq = peak.freq;
    let frequency;
    let symbols = [];
    switch (true) {
        case (freq > 6.3 && freq <= 7):  // 6.66667
            frequency = 6.66667;
            symbols.push({ symbol: "B", harmonic: 0 });
            break;

        case (freq > 7.1 && freq < 7.9):  // 7.5
            frequency = 7.5;
            symbols.push({ symbol: "F", harmonic: 0 });
            break;

        case (freq > 8.1 && freq < 8.9):  // 8.57
            frequency = 8.57;
            symbols.push({ symbol: "S", harmonic: 0 });
            break;

        case (freq > 9.6 && freq < 10.4):   // 10
            frequency = 10;
            symbols.push({ symbol: "D", harmonic: 0 });
            break;

        case (freq > 11.6 && freq < 12.4):   // 12
            frequency = 12;
            symbols.push({ symbol: "U", harmonic: 0 });
            break;

        case (freq >= 13 && freq < 13.7):   // 13.33334
            frequency = 13.33334;
            symbols.push({ symbol: "B", harmonic: 1 });
            break;

        case (freq > 14.6 && freq < 15.4):   // 15
            frequency = 15;
            symbols.push({ symbol: "C", harmonic: 0 });
            symbols.push({ symbol: "F", harmonic: 1 });
            break;

        case (freq > 16.8 && freq <= 17.5):   // 17.14
            frequency = 17.14;
            symbols.push({ symbol: "S", harmonic: 1 });
            break;

        case (freq > 19.6 && freq < 20.4):   // 20
            frequency = 20;
            symbols.push({ symbol: "D", harmonic: 1 });
            //   symbols.push({ symbol: "B", harmonic: 2 });
            break;

        // case (freq >= 22.1 && freq < 22.9):   // 22.5
        //     frequency = 22.5;
        //     symbols.push({ symbol: "F", harmonic: 2 });
        //     break;

        case (freq > 23.6 && freq < 24.4):   // 24
            frequency = 24;
            symbols.push({ symbol: "U", harmonic: 1 });
            break;

        case (freq > 25.3 && freq < 26.2):   // 25.71
            frequency = 25.71;
            symbols.push({ symbol: "U", harmonic: 1 });
            break;

        case (freq > 29.6 && freq < 30.4):   // 30
            symbols.push({ symbol: "C", harmonic: 1 });
            // symbols.push({ symbol: "D", harmonic: 2 });
            frequency = 30;
            break;

        // case (freq > 35.6 && freq < 36.4):   // 36
        //     frequency = 36;
        //     symbols.push({ symbol: "U", harmonic: 2 });
        //     break;

        default:
            frequency = 0;
            symbols.push({ symbol: "X", harmonic: 0 });
    }

    let accuracy = getAccuracy(freq, frequency);
    let results = [];
    results.push({ original: freq, frequency, accuracy, value: peak.value, symbol: symbols[0].symbol, harmonic: symbols[0].harmonic })
    if (symbols.length > 1) {
        results.push({ original: freq, frequency, accuracy, value: peak.value, symbol: symbols[1].symbol, harmonic: symbols[1].harmonic })
    }
    return results;
}

/**
 * Calculates score for peak depending on its height
 * @param {Object[]} analyzed all analyzed peaks
 * @param {number} index the index of the peak of interest in analyzed
 */
function getHeightScore(analyzed, index) {
    let heights = [];
    for (let i = 0; i < analyzed.length; i++) {
        heights.push(analyzed[i].value);
    }
    sorted_heights = m.sort(heights);
    return sorted_heights.indexOf(analyzed[index].value);

}

/**
 * evaluates all the scores for the peaks
 * @param {Object[]} analyzed all analzed peaks
 * @returns {string} the symbol of the frequency with the highest score or 'X' for no defined frequency
 */
function evalScore(analyzed) {
    let scores = { B: 0, F: 0, S: 0, D: 0, U: 0, C: 0 };
    for (let i = 0; i < analyzed.length; i++) {
        scores[analyzed[i].symbol] = scores[analyzed[i].symbol] + analyzed[i].score;
    }
    console.log("SCORES: " + JSON.stringify(scores))
    let conflicting = false;
    let scoreSymbol = "X";
    let highest = 0;
    let tooClose = false;
    for (var symbol in scores) {
        if (scores[symbol] > highest) {
            if ((scores[symbol] - highest) < 8) {
                tooClose = true;
            } else {
                tooClose = false;
            }
            highest = scores[symbol];
            scoreSymbol = symbol;
            conflicting = false;
        } else if (scores[symbol] == highest) {
            conflicting = true;
        } else if ((highest - scores[symbol]) < 8) {
            tooClose = true;
        }
    }

    if (conflicting || (scores[scoreSymbol] < 5) || tooClose) {
        console.log("RETURNED X because of conflict or score too low");
        scoreSymbol = "X";
    }
    return scoreSymbol;
}

/**
 * predicts the ssvep frequency for the given epoch
 * @param {Object[]} epoch the eeg data
 * @returns {string} the symbol of the frequency with the highest score or 'X' for no defined frequency
 */
function predict(epoch) {
    epoch = setZero(epoch, 6);
    let maxValues = getMaxValues(epoch, 4);

    // analyze max values   
    var analyzed = [];
    for (let i = 0; i < maxValues.length; i++) {
        let peaks = analyzePeak(maxValues[i]);
        for (var key in peaks) {
            analyzed.push(peaks[key]);
        }
    }


    // filter peaks not correlating to command frequency
    let index = 0;
    while (index < analyzed.length) {
        if (analyzed[index].frequency == 0) {
            analyzed.splice(index, 1);
        } else {
            index++;
        }
    }
    if (analyzed.length == 0) {
        console.log("RETURNED X because of analyze length");
        return "X";
    }
    console.log(analyzed)

    // more than one frequency is possible -> make score for each peak
    // score: accuracy (0-3 Pts), Value/Height of Peak(0-4 Pts), 
    for (let i = 0; i < analyzed.length; i++) {
        let score = 0;
        let peak = analyzed[i];

        //add height of peak to score
        let heightScore = getHeightScore(analyzed, i)
        //give highest peak extra score points
        if (heightScore == analyzed.length - 1) {
            if (analyzed[i].accuracy == 3) {
                score += 6;
            } else {
                score += 3;
            }
        }
        score += heightScore * 2;
        //add accuracy to score
        score += peak.accuracy * 3;
        //add harmonic to score
        score -= peak.harmonic * 4;
        analyzed[i].score = score;
    }

    return evalScore(analyzed);
}

module.exports = { predict };