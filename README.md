# Port Agent

A RPC-like facility for making inter-thread function calls.

## Introduction

Port Agent provides a simple and intuitive interface that makes inter-thread function calls *easy*.  Please see the [Usage](#usage) or [Examples](#examples) for instructions on how to use Port Agent in your application.

### Features
- Port Agent will marshal the return value or `Error` from the *other* thread back to the caller.
- The *other* thread may be the main thread or a worker thread.
- Registered functions (i.e., `Agent.register`) persist until deregistered (i.e., `Agent.deregister`) .
- Late binding registrants will be called with previously awaited invocations. 

## Table of Contents
- [Concepts](#concepts)
    - [Agent](#agent)
- [API](#api)
- [Usage](#usage)
    - [How to create an Agent instance.](#how-to-create-an-agent-instance)
- [Examples](#examples)
    - [A simple example.](#a-simple-example-example)
    - [A comprehensive example.](#a-comprehensive-example-example)
- [Notes](#notes)
    - [Support for BroadcastChannels.](#support-for-broadcastchannels)
    - [Support for other communication channels.](#support-for-other-communication-channels)

## Concepts

### Agent

An instance of an `Agent` facilitates communication across threads.  The `Agent` can be used in order to register a function in one thread and call it from another thread.  Calls may be made from the main thread to a worker thread, and conversely from a worker thread to the main thread.

Late binding registrants will be called with previously awaited invocations; thus preventing a race condition.  This means that you may await a call to a function that has not yet been registered.  Once the function is registered in the *other* thread it will be called and its return value or `Error` will be marshalled back to the caller.

Please see the [Examples](#examples) for variations on the `Agent`'s usage.

## API

### The `Agent` class.

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

#### Import the Agent class from Port Agent.

```ts
import { Agent } from 'port_agent';
```
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

### *A simple example.* <sup><sup>(example)</sup></sup>

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

Please see the [Simple example](https://github.com/faranalytics/port_agent/tree/main/examples/simple) for a working implementation.

### *A comprehensive example.* <sup><sup>(example)</sup></sup>
Please see the [Comprehensive example](https://github.com/faranalytics/port_agent/tree/main/examples/comprehensive) for a working implementation.

## Notes

### Support for BroadcastChannels.
Port Agent supports one to one communication over a `MessagePort`.  `BroadcastChannel`s are not presently supported.

### Support for other communication channels.
Port Agent is strictly focused on efficient communication over `MessagePort`s.  Port Agent will not support communication over other communication channels e.g., `Socket`s, IPC, etc.