#!/usr/bin/env zx

try {
    // Check if bun is installed
    await $`which bun`;
} catch {
    // Install bun
    await $`curl -fsSL https://bun.sh/install | bash`;
}

// Install deps using bun
await $`bun i`;

// Start the script
await $`bun run ./src/index.ts`;
