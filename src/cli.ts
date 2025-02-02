#!/usr/bin/env node

import { C4Generator } from './generator';
import * as fs from 'fs';
import * as path from 'path';

function findConfigFile(startPath: string): string | null {
    let currentPath = startPath;
    
    while (true) {
        const configPath = path.join(currentPath, 'c4container.json');
        if (fs.existsSync(configPath)) {
            return configPath;
        }

        const parentPath = path.dirname(currentPath);
        if (parentPath === currentPath) {
            return null;
        }
        currentPath = parentPath;
    }
}

function main() {
    const args = process.argv.slice(2);
    let containerConfigPath: string | null = null;
    let generateDsl = false;

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--dsl') {
            generateDsl = true;
        } else if (!containerConfigPath) {
            const providedPath = path.resolve(args[i]);
            if (!fs.existsSync(providedPath)) {
                console.error(`Error: Config file not found at ${providedPath}`);
                process.exit(1);
            }
            containerConfigPath = providedPath;
        }
    }

    // Try to find config file if not provided
    if (!containerConfigPath) {
        containerConfigPath = findConfigFile(process.cwd());
        if (!containerConfigPath) {
            console.error('Error: Could not find c4container.json in current directory or any parent directory');
            process.exit(1);
        }
    }

    try {
        // Read and parse config
        const config = JSON.parse(fs.readFileSync(containerConfigPath, 'utf-8'));
        const configDir = path.dirname(containerConfigPath);
        const tsConfigPath = path.join(configDir, 'tsconfig.json');
        
        if (!fs.existsSync(tsConfigPath)) {
            console.error(`Error: tsconfig.json not found at ${tsConfigPath}`);
            process.exit(1);
        }

        // Initialize generator
        const generator = new C4Generator(config, configDir);
        
        // Generate model or DSL
        if (generateDsl) {
            console.log(generator.generateDSL());
        } else {
            console.log(JSON.stringify(generator.generate(), null, 2));
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error:', error.message);
        } else {
            console.error('An unknown error occurred');
        }
        process.exit(1);
    }
}

main(); 