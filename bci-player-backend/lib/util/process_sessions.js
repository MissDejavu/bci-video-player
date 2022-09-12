const preprocess = require('../calc/preprocess');
const ssvep = require('../calc/methods-ssvep');
const fs = require('fs');
const { SPS, SECONDS } = require('../constants');

var files = fs.readdirSync('sessions/ssvep');
files
    .forEach((file) => {
        console.log('session', file);
        let name = file.substring(0, file.lastIndexOf('.json'));

        let recording = JSON.parse(fs.readFileSync('sessions/ssvep/' + file));
        let preppedEEG = preprocess(recording.data.electrodes);

        //split recording into training data for each symbol
        let symbolData = ssvep.getSymbolData(preppedEEG, recording);
        
        

        Object
            .keys(symbolData)
            .forEach(function (symbol) {
                console.log('symbol', symbol);
                let stream = fs.createWriteStream(`outputs/ssvep_raw/${name}-${symbol}.csv`);
                //split into epochs
                let data = symbolData[symbol];
                let i = 0;
                while (data.length > SECONDS * SPS) {
                    i += 1;
                    console.log('epoch', i);

                    let epoch = data.slice(0, SECONDS * SPS);

                    
                    epoch = ssvep.filter(epoch);
                    //epoch = ssvep.processEpoch(epoch);

                    stream.write(`${epoch.join(',')}\n`);
                    data.splice(0, SPS * SECONDS); // data.splice(0, SPS*(SECONDS/2)); //TODO: OVERLAP
                }
                stream.end();
            });

    });
