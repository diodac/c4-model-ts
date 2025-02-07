#!/usr/bin/env node

import { Command } from 'commander';
import { resolve } from 'path';
import { generateSchema } from '../common/schema-generator';

const SCHEMA_TYPES = {
    c4container: {
        type: 'ContainerConfig',
        source: '../container/model/container.ts'
    },
    c4workspace: {
        type: 'C4WorkspaceConfig',
        source: '../workspace/model/workspace.ts'
    }
} as const;

type SchemaType = keyof typeof SCHEMA_TYPES;

const program = new Command();

program
    .name('schema')
    .description('Generate JSON schema from TypeScript interfaces')
    .argument('<type>', `Schema type to generate (${Object.keys(SCHEMA_TYPES).join('|')})`)
    .option('-o, --output <path>', 'output directory', './schema')
    .action(async (type: string, options) => {
        const schemaType = type as SchemaType;
        if (!SCHEMA_TYPES[schemaType]) {
            console.error(`Unknown schema type: ${type}`);
            process.exit(1);
        }

        const config = SCHEMA_TYPES[schemaType];
        const sourcePath = resolve(__dirname, config.source);
        const outputDir = resolve(options.output);
        const outPath = resolve(outputDir, `${type}.json`);

        try {
            generateSchema({
                sourcePath,
                typeName: config.type,
                outPath
            });
            console.log(`Schema generated: ${outPath}`);
        } catch (error) {
            console.error('Failed to generate schema:', error);
            process.exit(1);
        }
    });

program.parse(); 