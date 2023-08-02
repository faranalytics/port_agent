/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as threads from 'node:worker_threads';
import { randomUUID } from 'node:crypto';

interface CallOptions {
    id: string;
    name: string;
    r: (value: any) => void;
    j: (reason?: any) => void;
}

class Call {
    id: string;
    name: string;
    r: (value: any) => void;
    j: (reason?: any) => void;
    constructor({ id, name, r, j }: CallOptions) {
        this.id = id;
        this.name = name;
        this.r = r;
        this.j = j;
    }
}

interface CallMessageOptions {
    id: string;
    name: string;
    args?: Array<any>;
}

class CallMessage {
    type: string;
    id: string;
    name: string;
    args?: Array<any>;

    constructor({ id, name, args }: CallMessageOptions) {
        this.type = 'CallMessage';
        this.id = id;
        this.name = name;
        this.args = args;
    }
}

interface ResultMessageOptions {
    id: string;
    value?: any;
    error?: string;
}

class ResultMessage {
    type: string;
    id: string;
    value?: any;
    error?: string;

    constructor({ id, value, error }: ResultMessageOptions) {
        this.type = 'ResultMessage';
        this.id = id;
        this.value = value;
        this.error = error;
    }
}

export class Agent {

    public port: threads.MessagePort | threads.Worker;
    private calls: Set<Call>;
    private messages: Set<CallMessage>;
    private registrar: Map<string, (...args: any) => any>;
    constructor(port: threads.MessagePort | threads.Worker) {

        this.port = port;
        this.calls = new Set<Call>();
        this.messages = new Set<CallMessage>();
        this.registrar = new Map<string, (...args: any) => any>();

        this.port.on('message', async (message: CallMessage & ResultMessage) => {
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

    private async tryPost(fn: (...args: any) => any, message: CallMessage): Promise<void> {
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

    public async call(name: string, ...args: any): Promise<any> {
        return new Promise((r, j) => {
            const id = randomUUID();
            this.calls.add(new Call({ id, name, r, j }));
            this.port.once('messageerror', j);
            this.port.postMessage(new CallMessage({ id, name, args }));
            this.port.removeListener('messageerror', j);
        });
    }

    public register(name: string, fn: (...args: any) => any): void {
        void (async () => {
            try {
                this.registrar.set(name, fn);
                for (const message of this.messages) {
                    if (message.name === name) {
                        await this.tryPost(fn, message);
                    }
                }
            }
            catch (err) {
                console.error(err);
            }
        })();
    }

    public deregister(name: string) {
        this.registrar.delete(name);
    }
}
