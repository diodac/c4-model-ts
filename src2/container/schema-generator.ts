import { createGenerator, Config } from 'ts-json-schema-generator';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

/** Generate JSON schema from TypeScript interfaces */
export function generateSchema(sourcePath: string, typeName: string, outPath: string) {
    const config: Config = {
        path: sourcePath,
        tsconfig: resolve(__dirname, '../../tsconfig.json'),
        type: typeName,
        expose: 'export' as const,  // generate only for exported types
        topRef: true,              // add $ref to main type
        jsDoc: 'extended',         // use extended JSDoc tags
        sortProps: true,           // sort properties alphabetically
        strictTuples: true,        // strict tuple validation
        additionalProperties: false // don't allow additional properties
    };

    const generator = createGenerator(config);
    const schema = generator.createSchema(config.type);
    writeFileSync(resolve(outPath), JSON.stringify(schema, null, 2));
} 