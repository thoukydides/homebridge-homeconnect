// Homebridge plugin for Home Connect home appliances
// Copyright © 2024 Alexander Thoukydides

import { spawn } from 'child_process';
import assert from 'node:assert';
import { setTimeout as setTimeoutP } from 'node:timers/promises';

// Command to use to launch Homebridge
const SPAWN_COMMAND = 'homebridge';
const SPAWN_ARGS = '-D -I -P .. --strict-plugin-resolution'.split(' ');

// Log messages indicating success
// eslint-disable-next-line max-len
const SUCCESS_OUTPUT_REGEX = /\[HomeConnect\] (Please authorise access to your appliances(.*) using the associated Home Connect or SingleKey ID email address by visiting:|Starting events stream for all appliances)/;

// Length of time to wait for the message
const TIMEOUT_MS = 15 * 1000; // (15 seconds)

// Collect stdout and stderr, checking for success message(s)
let homebridgeOutput = '';
async function checkHomebridgeOutput(name: string, stream: NodeJS.ReadableStream): Promise<void> {
    stream.setEncoding('utf8');
    for await (const chunk of stream) {
        assert(typeof chunk === 'string');
        homebridgeOutput += chunk.toString();

        // Check for the expected log messages
        if (SUCCESS_OUTPUT_REGEX.test(homebridgeOutput)) return;
    }

    // Stream should only terminate if the process is killed
    throw new Error(`Unexpected ${name} termination`);
};

// Timeout
async function timeout(ms: number): Promise<never> {
    await setTimeoutP(ms);
    throw new Error('Timeout waiting for expected output');
};

// Run the test
void (async (): Promise<void> => {
    // Attempt to launch Homebridge
    const homebridge = spawn(SPAWN_COMMAND, SPAWN_ARGS, { stdio: 'pipe' });
    try {
        // Collect stdout and stderr, checking for success message(s)
        await Promise.race([
            checkHomebridgeOutput('stdout', homebridge.stdout),
            checkHomebridgeOutput('stderr', homebridge.stderr),
            timeout(TIMEOUT_MS)
        ]);

        // The expected log messages were seen
        console.log('Test successful');

    } catch (err) {

        // Test finished without seeing the expected log messages
        const errs = err instanceof AggregateError ? err.errors : [err];
        const messages = errs.map(e => e instanceof Error ? e.message : String(e));
        if (homebridge.exitCode !== null) messages.unshift(`Homebridge exited with code ${homebridge.exitCode}`);
        console.error('Test failed:\n' + messages.map(m => `    ${m}\n`).join(''));
        console.log(homebridgeOutput);
        process.exitCode = 1;

    } finally {
        // Terminate the homebridge process at the end of the test
        homebridge.kill('SIGTERM');
    }
})();