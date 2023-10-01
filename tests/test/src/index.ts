/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Worker, isMainThread, parentPort, threadId } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import { Agent } from 'port_agent';

if (isMainThread) { // This is the main thread.
    void (async () => {

        const worker = new Worker(fileURLToPath(import.meta.url)); // (1)
        const agent = new Agent(worker); // (2)

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        worker.on('online', /*(4)*/ async () => {
            try {
                const greeting = await agent.call<string>('hello_world', 'again, another'); // (9)

                console.log(greeting); // (11)

                await agent.call('a_reasonable_assertion', 'To err is Human.'); // (12)
            }
            catch (err) {
                console.error(`Now, back in the main thread, we will handle the`, err); // (13)
            }
            finally {

                void worker.terminate(); // (14)

                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                setTimeout(async () => {
                    try {
                        await agent.call<string>('hello_world', 'no more...'); // (15)
                    }
                    catch (err) {
                        if (err instanceof Error) {
                            console.error(err);
                        }
                        else if (typeof err == 'number') {
                            console.log(`Exit code: ${err.toString()}`); // (16)
                        }
                    }

                    agent.register('very_late_binding', (value: number): void => console.log(`The worker's thread ID was ${value}.`)); // (17)

                }, 4);
            }
        });

        try {
            // This call will be invoked once the `hello_world` function has been bound in the worker.
            const greeting = await agent.call<string>('hello_world', 'another'); // (3)

            console.log(greeting); // (10)
        }
        catch (err) {
            console.error(err);
        }
    })();
} else { // This is a worker thread.

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

            agent.register('hello_world', (value: string): string => `Hello, ${value} world!`); // (6)
    
            // This will throw in the main thread.
            agent.register('a_reasonable_assertion', callAFunction); // (7).
    
            await agent.call<void>('very_late_binding', threadId); // (8)
        }
        catch(err) {
            console.error(err);
        }
    }
} 