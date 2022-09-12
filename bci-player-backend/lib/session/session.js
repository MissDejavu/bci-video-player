class Session {
    constructor(mode, message, type, symbolLength) {
        this._symbolLength = symbolLength;
        this._mode = mode;
        this._message = message;
        this._type = type;
        this.runs = 0;
    }
    get symbolLength() {
        return this._symbolLength;
    }

    get mode() {
        return this._mode;
    }

    get type() {
        return this._type;
    }

    get message() {
        return this._message;
    }
}

Session.DEFAULT_RUN_COUNT = 5;

Session.Mode = {
    TRAINING: 'training',
    LIVE: 'live',
};

Session.DEFAULT_RUN_COUNT_TRAINING = 18;
Session.DEFAULT_RUN_COUNT_LIVE = Infinity;

module.exports = Session; 
