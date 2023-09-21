# Port Agent

A RPC-like facility for making inter-thread function calls.

## Features
- Port Agent will marshall the return value or `Error` back to the caller.  
- Registered functions (i.e., Agent.register) are persistent.
- Late binding registrants will be called with previously awaited invocations. 

## Table of Contents
1. [API](#api)
2. [Examples](#examples)

## API

### The `Agent` Class

#### port_agent.Agent(port)
- port `<threads.MessagePort>` or `<threads.Worker>` The message port.

#### agent.call\<T\>(name, ...args)
- name `<string>` The name of the registered function.
- ...args `<Array<unknown>>` Arguments to be passed to the registered function.

- Returns: `<Promise<T>>`

#### agent.register(name, fn)
- name `<string>` The name of the registered function.
- fn `<(...args: Array<any>) => any>` The registered function.

- Returns: `<void>`

#### agent.deregister(name)
- name `<string>` The name of the registered function.

- Returns: `<void>`

## Examples

### An Example
`./tests/test/index.ts`
```ts
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import { Agent } from 'port_agent';

if (isMainThread) { // This is the Main Thread.
    void (async () => {

        const worker = new Worker(fileURLToPath(import.meta.url));
        const agent = new Agent(worker);

        worker.on('online', async () => {
            try {
                const greeting = await agent.call<string>('hello_world', 'again, another');

                console.log(greeting);
                
                await agent.call('error', 'To err is Human.');
            }
            catch (err) {
                console.error(`Now, back in the Main Thread, we will handle the`, err);
            }
            finally {
                void worker.terminate();
            }
        });

        const greeting = await agent.call<string>('hello_world', 'another'); // This call will be invoked once the `hello_world` function has been bound in the Worker.
        console.log(greeting);
    })();
} else { // This is a Worker Thread.

    function nowThrowAnError(message: string) {
        assert.notEqual(typeof new Object(), typeof null, message);
    }

    function callAFunction(message: string) {
        nowThrowAnError(message);
    }

    if (parentPort) {
        const agent = new Agent(parentPort);
        agent.register('hello_world', (value: string): string => `Hello ${value} world!`);
        agent.register('error', callAFunction);
    }
} 
```

This example should log to the console:

```bash
Hello another world!
Hello again, another world!
Now, back in the Main Thread, we will handle the AssertionError [ERR_ASSERTION]: To err is Human.
    at nowThrowAnError (file:///port_agent/tests/test/dist/index.js:31:16)
    at callAFunction (file:///port_agent/tests/test/dist/index.js:34:9)
    at Agent.tryPost (/port_agent/dist/index.js:92:33)
    at MessagePort.<anonymous> (/port_agent/dist/index.js:62:36)
    at [nodejs.internal.kHybridDispatch] (node:internal/event_target:762:20)
    at exports.emitMessage (node:internal/per_context/messageport:23:28) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: 'object',
  expected: 'object',
  operator: 'notStrictEqual'
}
```

#### Run the test.
You can run the test using:
```bash
npm run test
```