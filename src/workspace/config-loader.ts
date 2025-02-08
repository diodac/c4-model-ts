import { default as Ajv } from 'ajv';
import * as fs from 'fs';
import { C4WorkspaceConfig } from './model/workspace';

export class WorkspaceConfigError extends Error {
    constructor(
        message: string,
        public errors?: string[],
        public configPath?: string
    ) {
        super(message);
        this.name = 'WorkspaceConfigError';
    }
}

export class WorkspaceConfigLoader {
    private validator: Ajv;

    constructor(schema: object) {
        this.validator = new Ajv({
            allErrors: true,
            verbose: true
        });
        this.validator.addSchema(schema, 'c4workspace.json');
    }

    load(configPath: string): C4WorkspaceConfig {
        try {
            // 1. Load file
            const config = this.readConfigFile(configPath);

            // 2. Schema validation
            this.validateSchema(config);

            // 3. Business rules validation
            this.validateBusinessRules(config);

            return config;
        } catch (error) {
            if (error instanceof WorkspaceConfigError) {
                error.configPath = configPath;
                throw error;
            }
            throw new WorkspaceConfigError(
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
            throw new WorkspaceConfigError(
                `Failed to read config file: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    private validateSchema(config: unknown): asserts config is C4WorkspaceConfig {
        const validate = this.validator.getSchema('c4workspace.json');
        if (!validate) {
            throw new WorkspaceConfigError('Schema not found');
        }

        const isValid = validate(config);
        if (!isValid) {
            const errors = validate.errors?.map(err =>
                `${err.instancePath} ${err.message}`
            );
            throw new WorkspaceConfigError('Schema validation failed', errors);
        }
    }

    private validateBusinessRules(config: C4WorkspaceConfig): void {
        const errors: string[] = [];

        // Validate source patterns for each system
        for (const [systemId, systemConfig] of Object.entries(config.systems)) {
            const patterns = Array.isArray(systemConfig.containers.source)
                ? systemConfig.containers.source
                : [systemConfig.containers.source];

            this.validateSourcePatterns(patterns, errors, systemId);
        }

        if (errors.length > 0) {
            throw new WorkspaceConfigError('Business rules validation failed', errors);
        }
    }

    private validateSourcePatterns(patterns: string[], errors: string[], systemId: string): void {
        const hasIncludePattern = patterns.some(p => !p.startsWith('!'));
        if (!hasIncludePattern) {
            errors.push(
                `Source patterns for system "${systemId}" must include at least one positive pattern`
            );
        }
    }
} 