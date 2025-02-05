#!/usr/bin/env node

import { Command } from 'commander';
import { resolve, dirname } from 'path';
import { generateSchema } from '../container/schema-generator';

const SCHEMA_TYPES = {
    c4container: {
        type: 'ContainerConfig',
        source: '../container/model/config.ts'
    }
} as const;

type SchemaType = keyof typeof SCHEMA_TYPES;

const program = new Command();

program
    .name('c4-schema')
    .description('Generate JSON schema for C4 model types')
    .argument('<type>', `schema type to generate (${Object.keys(SCHEMA_TYPES).join('|')})`)
    .option('-o, --output <path>', 'output directory', './schema')
    .action((type: string, options) => {
        if (!isValidSchemaType(type)) {
            console.error(`Invalid schema type. Must be one of: ${Object.keys(SCHEMA_TYPES).join(', ')}`);
            process.exit(1);
        }

        const outputDir = resolve(options.output);
        const schemaPath = resolve(outputDir, `${type}.json`);
        const { type: typeName, source } = SCHEMA_TYPES[type];
        const sourcePath = resolve(__dirname, source);
        
        console.log(`Generating schema for ${type} (${typeName})`);
        console.log(`Using source: ${sourcePath}`);
        console.log(`Output path: ${schemaPath}`);
        
        generateSchema(sourcePath, typeName, schemaPath);
        console.log('Schema generated successfully');
    });

function isValidSchemaType(type: string): type is SchemaType {
    return type in SCHEMA_TYPES;
}

program.parse(); 