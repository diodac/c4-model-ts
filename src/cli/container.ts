#!/usr/bin/env node

import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { Command } from 'commander';
import { ContainerConfig, Groups } from '../container/model/container';
import { ContainerAnalyzer, ContainerAnalyzerConfig } from '../container/container-analyzer';
import { simplifyUndeclaredRelationships } from '../common/relationship-simplifier';

const program = new Command();

program
    .name('c4-container')
    .description('Analyze C4 container TypeScript codebase for components and relationships')
    .argument('<config>', 'path to c4container.json file')
    .option('-u, --undeclared', 'show only undeclared relationships')
    .option('-i, --invalid', 'show only invalid relationships')
    .option('-c, --components', 'show only components')
    .option('-j, --json', 'output raw JSON')
    .action((configPath, options) => {
        try {
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
                const simplifiedResult = simplifyUndeclaredRelationships(result);
                console.log(JSON.stringify(simplifiedResult, null, 2));
                if (result.invalidRelationships && result.invalidRelationships.length > 0) {
                    process.exit(1);
                }
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
                    if (component.relationships.length > 0) {
                        console.log('Relationships:');
                        for (const relationship of component.relationships) {
                            console.log(`  → ${relationship.metadata.target}`);
                            console.log(`    Description: ${relationship.metadata.description}`);
                            if (relationship.metadata.technology) {
                                console.log(`    Technology: ${relationship.metadata.technology}`);
                            }
                            if (relationship.metadata.tags?.length) {
                                console.log(`    Tags: ${relationship.metadata.tags.join(', ')}`);
                            }
                        }
                    }
                    console.log(`Location: ${component.location.filePath}:${component.location.line}`);
                }
            }

            // Show undeclared relationships if requested
            if (result.undeclaredRelationships?.length) {
                console.log('\nWarning: Found undeclared relationships in code:');
                console.log('Consider documenting these relationships with @c4Relationship tag if they are significant dependencies.\n');
                
                for (const relation of result.undeclaredRelationships) {
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
                console.log('\nAll code relationships are properly documented.');
            }

            // Show invalid relationships if requested
            if (result.invalidRelationships?.length) {
                console.log('\nError: Found invalid relationships:');
                for (const validationResult of result.invalidRelationships) {
                    const relationship = validationResult.relationship;

                    // Invalid target is an error
                    if (!validationResult.targetExists) {
                        console.log(`\nError: Invalid target component: ${relationship.sourceComponent} → ${relationship.metadata.target}`);
                        console.log(`Location: ${relationship.location.filePath}:${relationship.location.line}`);
                        console.log('The target component does not exist in the codebase.');
                    }

                    // Unused relation is an error
                    if (!validationResult.isUsed) {
                        console.log(`\nError: Declared but unused relationship: ${relationship.sourceComponent} → ${relationship.metadata.target}`);
                        console.log(`Description: ${relationship.metadata.description}`);
                        if (relationship.metadata.technology) {
                            console.log(`Technology: ${relationship.metadata.technology}`);
                        }
                        console.log(`Location: ${relationship.location.filePath}:${relationship.location.line}`);
                        console.log('This relationship is documented but not found in the code. Either implement the relationship or remove its documentation.');
                    }

                    // Tag validation errors
                    if (validationResult.errors?.length) {
                        for (const error of validationResult.errors) {
                            console.log(`\nError: ${error}`);
                            console.log(`Location: ${relationship.location.filePath}:${relationship.location.line}`);
                        }
                    }
                }
            } else if (options.invalid) {
                console.log('\nAll declared relationships are valid.');
            }

            // Exit with error if invalid relationships found
            if (result.invalidRelationships && result.invalidRelationships.length > 0) {
                process.exit(1);
            }
        } catch (error: unknown) {
            console.error('Error:', error instanceof Error ? error.message : String(error));
            process.exit(1);
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