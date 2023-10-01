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