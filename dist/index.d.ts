/// <reference types="node" />
import * as threads from 'node:worker_threads';
export declare class Agent {
    port: threads.MessagePort | threads.Worker;
    private calls;
    private messages;
    private registrar;
    constructor(port: threads.MessagePort | threads.Worker);
    private tryPost;
    call<T>(name: string, ...args: Array<unknown>): Promise<T>;
    register(name: string, fn: (...args: Array<any>) => any): void;
    deregister(name: string): void;
}
