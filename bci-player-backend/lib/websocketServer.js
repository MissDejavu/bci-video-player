// websocket server to communicate with the UI

const Session = require('./session/session');
const { trainRecord, testRecord } = require('./calc/process');
const fs = require('fs');
const Analyzer = require('./calc/analyzer');

var socketio = require('socket.io')();

let client = null;
let sessionManager = null;
let _socket = null;

class WebsocketServer {
  constructor(c, sm) {
    sessionManager = sm;
    client = c;
    const io = socketio.listen('1234');
    //const io = socketio.listen(server);
    this._handle(io);
    Analyzer.on('msg', this.onMsg);
  }

  onMsg(type, msg) {
    if (!_socket) {
      console.log('No socket connection')
      return null;
    }
    _socket.emit(type, msg)
  }

  _handle(io) {
    io.on('connection', function (socket) {
      _socket = socket;
      console.log('Made socket connection...')
      socket.emit('message', 'Hello from the server!');

      socket.on('disconnect', function () {
        console.log('Client disconnected.');
        try {
          //TODO - not working, why?
          client.diconnectCortex()
        } catch (error) {
          console.log('Could not close ws connection to cortex');
        }

      });
      //matrix settings
      socket.on('init', function (data) {
        var dataObj = JSON.parse(data);
        var alphabet = dataObj.alphabet;
        var size = dataObj.size;
        sessionManager.init(alphabet, size.rows, size.cols);
      })

      socket.on('train_classifier', function (data) {
        var dataObj = JSON.parse(data);
        var type = dataObj.type;
        var session = dataObj.session;
        trainRecord(session, type);
      })

      socket.on('test_classifier', function (data) {
        var dataObj = JSON.parse(data);
        var type = dataObj.type;
        var classifier = dataObj.classifier;
        var session = dataObj.session;
        testRecord(session, type, classifier);
      })

      socket.on('training', function (data) {
        var dataObj = JSON.parse(data);
        switch (dataObj.state) {
          case 'start':
            var msg = dataObj.msg;
            var type = dataObj.type;
            var symbolLength = dataObj.symbolLength;
            console.log(`${type} training Session requested with message ${msg}. Trainings Length for each symbol is ${symbolLength} seconds.`);
            sessionManager.startSession(Session.Mode.TRAINING, msg, type, symbolLength);
            break;

          //set current trainingssymbol in display-recorder
          case 'run':
            var symbol = dataObj.symbol;
            var now = dataObj.now;
            console.log('Run training, current symbol is: "' + symbol + '".');
            sessionManager.setDisplayData(symbol, now);
            sessionManager.continueEEGRecording();
            break;

          case 'pause':
            var symbol = dataObj.symbol;
            var now = dataObj.now;
            console.log('Pause training, current symbol is: "' + symbol + '".');
            sessionManager.pauseEEGRecording();
            break;

          case 'end':
            console.log('End Training Session.');
            sessionManager.end();
            break;

          case 'data':
            var symbol = dataObj.symbol;
            var now = dataObj.now;
            console.log('Got data: "' + symbol + '" at time: ' + now);
            sessionManager.setMatrixData(symbol, now);
            break;

          case 'rename':
            const name = dataObj.name;
            sessionManager.renameLastSession(name);
            break;
        }

      });

      socket.on('live', function (data) {
        var dataObj = JSON.parse(data);
        switch (dataObj.state) {
          case 'start':
            var classifier = dataObj.classifier;
            var type = dataObj.type;
            if (!Analyzer.running) {
              console.log(`${type} live session requested.`);
              Analyzer.start(client, classifier, type);
            } else {
              console.log("Analyzer already running")
            }
            break;
        }
      });

      socket.on('quit', function (data) {
        var dataObj = JSON.parse(data);
        switch (dataObj.type) {
          case 'training':
            //quit and reset training session
            console.log("Quit Training")
            sessionManager.resetSession();
            break;
          case 'live':
            // quit live analysis
            if (Analyzer.running) {
              console.log("Stopping analysis")
              Analyzer.stop();
            } else {
              console.log("Analyzer cannot be stopped, since it is not running")
            }
            break;
        }
      });

      socket.on('ready', function (data) {
        console.log('Got a message: ' + data);
        if (!client.isConnected()) {
          client.start(socket);
        } else {
          socket.emit('c_error', 'Connection already exists. Make sure to close other tabs with open connections.');
        }
      });

      socket.on('test', function (data) {
        console.log('Got a message: ' + data);
      });

      socket.on('files', function (data, callback) {
        var type = JSON.parse(data).type;
        console.log('load files from: ' + type);
        let sessions = [];
        let classifier = [];

        if (fs.existsSync(`./sessions/${type}`)) {
          sessions = fs.readdirSync(`./sessions/${type}`);
        }
        if (fs.existsSync(`./nn-models/${type}`)) {
          classifier = fs.readdirSync(`./nn-models/${type}`);
        }
        callback(sessions, classifier);
      });

      socket.on('threshold', function (data) {
        console.log(`setting threshold to ${data}`);
        process.env.threshold = data;
      });

      socket.on('nnThreshold', function (data) {
        console.log(`setting nnThreshold to ${data}`);
        process.env.nnThreshold = data;
      });

      socket.on('live_mi', function (data) {
        console.log(`setting live_mi to ${data}`);
        process.env.live_mi = data;
      });
      socket.on('classification', function (data) {
        console.log(`setting classification type to ${data}`);
        process.env.classification = data;
      });

    });
  }
}

module.exports = WebsocketServer;