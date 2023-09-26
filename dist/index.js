"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
const threads = __importStar(require("node:worker_threads"));
const node_crypto_1 = require("node:crypto");
class Call {
    id;
    name;
    r;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    calls;
    messages;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registrar;
    constructor(port) {
        this.port = port;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.calls = new Set();
        this.messages = new Set();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.registrar = new Map();
        if (port instanceof threads.Worker) {
            this.port.once('error', (err) => {
                for (const call of this.calls) {
                    call.j(err);
                }
            });
            this.port.once('exit', (exitCode) => {
                for (const call of this.calls) {
                    call.j(exitCode);
                }
            });
        }
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.port.on('message', async (message) => {
            if (message.type == 'CallMessage') {
                const fn = this.registrar.get(message.name);
                if (fn) {
                    try {
                        await this.tryPost(fn, message);
                    }
                    catch (err) {
                        console.error(err);
                    }
                }
                else {
                    this.messages.add(message);
                }
            }
            else if (message.type == 'ResultMessage') {
                for (const call of this.calls) {
                    if (call.id === message.id) {
                        if (message.error) {
                            const error = new Error();
                            for (const [key, value] of Object.entries(message.error)) {
                                error[key] = value;
                            }
                            call.j(error);
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
            await new Promise((r, j) => {
                this.port.once('messageerror', j);
                if (err instanceof Error) {
                    const error = {};
                    for (const name of Object.getOwnPropertyNames(err)) {
                        error[name] = Object.getOwnPropertyDescriptor(err, name)?.value;
                    }
                    this.port.postMessage(new ResultMessage({ id: message.id, error }));
                }
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    register(name, fn) {
        this.registrar.set(name, fn);
        for (const message of this.messages) {
            if (message.name === name) {
                void this.tryPost(fn, message);
            }
        }
    }
    deregister(name) {
        this.registrar.delete(name);
    }
}
exports.Agent = Agent;
