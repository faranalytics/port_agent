# *A Simple Example*

In this example you will:

1. Instantiate a worker thread.
2. Instantiate an `Agent` in the main thread.
3. Use the `Agent` to call the `hello_world` function.
4. Instantiate an `Agent` in the worker thread.
5. Use the `Agent` in order to register a function to handle calls to the `hello_world` function.
6. Resolve (3) and log the result to the console.

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
            console.log(greeting); // (6)
        }
        catch (err) {
            console.error(err);
        }
        finally {
            worker.terminate();
        }
    })();
}
else { // This is a worker thread.
    if (parentPort) {
        const agent = new Agent(parentPort); // (4)
        agent.register('hello_world', (value) => `Hello, ${value} world!`); // (5)
    }
}
```
## Instructions

### Clone the Port Agent repo.
```bash
git clone https://github.com/faranalytics/port_agent.git
```
### Change directory into the relevant example directory.
```bash
cd port_agent/examples/simple
```
### Install the example dependencies.
```bash
npm install && npm update
```
### Run the application.
```bash
npm start
```
#### Output
```bash
Hello, another world!
```