# Port Agent

A RPC-like facility for making inter-thread function calls.

## Features
- Port Agent will marshall the return value or `Error` back to the caller.  
- Registered functions (i.e., `Agent.register`) are persistent and can be deregistered using the `Agent.deregister` method.
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

## Usage

You can create a new `Agent` by passing a `parentPort` or a `Worker` instance to the `Agent` constructor:

```ts
        const worker = new Worker(fileURLToPath(import.meta.url));
        const agent = new Agent(worker);
```

You can register a function in the main thread or in a Worker thread using the `Agent.register` method:

```ts
        agent.register('hello_world', (value: string): string => `Hello ${value} world!`);
```

You can call a function in the main thread or in a Worker thread using the `Agent.call` method:

```ts
        const greeting = await agent.call<string>('hello_world', 'happy');
```

## Examples

### An Example

In this example you will:

1. Instantiate a Worker thread.
2. Instantiate an Agent in the Main thread.
3. Use the Agent to call the `hello_world` function.
    - At this point the `hello_world` function *has not* yet been registered in the Worker thread.
4. Wait for the Worker to come online.
5. Instantiate an Agent in the Worker thread.
6. Use the Agent to register the `hello_world` function in the Worker.
7. Use the Agent to register the `a_reasonable_assertion` function in the Worker.
8. Use the Agent to call the function registered as `hello_world`.
9. Await (3) and log the return value.
10. Await (8) and log the return value.
11. Use the Agent to call the function registered as `a_reasonable_assertion`.
12. Await (11) and catch the Error and log the stack trace in the Main thread.
    - The Error was marshalled from the Error produced by the reasonable assertion that was made in the `nowThrowAnError` function in the Worker thread.
13. Terminate the Worker asynchronously.
14. Await abends.
15. The Worker exited; hence, log the exit code.
    - If an unhandled exception had occured in the Worker it would have been handled accordingly.

Please see the comments in the code that specify each of the steps above.

`./tests/test/index.ts`
```ts
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import { Agent } from 'port_agent';

if (isMainThread) { // This is the Main Thread.
    void (async () => {

        const worker = new Worker(fileURLToPath(import.meta.url)); // (1)
        const agent = new Agent(worker); // (2)

        worker.on('online', async () => { // (4)
            try {
                const greeting = await agent.call<string>('hello_world', 'again, another'); // (8)

                console.log(greeting); // (10)

                await agent.call('a_reasonable_assertion', 'To err is Human.'); // (11)
            }
            catch (err) {
                console.error(`Now, back in the Main Thread, we will handle the`, err); // (12)
            }
            finally {

                void worker.terminate(); // (13)

                try {
                    await agent.call<string>('hello_world', 'no more...'); // (14)
                }
                catch (err) {
                    if (err instanceof Error) {
                        console.error(err);
                    }
                    else if (typeof err == 'number') {
                        console.log(`Exit code: ${err.toString()}`); // (15)
                    }
                }
            }
        });

        // This call will be invoked once the `hello_world` function has been bound in the Worker.
        const greeting = await agent.call<string>('hello_world', 'another'); // (3)

        console.log(greeting); // (9)
    })();
} else { // This is a Worker Thread.

    function nowThrowAnError(message: string) {
        // This seems reasonable...
        assert.notEqual(typeof new Object(), typeof null, message);
    }

    function callAFunction(message: string) {
        nowThrowAnError(message);
    }

    if (parentPort) {
        const agent = new Agent(parentPort); // (5)

        agent.register('hello_world', (value: string): string => `Hello ${value} world!`); // (6)

        // This will throw in the Main thread
        agent.register('a_reasonable_assertion', callAFunction); // (7).
    }
} 
```

This example should log to the console something that looks similar to this:

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
Exit code: 1
```

#### Run the test.
You can run the test using:
```bash
npm run test
```