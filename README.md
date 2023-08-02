# Port Agent

A RPC-like facility for making inter-thread function calls.

Port Agent will marshall return values and Errors (stack traces) back to the caller.  Registered functions (i.e., Agent.register) are persistent.  Late binding registrants will be called with previously awaited invocations. 

## Examples

### A Simple Example
`index.js`
```js
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { Agent } from 'port_agent';

if (isMainThread) {
    (async () => {
        const worker = new Worker(fileURLToPath(import.meta.url));
        const agent = new Agent(worker);
        worker.on('online', async () => {
            try {
                let greeting = await agent.call('hello_world', 'again, another');
                console.log(greeting);
                await agent.call('error', 'again, another');
            }
            catch (err) {
                console.error(err);
            }
            finally {
                worker.terminate();
            }
        });
        let greeting = await agent.call('hello_world', 'another');
        console.log(greeting);
    })();
} else {
    (async () => {
        const agent = new Agent(parentPort);
        await agent.register('hello_world', (value) => `Hello ${value} world!`);
        await agent.register('error', (value) => {
            throw new Error('To err is Human.');
        });
    })();
} 
```

This example should log to the console:

```bash
Hello another world!
Hello again, another world!
Error: To err is Human.
    at file:///index.js:30:19
    at Agent.tryPost (/index.js:82:33)
    at MessagePort.<anonymous> (/index.js:56:36)
    at [nodejs.internal.kHybridDispatch] (node:internal/event_target:762:20)
    at exports.emitMessage (node:internal/per_context/messageport:23:28)
```

### Subclassing Agent
The Agent constructor can effectively be used as shown in the [Simple Example](#a-simple-example) or it can be subclassed in order to act as a "wrapper" around Worker threads.  In this example the `Agent` class is subclassed by `WorkerAgent` in order to provide the state (i.e., `online` and `ready`) of a Worker Thread, which may be useful in some contexts.

```ts
import * as threads from 'node:worker_threads';
import * as net from 'node:net';
import { Agent } from 'port_agent';

interface WorkerAgentOptions {
    worker: threads.Worker;
    workerOnlineTimeout: number;
}

export class WorkerAgent extends Agent {
    public connections: number;
    public online: boolean;
    public exited: boolean;
    public proxyServerConnectOptions?: net.SocketConnectOpts;
    protected ready: Promise<boolean>;
    protected workerOnlineTimeout: number;

    constructor({
        worker,
        workerOnlineTimeout = 10000
    }: WorkerAgentOptions
    ) {
        super(worker);
        this.connections = 0;
        this.online = false;
        this.exited = false;
        this.workerOnlineTimeout = workerOnlineTimeout;

        this.ready = new Promise<boolean>((r, j) => {
            const timeout = setTimeout(() => {
                j(new Error(`Worker failed to come online in ${this.workerOnlineTimeout} milliseconds.`));
            }, this.workerOnlineTimeout);
            worker.on('online', () => {
                clearTimeout(timeout);
                this.online = true;
                r(true);
            });
        });

        worker.on('error', (err: Error) => {
            this.ready = Promise.reject(err);
        });

        void (async () => {
            try {
                await this.register('worker_exit', () => this.exited = true);
            }
            catch (err) {
                console.error(err);
            }
        })();
    }

    public async call(name: string, ...args: any): Promise<any> {
        await this.ready;
        return super.call(name, ...args);
    }

    public async register(name: string, fn: (...args: any) => any): Promise<any> {
        await this.ready;
        return super.register(name, fn);
    }
}
```