#!/usr/bin/env node

import { Command } from 'commander';
import { C4Generator } from './container/generator';
import { C4WorkspaceParser } from './workspace/parser';
import { C4WorkspaceGenerator } from './workspace/generator';
import * as fs from 'fs';
import * as path from 'path';

function findConfigFile(startPath: string, fileName: string): string | undefined {
    let currentPath = startPath;
    
    while (true) {
        const configPath = path.join(currentPath, fileName);
        if (fs.existsSync(configPath)) {
            return configPath;
        }

        const parentPath = path.dirname(currentPath);
        if (parentPath === currentPath) {
            return undefined;
        }
        currentPath = parentPath;
    }
}

async function handleContainer(configPath: string | undefined, options: { dsl?: boolean }) {
    // Find or validate config file
    if (!configPath) {
        configPath = findConfigFile(process.cwd(), 'c4container.json');
        if (!configPath) {
            throw new Error('Could not find c4container.json in current directory or any parent directory');
        }
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const configDir = path.dirname(configPath);
    
    const generator = new C4Generator(config, configDir);
    
    if (options.dsl) {
        console.log(generator.generateDSL());
    } else {
        console.log(JSON.stringify(generator.generate(), null, 2));
    }
}

async function handleWorkspace(configPath: string | undefined) {
    // Find or validate config file
    if (!configPath) {
        configPath = findConfigFile(process.cwd(), 'c4workspace.json');
        if (!configPath) {
            throw new Error('Could not find c4workspace.json in current directory or any parent directory');
        }
    }

    const workspaceDir = path.dirname(configPath);
    const parser = new C4WorkspaceParser(workspaceDir);
    const templatePath = parser.getTemplatePath(configPath);
    
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found at ${templatePath}`);
    }

    const generator = new C4WorkspaceGenerator(templatePath);
    const data = await parser.parse(configPath);
    const dsl = await generator.generate(data);
    console.log(dsl);
}

async function main() {
    const program = new Command();

    program
        .name('c4-model-ts')
        .description('C4 Model documentation generator')
        .version('1.0.0');

    program.command('container')
        .description('Generate container documentation')
        .argument('[config-path]', 'path to c4container.json')
        .option('--dsl', 'generate DSL output instead of JSON')
        .action(async (configPath, options) => {
            try {
                await handleContainer(configPath, options);
            } catch (error: unknown) {
                if (error instanceof Error) {
                    console.error('Error:', error.message);
                } else {
                    console.error('An unknown error occurred');
                }
                process.exit(1);
            }
        });

    program.command('workspace')
        .description('Generate workspace documentation')
        .argument('[config-path]', 'path to c4workspace.json')
        .action(async (configPath) => {
            try {
                await handleWorkspace(configPath);
            } catch (error: unknown) {
                if (error instanceof Error) {
                    console.error('Error:', error.message);
                } else {
                    console.error('An unknown error occurred');
                }
                process.exit(1);
            }
        });

    await program.parseAsync();
}

main(); 