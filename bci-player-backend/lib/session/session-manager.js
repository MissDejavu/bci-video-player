const RecordManager = require('../recording/record-manager');
const Session = require('./session');
const fs = require('fs');

class SessionManager {
    constructor(client) {
        this.session = null;
        this.matrix = null;
        this.source = client; // emotiv client
        this.lastSession = null; // path to last session file, for renaming purpose
    }

    // set alphabet and size of matrix 
    init(alphabet, rows, cols) {
        this.matrix = { alphabet: alphabet, rows: rows, cols: cols };
        console.log("Session-manager initialised. Alphabet= " + this.matrix.alphabet + " Size= " + this.matrix.rows + " " + this.matrix.cols)
    }

    startSession(mode = Session.Mode.TRAINING, message = 'BFSDUC', type, symbolLength = 0) {
        if (this.session) return;
        this.session = new Session(mode, message, type, symbolLength);

        this.recordManager = new RecordManager(this.matrix, this.source);

        // start listening to eeg data from source
        this.recordManager.startEEGListening();

    }

    // neu - Aufruf von vue über ws
    end() {
        const { session } = this;
        this.saveSession(session);
        this.resetSession();
    }

    setMatrixData(symbol, now) {
        this.recordManager.recordMatrixData(symbol, now);
    }

    setDisplayData(symbol, now) {
        this.session.runs++;
        this.recordManager.recordDisplayData(symbol, now);
    }

    continueEEGRecording() {
        this.recordManager.on();
    }

    pauseEEGRecording() {
        this.recordManager.off();
    }

    resetSession() {
        this.recordManager.dispose();
        this.session = null;
    }

    saveSession(session) {
        const {
            runs, message, mode, type, symbolLength
        } = session;

        this.lastSession = this.recordManager.save({
            runs, message, mode, type, symbolLength
        });
    }

    renameLastSession(newName) {
        newName += ".json";
        
        const basePath = this.lastSession.substring(0, this.lastSession.lastIndexOf('/'));
        const oldName = this.lastSession.substring(this.lastSession.lastIndexOf('/') + 1);
        const newPath = `${basePath}/${newName}`;
        
        console.log(`renaming session ${oldName} to ${newName}`);

        fs.renameSync(this.lastSession, newPath);
        this.lastSession = newName;
    }

}

module.exports = SessionManager;
