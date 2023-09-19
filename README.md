# Port Agent

A RPC-like facility for making inter-thread function calls.

## Features
- Port Agent will marshall return values and Errors (stack traces) back to the caller.  
- Registered functions (i.e., Agent.register) are persistent.  
- Late binding registrants will be called with previously awaited invocations. 

## Examples

### A Simple Example
`./tests/test/index.ts`
```ts
if (isMainThread) { // This is the Main Thread.
    void (async () => {

        const worker = new Worker(fileURLToPath(import.meta.url));
        const agent = new Agent(worker);

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

        const greeting = await agent.call<string>('hello_world', 'another');
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
```

This example should log to the console:

```bash
Hello another world!
Hello again, another world!
Now, back in the Main Thread, we will handle the AssertionError [ERR_ASSERTION]: To err is Human.
    at nowThrowAnError (file:///port_agent/tests/test/dist/index.js:31:16)
    at callAFunction (file:///port_agent/tests/test/dist/index.js:34:9)
    at Agent.tryPost (/port_agent/dist/index.js:92:33)
    at MessagePort.<anonymous> (/port_agent/dist/index.js:62:36)
    at [nodejs.internal.kHybridDispatch] (node:internal/event_target:762:20)
    at exports.emitMessage (node:internal/per_context/messageport:23:28) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: 'object',
  expected: 'object',
  operator: 'notStrictEqual'
}
```

#### Run Test
You can run the test using:
```bash
npm run test
```