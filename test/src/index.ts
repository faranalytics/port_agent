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
                await agent.call('error', 'To err is Human.');
            }
            catch (err) {
                console.error(`Now, back in the Main Thread, we will handle the`, err);
            }
            finally {
                worker.terminate();
            }
        });
        let greeting = await agent.call<string>('hello_world', 'another');
        console.log(greeting);
    })();
} else { // This is a Worker Thread.
    function nowThrowAnError(message:string) {
        throw new Error(message); // This will throw in the Main Thread.
    }
    function callAFunction(message:string) {
        nowThrowAnError(message);
    }
    if (parentPort) {
        const agent = new Agent(parentPort);
        agent.register('hello_world', (value: string) => `Hello ${value} world!`);
        agent.register('error', callAFunction);
    }
} 