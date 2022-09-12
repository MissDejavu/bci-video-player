// records the current symbol that the user should concentrate on in tainings session

class DisplayRecorder {
    constructor(settings = {}) {
        this.settings = settings;
        this.records = [];
    }

    record(data) {
        this.records.push(data);
    }

    dump() {
        return {
            settings: this.settings,
            records: this.records,
        };
    }
}

module.exports = DisplayRecorder;
