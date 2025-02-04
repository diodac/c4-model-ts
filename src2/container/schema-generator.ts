import { createGenerator } from 'ts-json-schema-generator';
import type { Config } from 'ts-json-schema-generator';

export class SchemaGenerator {
    generateSchema(sourcePath: string, typeName: string): object {
        const config: Config = {
            path: sourcePath,
            type: typeName,             // nazwa typu do wygenerowania schematu
            expose: 'export',           // generuj tylko dla eksportowanych typów
            topRef: true,              // dodaj $ref do głównego typu
            jsDoc: 'extended',         // użyj rozszerzonych tagów JSDoc
            sortProps: true,           // sortuj właściwości alfabetycznie
            strictTuples: true,        // ścisła walidacja tupli
            additionalProperties: false // nie pozwalaj na dodatkowe właściwości
        };

        const generator = createGenerator(config);
        return generator.createSchema(typeName);
    }
} 