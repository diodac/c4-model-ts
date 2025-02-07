import { default as Ajv } from 'ajv';
import * as fs from 'fs';
import { ContainerConfig } from './model/container';

export class ContainerConfigError extends Error {
    constructor(
        message: string, 
        public errors?: string[],
        public configPath?: string
    ) {
        super(message);
        this.name = 'ContainerConfigError';
    }
}

export class ContainerConfigLoader {
    private validator: Ajv;

    constructor(schema: object) {
        this.validator = new Ajv({
            allErrors: true,
            verbose: true
        });
        this.validator.addSchema(schema, 'c4container.json');
    }

    load(configPath: string): ContainerConfig {
        try {
            // 1. Wczytaj plik
            const config = this.readConfigFile(configPath);

            // 2. Walidacja przez schemat
            this.validateSchema(config);

            // 3. Walidacje biznesowe
            this.validateBusinessRules(config);

            return config;
        } catch (error) {
            if (error instanceof ContainerConfigError) {
                error.configPath = configPath;
                throw error;
            }
            throw new ContainerConfigError(
                `Failed to process config: ${error instanceof Error ? error.message : 'Unknown error'}`,
                undefined,
                configPath
            );
        }
    }

    private readConfigFile(configPath: string): unknown {
        try {
            const content = fs.readFileSync(configPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            throw new ContainerConfigError(
                `Failed to read config file: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    private validateSchema(config: unknown): asserts config is ContainerConfig {
        const validate = this.validator.getSchema('c4container.json');
        if (!validate) {
            throw new ContainerConfigError('Schema not found');
        }

        const isValid = validate(config);
        if (!isValid) {
            const errors = validate.errors?.map(err => 
                `${err.instancePath} ${err.message}`
            );
            throw new ContainerConfigError('Schema validation failed', errors);
        }
    }

    private validateBusinessRules(config: ContainerConfig): void {
        const errors: string[] = [];

        // Walidacje biznesowe
        this.validateGroups(config.groups, errors);
        this.validateSourcePatterns(config.source, errors);
        this.validateExternalReferences(config.external, errors);

        if (errors.length > 0) {
            throw new ContainerConfigError('Business validation failed', errors);
        }
    }

    private validateGroups(
        groups: Record<string, Record<string, unknown>> | undefined, 
        errors: string[],
        path: string[] = []
    ): void {
        if (!groups) return;

        for (const [name, subgroups] of Object.entries(groups)) {
            if (path.includes(name)) {
                errors.push(
                    `Cyclic dependency detected in groups: ${[...path, name].join(' -> ')}`
                );
                continue;
            }

            if (!/^[\w-]+$/.test(name)) {
                errors.push(
                    `Invalid group name "${name}": only letters, numbers, and hyphens are allowed`
                );
            }

            this.validateGroups(subgroups as Record<string, Record<string, unknown>>, errors, [...path, name]);
        }
    }

    private validateSourcePatterns(
        patterns: string[], 
        errors: string[]
    ): void {
        const hasIncludePattern = patterns.some(p => !p.startsWith('!'));
        if (!hasIncludePattern) {
            errors.push(
                'Source patterns must include at least one positive pattern'
            );
        }

        for (const pattern of patterns) {
            if (pattern.includes('..')) {
                errors.push(
                    `Pattern "${pattern}" contains potentially unsafe ".." path segment`
                );
            }
        }
    }

    private validateExternalReferences(
        external: ContainerConfig['external'],
        errors: string[]
    ): void {
        if (!external) return;

        for (const [name, config] of Object.entries(external)) {
            if (config.type === 'container' && !name.toLowerCase().includes('service')) {
                errors.push(
                    `Container reference "${name}" should contain "service" in its name`
                );
            }

            if (name.toLowerCase() === 'self' || name.toLowerCase() === 'this') {
                errors.push(
                    `External reference name "${name}" is reserved`
                );
            }
        }
    }
} 