import { C4WorkspaceConfig, C4WorkspaceData, C4WorkspaceValidationError } from "./model";
import { C4Generator } from "../container/generator";
import * as fs from 'fs';
import * as path from 'path';
import glob from 'glob';
import { promisify } from 'util';

const globAsync = promisify<string, glob.IOptions, string[]>(glob);

export class C4WorkspaceParser {
    constructor(
        private workspaceDir: string
    ) {}

    async parse(configPath: string): Promise<C4WorkspaceData> {
        // Load and parse configuration
        const config = await this.loadConfig(configPath);
        
        // Validate configuration
        this.validateConfig(config);
        
        // Process all sources
        const containers = new Map();
        
        for (const [alias, includeConfig] of Object.entries(config.include)) {
            if (includeConfig.type === 'c4container.json') {
                const containerFiles = await this.resolveGlobPatterns(includeConfig.source);
                
                for (const containerFile of containerFiles) {
                    const containerConfig = JSON.parse(fs.readFileSync(containerFile, 'utf-8'));
                    const containerDir = path.dirname(containerFile);
                    
                    const generator = new C4Generator(containerConfig, containerDir);
                    const modelData = generator.generate();
                    
                    containers.set(containerFile, modelData);
                }
            }
        }
        
        return { containers };
    }

    getTemplatePath(configPath: string): string {
        const configDir = path.dirname(configPath);
        return path.join(configDir, 'workspace', 'workspace.dsl.tpl');
    }

    private async loadConfig(configPath: string): Promise<C4WorkspaceConfig> {
        try {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            return JSON.parse(configContent);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new C4WorkspaceValidationError(
                `Failed to load workspace config from ${configPath}: ${message}`
            );
        }
    }

    private validateConfig(config: C4WorkspaceConfig): void {
        if (!config.include) {
            throw new C4WorkspaceValidationError('Missing "include" section in workspace config');
        }

        for (const [alias, includeConfig] of Object.entries(config.include)) {
            if (!includeConfig.type) {
                throw new C4WorkspaceValidationError(
                    `Missing "type" in include config for alias "${alias}"`
                );
            }

            if (includeConfig.type !== 'c4container.json') {
                throw new C4WorkspaceValidationError(
                    `Unsupported include type "${includeConfig.type}" for alias "${alias}". Only c4container.json is supported`
                );
            }

            if (!includeConfig.source) {
                throw new C4WorkspaceValidationError(
                    `Missing "source" in include config for alias "${alias}"`
                );
            }
        }
    }

    private async resolveGlobPatterns(patterns: string | string[]): Promise<string[]> {
        const patternList = Array.isArray(patterns) ? patterns : [patterns];
        const results: string[] = [];
        
        for (const pattern of patternList) {
            // Rozwiąż wzorzec względem katalogu workspace
            const matches = await globAsync(pattern, {
                cwd: this.workspaceDir,
                absolute: true,
                ignore: ['**/node_modules/**']
            });
            results.push(...matches);
        }
        
        return results;
    }
} 