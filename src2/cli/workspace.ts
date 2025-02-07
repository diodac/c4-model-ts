#!/usr/bin/env node

import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { Command } from 'commander';
import { WorkspaceAnalyzer } from '../workspace/analyzer';

const program = new Command();

program
    .name('c4-workspace')
    .description('Analyze C4 workspace TypeScript codebase for containers and their relations')
    .argument('<config>', 'path to c4workspace.json file')
    .option('-u, --undeclared', 'show only undeclared relations')
    .option('-i, --invalid', 'show only invalid relations')
    .option('-c, --containers', 'show only containers')
    .option('-j, --json', 'output raw JSON')
    .action(async (configPath, options) => {
        const resolvedPath = resolve(configPath);
        const configDir = dirname(resolvedPath);

        // Load workspace schema
        const schemaPath = resolve(__dirname, '../../schema/c4workspace.json');
        const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

        // Initialize analyzer with configuration
        const analyzer = new WorkspaceAnalyzer({
            configPath: resolvedPath
        }, schema);

        // Analyze workspace
        const result = await analyzer.analyze({
            includeUndeclared: options.undeclared || (!options.containers && !options.invalid),
            includeInvalid: options.invalid || (!options.containers && !options.undeclared)
        });

        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }

        // Show containers if requested or no specific option
        if (options.containers || (!options.undeclared && !options.invalid)) {
            console.log(`\nFound ${result.containers.length} containers:`);

            for (const container of result.containers) {
                console.log(`\n[${container.data.name}]`);
                console.log(`Description: ${container.data.description}`);
                if (container.data.technology) {
                    console.log(`Technology: ${container.data.technology}`);
                }
                if (container.data.tags?.length) {
                    console.log(`Tags: ${container.data.tags.join(', ')}`);
                }
                console.log(`Source: ${container.data.sourcePath}`);

                // Show components
                if (container.analysis.components.length > 0) {
                    console.log('\nComponents:');
                    for (const component of container.analysis.components) {
                        console.log(`  → ${component.metadata.name}`);
                        console.log(`    Description: ${component.metadata.description}`);
                        if (component.metadata.technology) {
                            console.log(`    Technology: ${component.metadata.technology}`);
                        }
                        if (component.metadata.tags?.length) {
                            console.log(`    Tags: ${component.metadata.tags.join(', ')}`);
                        }
                    }
                }
            }
        }

        // Show relations between containers
        if (result.relations.length > 0) {
            console.log('\nContainer Relations:');
            for (const relation of result.relations) {
                console.log(`\n${relation.source} → ${relation.target}`);
                console.log(`Description: ${relation.description}`);
                if (relation.technology) {
                    console.log(`Technology: ${relation.technology}`);
                }
            }
        }
    });

program.parse(); 