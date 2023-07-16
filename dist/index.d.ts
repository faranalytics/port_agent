/// <reference types="node" resolution-mode="require"/>
import * as threads from 'node:worker_threads';
export declare class Agent {
    protected port: threads.MessagePort | threads.Worker;
    private calls;
    private messages;
    private func;
    constructor(port: threads.MessagePort | threads.Worker);
    private tryPost;
    call(name: string, ...args: any): Promise<any>;
    register(name: string, fn: (...args: any) => any): Promise<any>;
}
