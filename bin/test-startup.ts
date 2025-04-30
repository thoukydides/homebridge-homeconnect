// Homebridge plugin for Home Connect home appliances
// Copyright © 2024 Alexander Thoukydides

import assert from 'node:assert';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';

// Command to use to launch Homebridge
const SPAWN_COMMAND = 'homebridge';
const SPAWN_ARGS = '-D -I -P .. --strict-plugin-resolution'.split(' ');

// Log messages indicating success
const SUCCESS_TESTS: { name: string, regexp: RegExp }[] = [
    // eslint-disable-next-line max-len
    { name: 'Startup', regexp: /\[HomeConnect\] (Please authorise access to your appliances(.*) using the associated Home Connect or SingleKey ID email address by visiting:|Starting events stream for all appliances)/ }
];

// Length of time to wait
const TIMEOUT_HOMEBRIDGE_MS = 15 * 1000; // 15 seconds

// Run the plugin test
let rawOutput = '';
async function testPlugin(): Promise<void> {
    // Launch Homebridge, piping stdout and stderr for monitoring
    const child = spawn(SPAWN_COMMAND, SPAWN_ARGS, {
        stdio:      'pipe',
        timeout:    TIMEOUT_HOMEBRIDGE_MS
    });

    // Monitor stdout and stderr until they close
    let remainingTests = SUCCESS_TESTS;
    const testOutputStream = async (
        child: ChildProcessWithoutNullStreams,
        streamName: 'stdout' | 'stderr'
    ): Promise<void> => {
        const stream = child[streamName];
        stream.setEncoding('utf8');
        for await (const chunk of stream) {
            assert(typeof chunk === 'string');
            const cleanChunk = chunk.toString();
            rawOutput += cleanChunk;

            // Check for all of the expected log messages
            remainingTests = remainingTests.filter(({ regexp }) => !regexp.test(cleanChunk));
            if (remainingTests.length === 0) child.kill('SIGTERM');
        }
    };
    await Promise.all([
        testOutputStream(child, 'stdout'),
        testOutputStream(child, 'stderr')
    ]);

    // Check whether the test was successful
    // (Don't check exitCode; SIGTERM causes Homebridge to exit with non-zero)
    //if (child.exitCode !== null) {
    //    throw new Error(`Process exited with code ${child.exitCode}`);
    //}
    if (remainingTests.length) {
        const failures = remainingTests.map(t => t.name).join(', ');
        throw new Error(`Process terminated with test failures: ${failures}`);
    }
}

// Run the test
void (async (): Promise<void> => {
    try {

        // Run the test
        console.log('🔍 Running Homebridge plugin test...');
        await testPlugin();

        // If this point is reached, the test was successful
        console.log('🟢 Test successful');

    } catch (err) {

        // The test failed so log the command output
        console.log(rawOutput);

        // Extract and log the individual error messages
        const errs = err instanceof AggregateError ? err.errors : [err];
        const messages = errs.map(e => e instanceof Error ? e.message : String(e));
        console.error('🔴 Test failed:\n' + messages.map(m => `    ${m}\n`).join(''));

        // Return a non-zero exit code
        process.exitCode = 1;
    }
})();