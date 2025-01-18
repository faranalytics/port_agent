# A Comprehensive Example

## Introduction

This example provides a comprehensive demonstration of Port Agent's functionality.

## Implement the example

### Procedure

#### In this example you will:

1. Instantiate a worker thread.
2. Instantiate an `Agent` in the main thread.
3. Use the `Agent` to call the `hello_world` function and await resolution.
   - At this point the `hello_world` function _has not_ yet been registered in the worker thread. The function will be called once it is registered.
4. Wait for the worker to come online.
5. Instantiate an `Agent` in the worker thread.
6. Use the `Agent` to register the `hello_world` function in the worker.
7. Use the `Agent` to register the `a_reasonable_assertion` function in the worker.
8. Use the `Agent` to call a `very_late_binding` function in the main thread _that is not yet registered_.
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

Please see the comments in the code that specify each of the steps above. The output of the example is printed below.

### Implement the `index.ts` module

```ts
import {
  Worker,
  isMainThread,
  parentPort,
  threadId,
} from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";
import { Agent } from "port_agent";

if (isMainThread) {
  // This is the main thread.
  void (async () => {
    const worker = new Worker(fileURLToPath(import.meta.url)); // (1)
    const agent = new Agent(worker); // (2)

    worker.on(
      "online",
      /*(4)*/ async () => {
        try {
          const greeting = await agent.call<string>(
            "hello_world",
            "again, another"
          ); // (9)

          console.log(greeting); // (11)

          await agent.call("a_reasonable_assertion", "To err is Human."); // (12)
        } catch (err) {
          console.error(
            `Now, back in the main thread, we will handle the`,
            err
          ); // (13)
        } finally {
          worker.terminate().catch(() => {}); // (14)

          setTimeout(async () => {
            try {
              await agent.call<string>("hello_world", "no more..."); // (15)
            } catch (err) {
              if (err instanceof Error) {
                console.error(err);
              } else if (typeof err == "number") {
                console.log(`Exit code: ${err.toString()}`); // (16)
              }
            }

            // The worker thread is terminated; however, the call to the `very_late_binding` function in the worker thread is still outstanding.
            agent.register("very_late_binding", (value: number): void =>
              console.log(`The worker's thread Id was ${value}.`)
            ); // (17)
          }, 4);
        }
      }
    );

    try {
      // This call will be invoked once the `hello_world` function has been bound in the worker.
      const greeting = await agent.call<string>("hello_world", "another"); // (3)

      console.log(greeting); // (10)
    } catch (err) {
      console.error(err);
    }
  })();
} else {
  // This is a worker thread.

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

      agent.register(
        "hello_world",
        (value: string): string => `Hello, ${value} world!`
      ); // (6)

      // This will throw in the main thread.
      agent.register("a_reasonable_assertion", callAFunction); // (7).

      await agent.call<void>("very_late_binding", threadId); // (8)
    } catch (err) {
      console.error(err);
    }
  }
}
```

## Run the example

### How to run the example

#### Clone the repository.

```bash
git clone https://github.com/faranalytics/port_agent.git
```

#### Change directory into the relevant example directory.

```bash
cd port_agent/examples/comprehensive
```

#### Install the example dependencies.

```bash
npm install && npm update
```

#### Build the TypeScript application.

```bash
npm run clean:build
```

#### Run the application.

```bash
npm start
```

##### Output

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
