import * as threads from 'node:worker_threads';
import { CallMessage, ResultMessage } from './messages';

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
export class Agent {

    public port: threads.MessagePort | threads.Worker;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public callRegistrar: Map<number, Call<any>>;
    public cachedCallMessages: Set<CallMessage>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public callableRegistrar: Map<string, (...args: Array<any>) => any>;
    private callID: number;
    protected portOnline: Promise<unknown> = Promise.resolve();

    constructor(port: threads.MessagePort | threads.Worker) {

        this.port = port;
        this.callID = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.callRegistrar = new Map<number, Call<any>>();
        this.cachedCallMessages = new Set<CallMessage>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.callableRegistrar = new Map<string, (...args: Array<any>) => any>();

        if (port instanceof threads.Worker) {
            this.port.once('error', (err: Error) => {
                this.portOnline = Promise.reject<Error>(err);
                this.portOnline.catch<Error>((reason: Error) => reason);
                for (const [index, call] of this.callRegistrar.entries()) {
                    this.callRegistrar.delete(index);
                    call.j(err);
                }
            });

            this.port.once('exit', (exitCode: number) => {
                this.portOnline = Promise.reject<Error>(exitCode);
                this.portOnline.catch<number>((reason: number) => reason);
                for (const [index, call] of this.callRegistrar.entries()) {
                    this.callRegistrar.delete(index);
                    call.j(exitCode);
                }
            });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            this.portOnline = new Promise<void>((r, j) => {
                this.port.once('online', () => {
                    console.log('online 1');
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
                    this.cachedCallMessages.add(message);
                }
            }
            else if (message.type == 'ResultMessage') {
                const call = this.callRegistrar.get(message.id);
                this.callRegistrar.delete(message.id);
                if (call) {
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
        
        await this.portOnline;
        // Each call must await here in order to ensure previous calls are executed prior to this one.

        return new Promise<T>((r, j) => {
            console.log(args);
            const id = this.callID++;
            this.callRegistrar.set(id, new Call<T>({ id, name, r, j }));
            this.port.once('messageerror', j);
            this.port.postMessage(new CallMessage({ id, name, args }));
            this.port.removeListener('messageerror', j);
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public register(name: string, fn: (...args: Array<any>) => any): void {
        this.callableRegistrar.set(name, fn);
        for (const cachedCallMessage of [...this.cachedCallMessages]) {
            if (cachedCallMessage.name === name) {
                this.cachedCallMessages.delete(cachedCallMessage);
                this.tryPost(fn, cachedCallMessage).catch((err: Error) => console.error(err));
            }
        }
    }

    public deregister(name: string): void {
        this.callableRegistrar.delete(name);
    }
}
