const dateformat = require('dateformat');
const fs = require('fs');
const mkdirp = require('mkdirp');
const DisplayRecorder = require('./display-recorder');
const EmotivRecorder = require('./emotiv-recorder');
const MatrixRecorder = require('./matrix-recorder');
const formatter = require('./formatter');

class RecordManager {
    constructor(matrix, emotivSource) {
        this.status = "OFF";
        this.matrix = matrix;
        this.emotivSource = emotivSource;

        this.setup();
    }

    setup() {
        const { alphabet, rows, cols } = this.matrix;

        this.matrixRecorder = new MatrixRecorder({
            alphabet,
            size: { rows, cols },
        });

        this.emotivRecorder = new EmotivRecorder();

        this.displayRecorder = new DisplayRecorder();

        this.onMatrixData = this.recordMatrixData.bind(this);
        this.onEmotivData = this.onEmotivData.bind(this);
        this.onDisplayData = this.recordDisplayData.bind(this);
    }

    startEEGListening() {
        this.emotivSource.on('eeg', this.onEmotivData);
        console.log("started listening to eeg")
    }

    onEmotivData(data, now) {
        if (this.status == "ON") {
            this.emotivRecorder.record([data, now]);
        }
    }

    stopEEGListening() {
        this.emotivSource.removeListener('eeg', this.onEmotivData);
    }

    recordMatrixData(data, now) {
        this.matrixRecorder.record([data, now]);
    }

    recordDisplayData(data, now) {
        this.displayRecorder.record([data, now]);
    }

    on() {
        this.status = "ON";
    }

    off() {
        this.status = "OFF";
    }

    save(session) {
        const data = formatter(this.matrixRecorder.dump(), this.emotivRecorder.dump(), this.displayRecorder.dump());

        const log = { data, meta: {} };
        log.meta.matrixSettings = this.matrixRecorder.settings;
        log.meta.session = session;
        log.meta.date = new Date();
        log.meta.timestamp = +log.meta.date;
        var type = session.type;
        mkdirp.sync(`./sessions/${type}`);

        const path = `./sessions/${type}/${dateformat(log.meta.date, 'yyyy.mm.dd_HH.MM.ss')}.json`;
        fs.writeFileSync(path, JSON.stringify(log, null, '\t'));
        return path;
    }

    dispose() {
        this.stopEEGListening();
        this.off();
        this.emotivSource.removeListener('eeg', this.onEmotivData);
        this.matrixRecorder = null;
    }
}

module.exports = RecordManager;
