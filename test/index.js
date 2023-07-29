import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { Agent } from 'port_agent';

if (isMainThread) {
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
} else {
    (async () => {
        const agent = new Agent(parentPort);
        await agent.register('hello_world', (value) => `Hello ${value} world!`);
        await agent.register('error', (value) => {
            throw new Error('To err is Human.');
        });
    })();
} 