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

    // Check if config path is provided
    if (args.length > 0) {
        const providedPath = path.resolve(args[0]);
        if (!fs.existsSync(providedPath)) {
            console.error(`Error: Config file not found at ${providedPath}`);
            process.exit(1);
        }
        containerConfigPath = providedPath;
    } else {
        // Try to find config file in current directory or parent directories
        containerConfigPath = findConfigFile(process.cwd());
        if (!containerConfigPath) {
            console.error('Error: Could not find c4container.json in current directory or any parent directory');
            process.exit(1);
        }
    }

    try {
        // Read and parse config
        const config = JSON.parse(fs.readFileSync(containerConfigPath, 'utf-8'));
        
        // Get tsconfig path relative to config location
        const configDir = path.dirname(containerConfigPath);
        const tsConfigPath = path.join(configDir, 'tsconfig.json');
        
        if (!fs.existsSync(tsConfigPath)) {
            console.error(`Error: tsconfig.json not found at ${tsConfigPath}`);
            process.exit(1);
        }

        // Initialize generator
        const generator = new C4Generator(containerConfigPath, tsConfigPath);
        
        // Generate model
        const model = generator.generate(config.source || ['**/*.ts']);

        // Output result
        console.log(JSON.stringify(model, null, 2));
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