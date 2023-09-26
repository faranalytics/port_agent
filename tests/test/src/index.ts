/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import { Agent } from 'port_agent';

if (isMainThread) { // This is the Main Thread.
    void (async () => {

        const worker = new Worker(fileURLToPath(import.meta.url)); // (1)
        const agent = new Agent(worker); // (2)

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        worker.on('online', async () => { // (4)
            try {
                const greeting = await agent.call<string>('hello_world', 'again, another'); // (8)

                console.log(greeting); // (10)

                await agent.call('a_reasonable_assertion', 'To err is Human.'); // (11)
            }
            catch (err) {
                console.error(`Now, back in the Main Thread, we will handle the`, err); // (12)
            }
            finally {

                void worker.terminate(); // (13)

                try {
                    await agent.call<string>('hello_world', 'no more...'); // (14)
                }
                catch (err) {
                    if (err instanceof Error) {
                        console.error(err);
                    }
                    else if (typeof err == 'number') {
                        console.log(`Exit code: ${err.toString()}`); // (15)
                    }
                }
            }
        });

        // This call will be invoked once the `hello_world` function has been bound in the Worker.
        const greeting = await agent.call<string>('hello_world', 'another'); // (3)

        console.log(greeting); // (9)
    })();
} else { // This is a Worker Thread.

    function nowThrowAnError(message: string) {
        // This seems reasonable...
        assert.notEqual(typeof new Object(), typeof null, message);
    }

    function callAFunction(message: string) {
        nowThrowAnError(message);
    }

    if (parentPort) {
        const agent = new Agent(parentPort); // (5)

        agent.register('hello_world', (value: string): string => `Hello ${value} world!`); // (6)

        // This will throw in the Main thread
        agent.register('a_reasonable_assertion', callAFunction); // (7).
    }
} 