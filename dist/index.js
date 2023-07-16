"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
const node_crypto_1 = require("node:crypto");
class Call {
    id;
    name;
    r;
    j;
    constructor({ id, name, r, j }) {
        this.id = id;
        this.name = name;
        this.r = r;
        this.j = j;
    }
}
class CallMessage {
    type;
    id;
    name;
    args;
    constructor({ id, name, args }) {
        this.type = 'CallMessage';
        this.id = id;
        this.name = name;
        this.args = args;
    }
}
class ResultMessage {
    type;
    id;
    value;
    error;
    constructor({ id, value, error }) {
        this.type = 'ResultMessage';
        this.id = id;
        this.value = value;
        this.error = error;
    }
}
class Agent {
    port;
    calls;
    messages;
    func;
    constructor(port) {
        this.port = port;
        this.calls = new Set();
        this.messages = new Set();
        this.func = new Map();
        this.port.on('message', (message) => {
            if (message.type == 'CallMessage') {
                const fn = this.func.get(message.name);
                if (fn) {
                    this.tryPost(fn, message);
                }
                else {
                    this.messages.add(message);
                }
            }
            else if (message.type == 'ResultMessage') {
                for (const call of this.calls) {
                    if (call.id === message.id) {
                        if (message.error) {
                            call.j(message.error);
                        }
                        else {
                            call.r(message.value);
                        }
                    }
                }
            }
        });
    }
    async tryPost(fn, message) {
        try {
            const value = await fn(...(message.args ? message.args : []));
            await new Promise((r, j) => {
                this.port.once('messageerror', j);
                this.port.postMessage(new ResultMessage({ id: message.id, value }));
                this.port.removeListener('messageerror', j);
                r(null);
            });
        }
        catch (err) {
            const error = err instanceof Error ? err.stack ? err.stack : err.message : 'Error';
            await new Promise((r, j) => {
                this.port.once('messageerror', j);
                this.port.postMessage(new ResultMessage({ id: message.id, error }));
                this.port.removeListener('messageerror', j);
                r(null);
            });
        }
    }
    async call(name, ...args) {
        return new Promise((r, j) => {
            const id = (0, node_crypto_1.randomUUID)();
            this.calls.add(new Call({ id, name, r, j }));
            this.port.once('messageerror', j);
            this.port.postMessage(new CallMessage({ id, name, args }));
            this.port.removeListener('messageerror', j);
        });
    }
    async register(name, fn) {
        this.func.set(name, fn);
        for (const message of this.messages) {
            if (message.name === name) {
                this.tryPost(fn, message);
            }
        }
    }
}
exports.Agent = Agent;
