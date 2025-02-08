#!/usr/bin/env node

import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { Command } from 'commander';
import { ContainerConfig, Groups } from '../container/model/container';
import { ContainerAnalyzer, ContainerAnalyzerConfig } from '../container/container-analyzer';

const program = new Command();

program
    .name('c4-container')
    .description('Analyze C4 container TypeScript codebase for components and relations')
    .argument('<config>', 'path to c4container.json file')
    .option('-u, --undeclared', 'show only undeclared relations')
    .option('-i, --invalid', 'show only invalid relations')
    .option('-c, --components', 'show only components')
    .option('-j, --json', 'output raw JSON')
    .action((configPath, options) => {
        const resolvedPath = resolve(configPath);
        const configDir = dirname(resolvedPath);

        // Read and parse config
        const config: ContainerConfig = JSON.parse(readFileSync(resolvedPath, 'utf-8'));

        // Initialize analyzer with configuration
        const analyzerConfig: ContainerAnalyzerConfig = {
            tsConfigPath: resolve(configDir, 'tsconfig.json'),
            config,
            rootDir: configDir
        };
        const analyzer = new ContainerAnalyzer(analyzerConfig);

        // Analyze container
        const result = analyzer.analyze({
            includeUndeclared: options.undeclared || (!options.components && !options.invalid),
            includeInvalid: options.invalid || (!options.components && !options.undeclared)
        });

        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }

        console.log(`Analyzing container: ${config.name}`);

        // Show components if requested or no specific option
        if (options.components || (!options.undeclared && !options.invalid)) {
            console.log(`\nFound ${result.components.length} components:`);

            // Display group hierarchy
            if (Object.keys(result.groups).length > 0) {
                console.log('\nGroup hierarchy:');
                displayGroups(result.groups);
            }

            // Display components
            console.log('\nComponents:');
            for (const component of result.components) {
                console.log(`\n[${component.metadata.name}]`);
                console.log(`Group: ${component.metadata.group || '(no group)'}`);
                console.log(`Description: ${component.metadata.description}`);
                if (component.metadata.technology) {
                    console.log(`Technology: ${component.metadata.technology}`);
                }
                if (component.metadata.tags?.length) {
                    console.log(`Tags: ${component.metadata.tags.join(', ')}`);
                }
                if (component.relations.length > 0) {
                    console.log('Relations:');
                    for (const relation of component.relations) {
                        console.log(`  → ${relation.metadata.target}`);
                        console.log(`    Description: ${relation.metadata.description}`);
                        if (relation.metadata.technology) {
                            console.log(`    Technology: ${relation.metadata.technology}`);
                        }
                        if (relation.metadata.tags?.length) {
                            console.log(`    Tags: ${relation.metadata.tags.join(', ')}`);
                        }
                    }
                }
                console.log(`Location: ${component.location.filePath}:${component.location.line}`);
            }
        }

        // Show undeclared relations if requested
        if (result.undeclaredRelations?.length) {
            console.log('\nWarning: Found undeclared relations in code:');
            console.log('Consider documenting these relations with @c4Relation tag if they are significant dependencies.\n');
            
            for (const relation of result.undeclaredRelations) {
                console.log(`${relation.calledFrom.component.metadata.name} → ${relation.method.component.metadata.name}`);
                console.log(`Method: ${relation.method.name}`);
                console.log(`Called from: ${relation.calledFrom.method || '(constructor)'}`);
                console.log(`Location: ${relation.calledFrom.filePath}:${relation.calledFrom.line}`);
                if (relation.callChain.length > 1) {
                    console.log(`Call chain: ${relation.callChain.join(' → ')}`);
                }
                console.log('');
            }
        } else if (options.undeclared) {
            console.log('\nAll code relations are properly documented.');
        }

        // Show invalid relations if requested
        if (result.invalidRelations?.length) {
            console.log('\nError: Found invalid relations:');
            for (const validationResult of result.invalidRelations) {
                const relation = validationResult.relation;

                // Invalid target is an error
                if (!validationResult.targetExists) {
                    console.log(`\nError: Invalid target component: ${relation.sourceComponent} → ${relation.metadata.target}`);
                    console.log(`Location: ${relation.location.filePath}:${relation.location.line}`);
                    console.log('The target component does not exist in the codebase.');
                }

                // Unused relation is an error
                if (!validationResult.isUsed) {
                    console.log(`\nError: Declared but unused relation: ${relation.sourceComponent} → ${relation.metadata.target}`);
                    console.log(`Description: ${relation.metadata.description}`);
                    if (relation.metadata.technology) {
                        console.log(`Technology: ${relation.metadata.technology}`);
                    }
                    console.log(`Location: ${relation.location.filePath}:${relation.location.line}`);
                    console.log('This relation is documented but not found in the code. Either implement the relation or remove its documentation.');
                }

                // Tag validation errors
                if (validationResult.errors?.length) {
                    for (const error of validationResult.errors) {
                        console.log(`\nError: ${error}`);
                        console.log(`Location: ${relation.location.filePath}:${relation.location.line}`);
                    }
                }
            }
        } else if (options.invalid) {
            console.log('\nAll declared relations are valid.');
        }
    });

/**
 * Display groups recursively
 */
function displayGroups(groups: Groups, level: number = 0): void {
    const indent = '  '.repeat(level);
    for (const [name, subgroups] of Object.entries(groups)) {
        console.log(`${indent}${name}`);
        if (Object.keys(subgroups).length > 0) {
            displayGroups(subgroups, level + 1);
        }
    }
}

program.parse(); 