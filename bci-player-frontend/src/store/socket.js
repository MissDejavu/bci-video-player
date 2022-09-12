import io from "socket.io-client"
import store from './store'

export default class SocketClient {
    constructor() {
        this.socket = io('ws://localhost:1234');
        this._listen();
    }

    _listen() {
        this.socket.on("message", data => {
            store.commit('Socket/incoming', data)
        });


        this.socket.on("c_error", data => {
            store.commit('Socket/error', data)
        });

        this.socket.on("command", data => {
            switch (data) {
                case "toggle_controls":
                    store.commit('Live/setRequested', true)
                    break;
                default:
                    this.newCommand(data);
            }
            store.commit('Socket/incoming', data);
        });

    }
    newCommand(command) {
        store.dispatch('Live/setNewCommand', command);
    }

    send(type, message, cb) {
        this.socket.emit(type, message, cb)
    }

}
