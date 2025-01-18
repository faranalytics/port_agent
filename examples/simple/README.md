# A Simple Example

## Introduction

This example provides a simple demonstration of Port Agent's functionality.

## Implement the example

### Procedure

#### In this example you will:

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

### Implement the `index.js` module

```js
import { Worker, isMainThread, parentPort } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { Agent } from "port_agent";

if (isMainThread) {
  // This is the main thread.
  void (async () => {
    const worker = new Worker(fileURLToPath(import.meta.url)); // (1)
    const agent = new Agent(worker); // (2)
    try {
      const greeting = await agent.call("hello_world", "another"); // (3)
      console.log(greeting); // (8)

      const result = await agent.call("add", 1, 1); // (9)
      console.log(result); // (10)

      await agent.call("abend", "This Error is expected, indeed."); // (11)
    } catch (err) {
      console.error(err); // (12)
    } finally {
      worker.terminate(); // (13)
    }
  })();
} else {
  // This is a worker thread.
  if (parentPort) {
    const agent = new Agent(parentPort); // (4)
    agent.register("abend", (message) => {
      throw new Error(message);
    }); // (5)
    agent.register("hello_world", (value) => `Hello, ${value} world!`); // (6)
    agent.register("add", (a, b) => a + b); // (7)
  }
}
```

## Run the example

### How to run the example

#### Clone the Port Agent repo.

```bash
git clone https://github.com/faranalytics/port_agent.git
```

#### Change directory into the relevant example directory.

```bash
cd port_agent/examples/simple
```

#### Install the example dependencies.

```bash
npm install && npm update
```

#### Run the application.

```bash
npm start
```

##### Output

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
