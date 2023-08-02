import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { Agent } from 'port_agent';

if (isMainThread) { // This is the Main Thread.
    (async () => {
        const worker = new Worker(fileURLToPath(import.meta.url));
        const agent = new Agent(worker);
        worker.on('online', async () => {
            try {
                let greeting = await agent.call('hello_world', 'again, another');
                console.log(greeting);
                await agent.call('error', 'again, another');
            }
            catch (err) {
                console.error(err);
            }
            finally {
                worker.terminate();
            }
        });
        let greeting = await agent.call('hello_world', 'another');
        console.log(greeting);
    })();
} else { // This is a Worker Thread.
    function nowThrowAnError() {
        throw new Error('To err is Human.');
    }
    function callAFunction() {
        nowThrowAnError();
    }
    const agent = new Agent(parentPort);
    agent.register('hello_world', (value) => `Hello ${value} world!`);
    agent.register('error', callAFunction);
} 