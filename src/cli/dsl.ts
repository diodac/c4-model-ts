#!/usr/bin/env node

import { Command } from 'commander';
import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { DslGenerator } from '../workspace/dsl/generator';
import { WorkspaceAnalyzer, WorkspaceAnalyzerConfig } from '../workspace/analyzer';
import { WorkspaceConfigLoader } from '../workspace/config-loader';

const program = new Command();

program
    .name('c4-dsl')
    .description('Generate Structurizr DSL from workspace configuration')
    .argument('<config>', 'Path to workspace configuration file (c4workspace.json)')
    .option('-t, --template <path>', 'Custom template file path')
    .option('-o, --output <path>', 'Custom output file path')
    .option('-w, --workspace-dir <path>', 'Custom workspace directory')
    .option('-u, --include-undeclared', 'Include undeclared relations in DSL output')
    .action(async (configPath: string, options: any) => {
        try {
            const resolvedPath = resolve(configPath);

            // Load workspace schema
            const schemaPath = resolve(__dirname, '../../schema/c4workspace.json');
            const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

            // Load workspace configuration
            const configLoader = new WorkspaceConfigLoader(schema);
            const workspaceConfig = configLoader.load(resolvedPath);

            // Initialize analyzer with configuration
            const analyzerConfig: WorkspaceAnalyzerConfig = {
                configPath: resolvedPath
            };
            const analyzer = new WorkspaceAnalyzer(analyzerConfig, schema);
            
            // Create generator with options
            const generator = new DslGenerator(analyzer, workspaceConfig, resolvedPath, {
                workspaceDir: options.workspaceDir,
                templateFile: options.template,
                outputFile: options.output,
                includeUndeclared: options.includeUndeclared
            });
            
            // Generate DSL
            await generator.generate();
            
            console.log('DSL generation completed successfully');
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Error:', error.message);
            } else {
                console.error('Unknown error occurred');
            }
            process.exit(1);
        }
    });

program.parse(); 