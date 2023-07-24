/// <reference types="node" />
import * as threads from 'node:worker_threads';
export declare class Agent {
    protected port: threads.MessagePort | threads.Worker;
    private calls;
    private messages;
    private registrar;
    constructor(port: threads.MessagePort | threads.Worker);
    private tryPost;
    call(name: string, ...args: any): Promise<any>;
    register(name: string, fn: (...args: any) => any): Promise<any>;
    deregister(name: string): void;
}
