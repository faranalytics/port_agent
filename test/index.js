import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { Agent } from 'port_agent';

if (isMainThread) {
    const worker = new Worker(fileURLToPath(import.meta.url));
    const agent = new Agent(worker);
    worker.on('online', async ()=>{
        let greeting = await agent.call('hello_world', 'another');
        console.log(greeting);
        worker.terminate();
    });
} else {
    (async () => {
        const agent = new Agent(parentPort);
        await agent.register('hello_world', (value) => `Hello ${value} world!`);
    })();
} 