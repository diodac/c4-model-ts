#!/usr/bin/env node

import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { Command } from 'commander';
import { ContainerConfig } from '../container/config';
import { ComponentFinder } from '../container/component-finder';
import { RelationFinder } from '../container/relation-finder';
import { RelationValidator } from '../container/relation-validator';

const program = new Command();

program
    .name('c4-container')
    .description('Analyze C4 container TypeScript codebase for components and relations')
    .version('0.1.0')
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
        console.log(`Analyzing container: ${config.name}`);

        // Initialize finders
        const componentFinder = new ComponentFinder(resolve(configDir, 'tsconfig.json'));
        const relationFinder = new RelationFinder();
        const relationValidator = new RelationValidator();

        // Add source files
        const sourcePatterns = config.source.map(pattern => resolve(configDir, pattern));
        componentFinder.addSourceFiles(sourcePatterns);

        // Find components and relations
        const components = componentFinder.findComponents();

        if (options.json) {
            const output = {
                components,
                undeclaredRelations: options.undeclared ? relationFinder.findRelations(components) : undefined,
                invalidRelations: options.invalid ? relationValidator.validateRelations(components) : undefined
            };
            console.log(JSON.stringify(output, null, 2));
            return;
        }
        
        // Show components if requested or no specific option
        if (options.components || (!options.undeclared && !options.invalid)) {
            console.log(`\nFound ${components.length} components:`);
            for (const component of components) {
                console.log(`\n[${component.metadata.name}]`);
                console.log(`Description: ${component.metadata.description}`);
                if (component.metadata.technology) {
                    console.log(`Technology: ${component.metadata.technology}`);
                }
                if (component.metadata.tags?.length) {
                    console.log(`Tags: ${component.metadata.tags.join(', ')}`);
                }
                if (component.metadata.group) {
                    console.log(`Group: ${component.metadata.group}`);
                }
                if (component.relations.length > 0) {
                    console.log('\nRelations:');
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
                console.log(`\nLocation: ${component.location.filePath}:${component.location.line}`);
            }
        }

        // Show undeclared relations if requested
        if (options.undeclared || (!options.components && !options.invalid)) {
            const undeclaredRelations = relationFinder.findRelations(components);
            if (undeclaredRelations.length > 0) {
                console.log('\nFound undeclared relations:');
                for (const relation of undeclaredRelations) {
                    console.log(`\n${relation.sourceComponent.metadata.name} → ${relation.targetComponent.metadata.name}`);
                    console.log(`Type: ${relation.usageType}`);
                    console.log(`Location: ${relation.location.filePath}:${relation.location.line}`);
                }
            } else if (options.undeclared) {
                console.log('\nNo undeclared relations found.');
            }
        }

        // Show invalid relations if requested
        if (options.invalid || (!options.components && !options.undeclared)) {
            const validationResults = relationValidator.validateRelations(components);
            const invalidRelations = validationResults.filter(r => !r.isUsed || !r.targetExists);
            if (invalidRelations.length > 0) {
                console.log('\nFound invalid relations:');
                for (const result of invalidRelations) {
                    const relation = result.relation;
                    if (!result.targetExists) {
                        console.log(`\nInvalid target: ${relation.sourceComponent} → ${relation.metadata.target}`);
                        console.log(`Location: ${relation.location.filePath}:${relation.location.line}`);
                    }
                    if (!result.isUsed) {
                        console.log(`\nUnused relation: ${relation.sourceComponent} → ${relation.metadata.target}`);
                        console.log(`Description: ${relation.metadata.description}`);
                        if (relation.metadata.technology) {
                            console.log(`Technology: ${relation.metadata.technology}`);
                        }
                        console.log(`Location: ${relation.location.filePath}:${relation.location.line}`);
                    }
                }
            } else if (options.invalid) {
                console.log('\nNo invalid relations found.');
            }
        }
    });

program.parse(); 