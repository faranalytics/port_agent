# Port Agent

A RPC-like facility for making inter-thread function calls.

Port Agent will marshall return values and Errors (stack traces) back to the caller.  Registered functions (i.e., Agent.register) are persistent.  Late binding registrants will be called with previously awaited invocations. 

## Example

This example should log the string "Hello another world!" to the console.

```js
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { Agent } from 'port_agent';

if (isMainThread) {
    const worker = new Worker(fileURLToPath(import.meta.url));
    const agent = new Agent(worker);
    worker.on('online', async ()=>{
        let greeting = await agent.call('hello_world', 'another');
        console.log(greeting);
        worker.terminate();
    });
} else {
    (async () => {
        const agent = new Agent(parentPort);
        await agent.register('hello_world', (value) => `Hello ${value} world!`);
    })();
} 
```