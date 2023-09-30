import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { Agent } from 'port_agent';

if (isMainThread) { // This is the main thread.
    void (async () => {
        try {
            const worker = new Worker(fileURLToPath(import.meta.url)); // (1)
            const agent = new Agent(worker); // (2)
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