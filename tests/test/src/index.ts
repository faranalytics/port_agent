/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import { Agent } from 'port_agent';

if (isMainThread) { // This is the Main Thread.
    void (async () => {

        const worker = new Worker(fileURLToPath(import.meta.url));
        const agent = new Agent(worker);

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        worker.on('online', async () => {
            try {
                const greeting = await agent.call<string>('hello_world', 'again, another');

                console.log(greeting);
                
                await agent.call('error', 'To err is Human.');
            }
            catch (err) {
                console.error(`Now, back in the Main Thread, we will handle the`, err);
            }
            finally {
                void worker.terminate();
            }
        });

        const greeting = await agent.call<string>('hello_world', 'another'); // This call will be invoked once the `hello_world` function has been bound in the Worker.
        console.log(greeting);
    })();
} else { // This is a Worker Thread.

    function nowThrowAnError(message: string) {
        assert.notEqual(typeof new Object(), typeof null, message);
    }

    function callAFunction(message: string) {
        nowThrowAnError(message);
    }

    if (parentPort) {
        const agent = new Agent(parentPort);
        agent.register('hello_world', (value: string): string => `Hello ${value} world!`);
        agent.register('error', callAFunction);
    }
} 