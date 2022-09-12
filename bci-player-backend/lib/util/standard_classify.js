// FREQUENCY RANGE FOR EPOCH: 0 - 40 HZ
// VALUES BETWEEN EACH FREQUENCY: 6  => one value for each 0.166667 step

const { getSSVEPSession } = require('../calc/methods-ssvep');
const { predict } = require('../calc/classifier');
const fs = require('fs');

const file = './sessions/ssvep/VP11_Training.json'


function classify() {
    console.log("started classification");

    const recording = JSON.parse(fs.readFileSync(file));
    let data = getSSVEPSession(recording);

    var wrong = 0;
    var right = 0;
    var xcounter = 0;

    for (var i = 0; i < data.length; i++) {
        const prediction = predict(data[i].input);

        if (prediction == "X") {
            xcounter++;
        }
        if (Object.keys(data[i].output)[0] == prediction) {
            right++;
        } else {
            if (prediction != "X") {
                wrong++;
            }
        }
        console.log("Symbol was: " + Object.keys(data[i].output)[0] + " Predicted: " + prediction);
    }

    var accuracy = right / (wrong + right);
    console.log("ACCURACY = " + accuracy)
    console.log("RIGHT: " + right);
    console.log("WRONG: " + wrong);
    console.log("X: " + xcounter);

    console.log("finished classification")
}

classify();
