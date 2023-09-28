/// <reference types="node" />
import * as threads from 'node:worker_threads';
interface CallOptions<T> {
    id: string;
    name: string;
    r: (value: T) => void;
    j: (reason?: any) => void;
}
declare class Call<T> {
    id: string;
    name: string;
    r: (value: T) => void;
    j: (reason?: any) => void;
    constructor({ id, name, r, j }: CallOptions<T>);
}
interface CallMessageOptions {
    id: string;
    name: string;
    args: Array<unknown>;
}
declare class CallMessage {
    type: string;
    id: string;
    name: string;
    args: Array<unknown>;
    constructor({ id, name, args }: CallMessageOptions);
}
export declare class Agent {
    port: threads.MessagePort | threads.Worker;
    calls: Set<Call<any>>;
    messages: Set<CallMessage>;
    registrar: Map<string, (...args: Array<any>) => any>;
    constructor(port: threads.MessagePort | threads.Worker);
    protected tryPost(fn: (...args: Array<unknown>) => unknown, message: CallMessage): Promise<void>;
    call<T>(name: string, ...args: Array<unknown>): Promise<T>;
    register(name: string, fn: (...args: Array<any>) => any): void;
    deregister(name: string): void;
}
export {};
