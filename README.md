# Port Agent

A RPC-like facility for making inter-thread function calls.

Port Agent will marshall return values and Errors (stack traces) back to the caller.  Registered functions (i.e., Agent.register) are persistent.  Late binding registrants will be called with previously awaited invocations. 

## Example
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

