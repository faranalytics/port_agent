import * as threads from 'node:worker_threads';

export interface CallOptions<T> {
    id: number;
    name: string;
    r: (value: T) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    j: (reason?: any) => void;
}

export class Call<T> {
    public id: number;
    public name: string;
    public r: (value: T) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public j: (reason?: any) => void;

    constructor({ id, name, r, j }: CallOptions<T>) {
        this.id = id;
        this.name = name;
        this.r = r;
        this.j = j;
    }
}

export interface CallMessageOptions {
    id: number;
    name: string;
    args: Array<unknown>;
}

export class CallMessage {
    public type: string;
    public id: number;
    public name: string;
    public args: Array<unknown>;

    constructor({ id, name, args }: CallMessageOptions) {
        this.type = 'CallMessage';
        this.id = id;
        this.name = name;
        this.args = args;
    }
}

export interface ResultMessageOptions {
    id: number;
    value?: unknown;
    error?: { [key: string]: unknown };
}

export class ResultMessage {
    public type: string;
    public id: number;
    public value?: unknown;
    public error?: { [key: string]: unknown };

    constructor({ id, value, error }: ResultMessageOptions) {
        this.type = 'ResultMessage';
        this.id = id;
        this.value = value;
        this.error = error;
    }
}

export class Agent {

    public port: threads.MessagePort | threads.Worker;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public calls: Set<Call<any>>;
    public callMessages: Set<CallMessage>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public callableRegistrar: Map<string, (...args: Array<any>) => any>;
    private callID: number;
    protected _online: Promise<unknown> = Promise.resolve();

    constructor(port: threads.MessagePort | threads.Worker) {

        this.port = port;
        this.callID = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.calls = new Set<Call<any>>();
        this.callMessages = new Set<CallMessage>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.callableRegistrar = new Map<string, (...args: Array<any>) => any>();

        if (port instanceof threads.Worker) {
            this.port.once('error', (err: Error) => {
                this._online = Promise.reject<Error>(err);
                this._online.catch<Error>((reason: Error) => reason);
                for (const call of this.calls) {
                    this.calls.delete(call);
                    call.j(err);
                }
            });

            this.port.once('exit', (exitCode: number) => {
                this._online = Promise.reject<Error>(exitCode);
                this._online.catch<number>((reason: number) => reason);
                for (const call of this.calls) {
                    this.calls.delete(call);
                    call.j(exitCode);
                }
            });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            this._online = new Promise<void>((r, j) => {
                this.port.once('online', () => {
                    r();
                });
            });
        }

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.port.on('message', async (message: CallMessage & ResultMessage) => {
            if (message.type == 'CallMessage') {
                const fn = this.callableRegistrar.get(message.name);
                if (fn) {
                    try {
                        await this.tryPost(fn, message);
                    }
                    catch (err) {
                        console.error(err);
                    }
                }
                else {
                    this.callMessages.add(message);
                }
            }
            else if (message.type == 'ResultMessage') {
                for (const call of this.calls) {
                    if (call.id === message.id) {
                        this.calls.delete(call);
                        if (message.error) {
                            const error: { [key: string]: unknown } = new Error() as unknown as { [key: string]: unknown };
                            for (const [key, value] of Object.entries<unknown>(message.error)) {
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

    protected async tryPost(fn: (...args: Array<unknown>) => unknown, message: CallMessage): Promise<void> {
        try {
            const value = await fn(...(message.args ? message.args : []));
            await new Promise<null>((r, j) => {
                this.port.once('messageerror', j);
                this.port.postMessage(new ResultMessage({ id: message.id, value }));
                this.port.removeListener('messageerror', j);
                r(null);
            });
        }
        catch (err) {
            await new Promise<null>((r, j) => {
                this.port.once('messageerror', j);
                if (err instanceof Error) {
                    const error: { [key: string]: unknown } = {};
                    for (const name of Object.getOwnPropertyNames(err)) {
                        error[name] = Object.getOwnPropertyDescriptor(err as unknown as { [key: string]: unknown }, name)?.value;
                    }
                    this.port.postMessage(new ResultMessage({ id: message.id, error }));
                }
                this.port.removeListener('messageerror', j);
                r(null);
            });
        }
    }

    public async call<T>(name: string, ...args: Array<unknown>): Promise<T> {
        await this._online;
        return new Promise<T>((r, j) => {
            const id = this.callID++;
            this.calls.add(new Call<T>({ id, name, r, j }));
            this.port.once('messageerror', j);
            this.port.postMessage(new CallMessage({ id, name, args }));
            this.port.removeListener('messageerror', j);
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public register(name: string, fn: (...args: Array<any>) => any): void {
        this.callableRegistrar.set(name, fn);
        for (const callMessage of [...this.callMessages]) {
            if (callMessage.name === name) {
                this.callMessages.delete(callMessage);
                void this.tryPost(fn, callMessage);
            }
        }
    }

    public deregister(name: string): void {
        this.callableRegistrar.delete(name);
    }
}
