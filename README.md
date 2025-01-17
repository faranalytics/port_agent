# Port Agent

A RPC-like facility for making inter-thread function calls.

## Introduction

Port Agent provides a simple and intuitive interface that makes inter-thread function calls _easy_. Please see the [Usage](#usage) or [Examples](#examples) for instructions on how to use Port Agent in your application.

### Features

- Bi-directional inter-thread function calls.
- Port Agent will marshal the return value or `Error` from the _other_ thread back to the caller.
- The _other_ thread may be the main thread or a worker thread.
- Registered functions (i.e., `agent.register`) persist until deregistered (i.e., `agent.deregister`) .
- Late binding registrants will be called with previously awaited invocations.

## Table of Contents

- [Concepts](#concepts)
- [Usage](#usage)
- [Examples](#examples)
- [API](#api)
- [Versioning](#versioning)
- [Notes](#notes)
- [Support](#support)

## Concepts

### Agent

An instance of an `Agent` facilitates bi-directional communication between threads. The `Agent` can be used in order to register a function in one thread and call it from another thread. Calls may be made from the main thread to a worker thread, and conversely from a worker thread to the main thread.

Late binding registrants will be called with previously awaited invocations; thus preventing a race condition. This means that you may await a call to a function that has not yet been registered. Once the function is registered in the _other_ thread it will be called and its return value or `Error` will be marshalled back to the caller.

Please see the [Examples](#examples) for variations on the `Agent`'s usage.

## Usage

### Instructions

#### How to Create an Agent Instance

Import the Agent class from Port Agent.

```ts
import { Agent } from "port_agent";
```

You can create a new Agent by passing a MessagePort or Worker instance to the Agent constructor:

In the main thread,

```ts
const worker = new Worker(fileURLToPath(import.meta.url));
const agent = new Agent(worker);
```

or, in a worker thread,

```ts
const agent = new Agent(worker_threads.parentPort);
```

#### How to Use an Agent Instance

You can register a function in the main thread or in a worker thread using the Agent.register method:

```ts
agent.register(
  "hello_world",
  (value: string): string => `Hello, ${value} world!`
);
```

You can call a function registered in another thread (i.e., the main thread or a worker thread) using the Agent.call method:

```ts
const greeting = await agent.call<string>("hello_world", "happy");
console.log(greeting); // Hello, happy world!
```

## Examples

### _A Simple Example_ <sup><sup>\</Node.js\></sup></sup>

Please see the [Simple Example](https://github.com/faranalytics/port_agent/tree/main/examples/simple) for a working implementation.

### _A Comprehensive Example_ <sup><sup>\</TypeScript\></sup></sup>

Please see the [Comprehensive Example](https://github.com/faranalytics/port_agent/tree/main/examples/comprehensive) for a working implementation.

## API

### The Agent Class

#### new port_agent.Agent(port)

- port `<threads.MessagePort>` or `<threads.Worker>` The message port.

_public_ **agent.call\<T\>(name, ...args)**

- name `<string>` The name of the registered function.
- ...args `<Array<unknown>>` Arguments to be passed to the registered function.

Returns: `<Promise<T>>`

Errors:

- If the registered function in the _other_ thread throws an `Error`, the `Error` will be marshalled back from the _other_ thread to _this_ thread and the `Promise` will reject with the `Error` as its failure reason.
- If a worker thread throws an unhandled exception while a call is awaited, the `Error` will be marshalled back from the _other_ thread to _this_ thread and the `Promise` will reject with the unhandled exception as its failure reason.
- If a worker exits while a call is awaited, the `Error` will be marshalled back from the _other_ thread to _this_ thread and the `Promise` will reject with the exit code as its failure reason.

_public_ **agent.register(name, fn)**

- name `<string>` The name of the registered function.
- fn `<(...args: Array<any>) => any>` The registered function.

Returns: `<void>`

_public_ **agent.deregister(name)**

- name `<string>` The name of the registered function.

Returns: `<void>`

## Versioning

The Port Agent package adheres to semantic versioning. Breaking changes to the public API will result in a turn of the major. Minor and patch changes will always be backward compatible.

Excerpted from [Semantic Versioning 2.0.0](https://semver.org/):

> Given a version number MAJOR.MINOR.PATCH, increment the:
>
> 1. MAJOR version when you make incompatible API changes
> 2. MINOR version when you add functionality in a backward compatible manner
> 3. PATCH version when you make backward compatible bug fixes
>
> Additional labels for pre-release and build metadata are available as extensions to the MAJOR.MINOR.PATCH format.

## Notes

### Support for BroadcastChannels

Port Agent supports one to one communication over a `MessagePort`. `BroadcastChannel`s are not presently supported.

### Support for other Communication Channels

Port Agent is strictly focused on efficient communication over `MessagePort`s. Port Agent will not support communication over other communication channels e.g., `Socket`s, IPC, etc.

## Support

If you have a feature request or run into any issues, feel free to submit an [issue](https://github.com/faranalytics/port_agent/issues) or start a [discussion](https://github.com/faranalytics/port_agent/discussions). You’re also welcome to reach out directly to one of the authors at any time.

- [Adam Patterson](https://github.com/adamjpatterson)