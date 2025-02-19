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
    .option('--undeclared-details', 'show detailed list of all undeclared relationship occurrences (by default only summary is shown)')
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
                
                // Show unique relationships summary
                if (result.uniqueUndeclaredRelationships?.length) {
                    console.log('Summary of unique undeclared relationships:');
                    console.log(''); // Add empty line for better readability
                    for (const rel of result.uniqueUndeclaredRelationships) {
                        // Format the relationship line with proper indentation and spacing
                        console.log(`  From: ${rel.from}`);
                        console.log(`    To: ${rel.to}`);
                        console.log(`  Type: ${rel.type}`);
                        console.log(`  Used: ${rel.occurrences} time${rel.occurrences > 1 ? 's' : ''}`);
                        console.log(''); // Add empty line between relationships
                    }
                }

                // Show detailed list only if requested
                if (options.undeclaredDetails && result.undeclaredRelationships.length > 0) {
                    console.log('\nDetailed list of all occurrences:\n');
                    for (const relation of result.undeclaredRelationships) {
                        console.log(`${relation.calledFrom.component.metadata.name} → ${relation.method.component.metadata.name}`);
                        console.log(`Method: ${relation.method.name}`);
                        console.log(`Called from: ${relation.calledFrom.method || '(constructor)'}`);
                        console.log(`Location: ${relation.calledFrom.filePath}:${relation.calledFrom.line}`);
                        if (relation.callChain.length > 1) {
                            console.log(`Call chain: ${relation.callChain.join(' → ')}`);
                        }
                        console.log(`Summary: ${relation.summary.from} → ${relation.summary.to} (${relation.summary.type})`);
                        console.log('');
                    }
                } else if (result.undeclaredRelationships.length > 0) {
                    console.log('\nUse --undeclared-details flag to see all occurrences of undeclared relationships');
                }
            } else if (options.undeclared) {
                console.log('\nAll code relationships are properly documented.');
            }

            // Show invalid relationships if requested
            if (result.invalidRelationships?.length) {
                console.log('\nError: Found invalid relationships:');
                console.log(''); // Add empty line for better readability
                
                // Track which unused relationships we've already reported
                const reportedUnused = new Set<string>();
                
                for (const validationResult of result.invalidRelationships) {
                    const relationship = validationResult.relationship;
                    const relationshipKey = `${relationship.sourceComponent}|${relationship.metadata.target}`;

                    // Invalid target is an error
                    if (!validationResult.targetExists) {
                        console.log(`  Error: Invalid target component`);
                        console.log(`   From: ${relationship.sourceComponent}`);
                        console.log(`     To: ${relationship.metadata.target}`);
                        console.log(`    At: ${relationship.location.filePath}:${relationship.location.line}`);
                        console.log('Details: The target component does not exist in the codebase.');
                        console.log(''); // Add empty line between errors
                    }

                    // Unused relation is an error - only report once per relationship
                    if (!validationResult.isUsed && !reportedUnused.has(relationshipKey)) {
                        reportedUnused.add(relationshipKey);
                        console.log(`  Error: Declared but unused relationship`);
                        console.log(`   From: ${relationship.sourceComponent}`);
                        console.log(`     To: ${relationship.metadata.target}`);
                        if (relationship.metadata.description) {
                            console.log(`    Doc: ${relationship.metadata.description}`);
                        }
                        if (relationship.metadata.technology) {
                            console.log(`   Tech: ${relationship.metadata.technology}`);
                        }
                        console.log(`    At: ${relationship.location.filePath}:${relationship.location.line}`);
                        console.log('Details: This relationship is documented but not found in the code.');
                        console.log('         Either implement the relationship or remove its documentation.');
                        console.log(''); // Add empty line between errors
                        continue; // Skip tag validation for unused relationships
                    }

                    // Tag validation errors - only for used relationships
                    if (validationResult.isUsed && validationResult.errors?.length) {
                        for (const error of validationResult.errors) {
                            console.log(`  Error: Tag validation error`);
                            console.log(`   From: ${relationship.sourceComponent}`);
                            console.log(`     To: ${relationship.metadata.target}`);
                            console.log(`    At: ${relationship.location.filePath}:${relationship.location.line}`);
                            console.log(`Details: ${error}`);
                            console.log(''); // Add empty line between errors
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