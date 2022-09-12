const {
    getERPSession, trainERP, classifyERP
} = require('./methods-erp');
const { trainSSVEP, classifySSVEP, getSSVEPSession } = require('./methods-ssvep');
const fs = require('fs');
const brain = require('brain.js');

const _ = require('lodash');

const channelsMap = {
    F3: 1,
    F4: 1,
    FC5: 1,
    FC6: 1,
    F7: 1,
    F8: 1,
    P7: 1,
    P8: 1,
    O1: 1,
    O2: 1,
    T7: 1,
    T8: 1,
    AF3: 1,
    AF4: 1,
};
const channels = Object.keys(channelsMap).filter(c => channelsMap[c]);

function trainRecord(file, type) {
    if (!file || !type) {
        console.log('no recording file or type given.');
        return;
    }

    const recording = JSON.parse(fs.readFileSync(`./sessions/${type}/${file}`));

    switch (type) {
        case 'erp':
            let erpdata = getERPSession(recording, channels);
            trainERP(erpdata, channels, process.env.MODEL);  // TODO: process.env.MODEL?
            break;
        case 'ssvep':
            let ssvepdata = getSSVEPSession(recording);
            trainSSVEP(ssvepdata, process.env.MODEL, file);
            break;
    }
    console.log('done');
}

function testRecord(file, type, classifier) {
    if (!file || !type || !classifier) {
        console.log('missing recording file, classifier or type.');
        return;
    }

    const recording = JSON.parse(fs.readFileSync(`./sessions/${type}/${file}`));
    const { model, opts } = JSON.parse(fs.readFileSync(`./nn-models/${type}/${classifier}`));

    const net = new brain.NeuralNetwork(opts);
    net.fromJSON(model);

    switch (type) {
        case 'erp':
            let erpdata = getERPSession(recording, channels);
            classifyERP(net, erpdata);
            break;
        case 'ssvep':
            let ssvepdata = getSSVEPSession(recording);
            classifySSVEP(net, ssvepdata);
            break;
    }

    console.log('done');
}

module.exports = { trainRecord, testRecord };
