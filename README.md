# Port Agent

A RPC-like facility for making inter-thread function calls.

## Introduction

Port Agent provides a simple and intuitive interface that makes inter-thread function calls *easy*.

### Features
- Port Agent will marshal the return value or `Error` from the *other* thread back to the caller.
- The *other* thread may be the main thread or a worker thread.
- Registered functions (i.e., `Agent.register`) persist until deregistered (i.e., `Agent.deregister`) .
- Late binding registrants will be called with previously awaited invocations. 

## Table of Contents
1. [Concepts](#concepts)
1. [API](#api)
2. [Usage](#usage)
3. [Examples](#examples)
4. [Notes](#notes)

## Concepts

### Agent

An instance of an `Agent` facilitates communication across threads.  The `Agent` can be used in order to register a function in one thread and call it from another thread.  Calls may be made from the main thread to a worker thread, and conversely from a worker thread to the main thread.

Late binding registrants will be called with previously awaited invocations; thus preventing a race condition.  This means that you may await a call to a function that has not yet been registered.  Once the function is registered in the *other* thread it will be called and its return value or `Error` will be marshalled back to the caller.

Please see the [Examples](#examples) for variations on the `Agent`'s usage.

## API

### The `Agent` Class

#### port_agent.Agent(port)
- port `<threads.MessagePort>` or `<threads.Worker>` The message port.

#### agent.call\<T\>(name, ...args)
- name `<string>` The name of the registered function.
- ...args `<Array<unknown>>` Arguments to be passed to the registered function.

- Returns: `<Promise<T>>`

- Errors:

  - If the registered function in the *other* thread throws an `Error`, the `Error` will be marshalled back from the *other* thread to *this* thread and the `Promise` will reject with the `Error` as its failure reason.
  - If a worker thread throws an unhandled exception while a call is awaited, the `Error` will be marshalled back from the *other* thread to *this* thread and the `Promise` will reject with the unhandled exception as its failure reason.
  - If a worker exits while a call is awaited, the `Error` will be marshalled back from the *other* thread to *this* thread and the `Promise` will reject with the exit code as its failure reason.

#### agent.register(name, fn)
- name `<string>` The name of the registered function.
- fn `<(...args: Array<any>) => any>` The registered function.

- Returns: `<void>`

#### agent.deregister(name)
- name `<string>` The name of the registered function.

- Returns: `<void>`

## Usage

### How to create an `Agent` instance.

#### You can create a new `Agent` by passing a `parentPort` or a `Worker` instance to the `Agent` constructor:

In the main thread,
```ts
const worker = new Worker(fileURLToPath(import.meta.url));
const agent = new Agent(worker);
```
or, in a worker thread,
```ts
const agent = new Agent(worker_threads.parentPort);
```
### How to use an `Agent` instance.

#### You can register a function in the main thread or in a worker thread using the `Agent.register` method:

```ts
agent.register('hello_world', (value: string): string => `Hello, ${value} world!`);
```

#### You can call a function registered in another thread (i.e., the main thread or a worker thread) using the `Agent.call` method:

```ts
const greeting = await agent.call<string>('hello_world', 'happy');
console.log(greeting); // Hello, happy world!
```

## Examples

### A Simple Example

In this example you will:

1. Instantiate a worker thread.
2. Instantiate an `Agent` in the main thread.
3. Use the `Agent` to await a call to the `hello_world` function.
4. Instantiate an `Agent` in the worker thread.
5. Use the `Agent` in order to register a function named `abend` that will throw an `Error` when it is called.
6. Use the `Agent` in order to register a function named `hello_word` to handle calls to the `hello_world` function.
7. Use the `Agent` in order to register a function named `add` that will return the sum of two operands.
8. Resolve (3) and log the `greeting` to the console.
9. Use the `Agent` to await a call to the function named `add`.
10. Resolve (9) and log the `result` to the console.
11. Use the `Agent` to await a call to the function named `abend`.
12. Catch the `Error` from (11) and log the stack trace to the console.
13. Terminate the thread.

`examples/simple/index.js`
```js
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { Agent } from 'port_agent';

if (isMainThread) { // This is the main thread.
    void (async () => {
        const worker = new Worker(fileURLToPath(import.meta.url)); // (1)
        const agent = new Agent(worker); // (2)
        try {
            const greeting = await agent.call('hello_world', 'another'); // (3)
            console.log(greeting); // (8)

            const result = await agent.call('add', 1, 1); // (9)
            console.log(result); // (10)

            await agent.call('abend', "This Error is expected, indeed.") // (11)
        }
        catch (err) {
            console.error(err); // (12)
        }
        finally {
            worker.terminate(); // (13)
        }
    })();
}
else { // This is a worker thread.
    if (parentPort) {
        const agent = new Agent(parentPort); // (4)
        agent.register('abend', (message) => { throw new Error(message); }); // (5)
        agent.register('hello_world', (value) => `Hello, ${value} world!`); // (6)
        agent.register('add', (a, b) => a + b); // (7)
    }
}
```
The example will log to the console something similar to this:

```bash
Hello, another world!
2
Error: This Error is expected, indeed.
    at file:///port_agent/examples/simple/index.js:29:54
    at Agent.tryPost (/port_agent/examples/simple/node_modules/port_agent/dist/index.js:145:33)
    at MessagePort.<anonymous> (/port_agent/examples/simple/node_modules/port_agent/dist/index.js:114:36)
    at [nodejs.internal.kHybridDispatch] (node:internal/event_target:762:20)
    at exports.emitMessage (node:internal/per_context/messageport:23:28)
```

Please see the [Simple Example](https://github.com/faranalytics/port_agent/tree/main/examples/simple) for a working implementation.

### Test

In this test you will:

1. Instantiate a worker thread.
2. Instantiate an `Agent` in the main thread.
3. Use the `Agent` to call the `hello_world` function and await resolution.
    - At this point the `hello_world` function *has not* yet been registered in the worker thread.  The function will be called once it is registered.
4. Wait for the worker to come online.
5. Instantiate an `Agent` in the worker thread.
6. Use the `Agent` to register the `hello_world` function in the worker.
7. Use the `Agent` to register the `a_reasonable_assertion` function in the worker.
8. Use the `Agent` to call a `very_late_binding` function in the main thread *that is not yet registered*.
9. Use the `Agent` to call the function registered as `hello_world` and await resolution.
10. Resolve (3) and log the return value.
11. Resolve (8) and log the return value.
12. Use the `Agent` to call the function registered as `a_reasonable_assertion` and await resolution.
13. Resolve (12) and catch the Error and log the stack trace in the main thread.
    - The Error was marshalled from the Error produced by the reasonable assertion that was made in the `nowThrowAnError` function in the worker thread.
14. Terminate the worker thread asynchronously.
15. Await abends.
16. The worker thread exited; hence, log the exit code.
    - If an unhandled exception had occurred in the worker thread, it would have been handled accordingly.
17. Use the `Agent` to register a `very_late_binding` function in the main thread and log the long disposed thread's Id.

Please see the comments in the code that specify each of the steps above.  The output of the test is printed below.

`./tests/test/index.ts`
```ts
import { Worker, isMainThread, parentPort, threadId } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import { Agent } from 'port_agent';

if (isMainThread) { // This is the main thread.
    void (async () => {

        const worker = new Worker(fileURLToPath(import.meta.url)); // (1)
        const agent = new Agent(worker); // (2)

        worker.on('online', /*(4)*/ async () => {
            try {
                const greeting = await agent.call<string>('hello_world', 'again, another'); // (9)

                console.log(greeting); // (11)

                await agent.call('a_reasonable_assertion', 'To err is Human.'); // (12)
            }
            catch (err) {
                console.error(`Now, back in the main thread, we will handle the`, err); // (13)
            }
            finally {

                worker.terminate().catch(() => { }); // (14)

                setTimeout(async () => {
                    try {
                        await agent.call<string>('hello_world', 'no more...'); // (15)
                    }
                    catch (err) {
                        if (err instanceof Error) {
                            console.error(err);
                        }
                        else if (typeof err == 'number') {
                            console.log(`Exit code: ${err.toString()}`); // (16)
                        }
                    }

                    // The worker thread is terminated; however, the call to the `very_late_binding` function in the worker thread is still outstanding.
                    agent.register('very_late_binding', (value: number): void => console.log(`The worker's thread Id was ${value}.`)); // (17)

                }, 4);
            }
        });

        try {
            // This call will be invoked once the `hello_world` function has been bound in the worker.
            const greeting = await agent.call<string>('hello_world', 'another'); // (3)

            console.log(greeting); // (10)
        }
        catch (err) {
            console.error(err);
        }
    })();
} else { // This is a worker thread.

    function nowThrowAnError(message: string) {
        // This seems reasonable...
        assert.notEqual(typeof new Object(), typeof null, message);
    }

    function callAFunction(message: string) {
        nowThrowAnError(message);
    }

    if (parentPort) {
        try {
            const agent = new Agent(parentPort); // (5)

            agent.register('hello_world', (value: string): string => `Hello, ${value} world!`); // (6)
    
            // This will throw in the main thread.
            agent.register('a_reasonable_assertion', callAFunction); // (7).
    
            await agent.call<void>('very_late_binding', threadId); // (8)
        }
        catch(err) {
            console.error(err);
        }
    }
} 
```

This test should log to the console something that looks similar to this:

```bash
Hello, another world!
Hello, again, another world!
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
The worker's thread Id was 1.
```

#### Run the Test

##### Clone the repository.
```bash
git clone https://github.com/faranalytics/port_agent.git
```
##### Change directory into the root of the repository.
```bash
cd port_agent
```
##### Run the test.
```bash
npm run test
```
## Notes

### BroadcastChannels
Port Agent supports one to one communication over a `MessagePort`.  `BroadcastChannel`s are not presently supported.

### Support for Other Communication Medium
Port Agent is focused on supporting communication over `MessagePort`s.  Port Agent will not support communication over other communication systems e.g., `Socket`s.