import { createGenerator, Config } from 'ts-json-schema-generator';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Configuration for JSON schema generation
 */
export interface SchemaGeneratorConfig {
    /** Source TypeScript file path */
    sourcePath: string;
    /** Name of the type to generate schema for */
    typeName: string;
    /** Output path for the generated schema */
    outPath: string;
}

/**
 * Generates JSON schema from TypeScript interfaces/types
 * Can be used for validating various configuration files like c4workspace.json or c4container.json
 * 
 * @param config Schema generator configuration
 */
export function generateSchema(config: SchemaGeneratorConfig) {
    const tsConfig: Config = {
        path: config.sourcePath,
        tsconfig: resolve(__dirname, '../../tsconfig.json'),
        type: config.typeName,
        expose: 'export' as const,  // generate only for exported types
        topRef: true,              // add $ref to main type
        jsDoc: 'extended',         // use extended JSDoc tags
        sortProps: true,           // sort properties alphabetically
        strictTuples: true,        // strict tuple validation
        additionalProperties: false // don't allow additional properties
    };

    const generator = createGenerator(tsConfig);
    const schema = generator.createSchema(tsConfig.type);
    writeFileSync(resolve(config.outPath), JSON.stringify(schema, null, 2));
} 