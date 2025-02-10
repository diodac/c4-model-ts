#!/usr/bin/env node

import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { Command } from 'commander';
import { WorkspaceAnalyzer, WorkspaceAnalyzerConfig } from '../workspace/analyzer';
import { WorkspaceConfigLoader } from '../workspace/config-loader';
import { simplifyUndeclaredRelationships } from '../common/relationship-simplifier';

const program = new Command();

program
    .name('c4-workspace')
    .description('Analyze C4 workspace TypeScript codebase for systems, containers and their relations')
    .argument('<config>', 'path to c4workspace.json file')
    .option('-u, --undeclared', 'show only undeclared relations')
    .option('-i, --invalid', 'show only invalid relations')
    .option('-c, --containers', 'show only containers')
    .option('-r, --relations', 'show only relations')
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
            includeUndeclared: options.undeclared || (!options.containers && !options.invalid && !options.relations),
            includeInvalid: options.invalid || (!options.containers && !options.undeclared && !options.relations)
        });

        if (options.json) {
            // Simplify component information in undeclared relations
            const simplifiedResult = {
                ...result,
                systems: result.systems.map(system => ({
                    ...system,
                    containers: system.containers.map(container => ({
                        ...container,
                        analysis: simplifyUndeclaredRelationships(container.analysis)
                    }))
                }))
            };
            console.log(JSON.stringify(simplifiedResult, null, 2));
            return;
        }

        // Show only relations if requested
        if (options.relations) {
            console.log('\nRelations across all systems:');
            for (const system of result.systems) {
                if (system.relationships.length > 0) {
                    console.log(`\n[System: ${system.name}]`);
                    for (const relationship of system.relationships) {
                        console.log(`\n${relationship.source} → ${relationship.target}`);
                        if (relationship.description) {
                            console.log(`Description: ${relationship.description}`);
                        }
                        if (relationship.technology) {
                            console.log(`Technology: ${relationship.technology}`);
                        }
                    }
                }
            }
            return;
        }

        // Show systems and their containers if requested or no specific option
        if (options.containers || (!options.undeclared && !options.invalid)) {
            console.log(`\nFound ${result.systems.length} systems:`);

            for (const system of result.systems) {
                console.log(`\n[System: ${system.name}]`);
                if (system.description) {
                    console.log(`Description: ${system.description}`);
                }
                console.log(`ID: ${system.id}`);

                console.log(`\nFound ${system.containers.length} containers:`);

                for (const container of system.containers) {
                    console.log(`\n[${container.data.name}]`);
                    if (container.data.description) {
                        console.log(`Description: ${container.data.description}`);
                    }
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
                            if (component.metadata.description) {
                                console.log(`    Description: ${component.metadata.description}`);
                            }
                            if (component.metadata.technology) {
                                console.log(`    Technology: ${component.metadata.technology}`);
                            }
                            if (component.metadata.tags?.length) {
                                console.log(`    Tags: ${component.metadata.tags.join(', ')}`);
                            }
                        }
                    }
                }

                // Show relationships between containers in this system
                if (system.relationships.length > 0) {
                    console.log('\nContainer Relationships:');
                    for (const relationship of system.relationships) {
                        console.log(`\n${relationship.source} → ${relationship.target}`);
                        if (relationship.description) {
                            console.log(`Description: ${relationship.description}`);
                        }
                        if (relationship.technology) {
                            console.log(`Technology: ${relationship.technology}`);
                        }
                    }
                }
            }
        }
    });

program.parse(); 