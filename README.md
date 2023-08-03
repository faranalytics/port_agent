# Port Agent

A RPC-like facility for making inter-thread function calls.

## Features
- Port Agent will marshall return values and Errors (stack traces) back to the caller.  
- Registered functions (i.e., Agent.register) are persistent.  
- Late binding registrants will be called with previously awaited invocations. 

## Examples

### A Simple Example
`index.ts`
```ts
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { Agent } from 'port_agent';

if (isMainThread) { // This is the Main Thread.
    (async () => {
        const worker = new Worker(fileURLToPath(import.meta.url));
        const agent = new Agent(worker);
        worker.on('online', async () => {
            try {
                let greeting = await agent.call('hello_world', 'again, another');
                console.log(greeting);
                await agent.call('error', 'To err is Human.');
            }
            catch (err) {
                console.error(`Now, back in the Main Thread, we will handle the`, err);
            }
            finally {
                worker.terminate();
            }
        });
        let greeting = await agent.call<string>('hello_world', 'another');
        console.log(greeting);
    })();
} else { // This is a Worker Thread.
    function nowThrowAnError(message:string) {
        throw new Error(message); // This will throw in the Main Thread.
    }
    function callAFunction(message:string) {
        nowThrowAnError(message);
    }
    if (parentPort) {
        const agent = new Agent(parentPort);
        agent.register('hello_world', (value: string) => `Hello ${value} world!`);
        agent.register('error', callAFunction);
    }
}  
```

This example should log to the console:

```bash
Hello another world!
Hello again, another world!
Now, back in the Main Thread, we will handle the Error: To err is Human.
    at nowThrowAnError (file:///index.js:30:15)
    at callAFunction (file:///home/adpatter/repositories/faranalytics/port_agent/test/index.js:33:9)
    at Agent.tryPost (/index.js:82:33)
    at MessagePort.<anonymous> (index.js:56:36)
    at [nodejs.internal.kHybridDispatch] (node:internal/event_target:762:20)
    at exports.emitMessage (node:internal/per_context/messageport:23:28)
```

#### Run Test
You can run the test using:
```bash
npm run test
```