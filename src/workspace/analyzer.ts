import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { ContainerAnalyzer } from '../container/container-analyzer';
import { 
    C4WorkspaceConfig, 
    C4WorkspaceModel,
    C4Container
} from './model/workspace';
import { WorkspaceConfigLoader } from './config-loader';
import { ContainerRelationsAnalyzer } from './container-relations-analyzer';

export interface WorkspaceAnalyzerConfig {
    /** Path to workspace configuration file */
    configPath: string;
}

/**
 * Analyzes containers based on workspace configuration
 */
export class WorkspaceAnalyzer {
    private configPath: string;
    private workspaceDir: string;
    private configLoader: WorkspaceConfigLoader;
    private relationsAnalyzer: ContainerRelationsAnalyzer;

    constructor(config: WorkspaceAnalyzerConfig, schema: object) {
        this.configPath = config.configPath;
        this.workspaceDir = dirname(config.configPath);
        this.configLoader = new WorkspaceConfigLoader(schema);
        this.relationsAnalyzer = new ContainerRelationsAnalyzer();
    }

    /**
     * Analyze all containers in the workspace and build workspace model
     */
    async analyze(options: {
        includeUndeclared?: boolean;
        includeInvalid?: boolean;
    } = {}): Promise<C4WorkspaceModel> {
        // Load and validate workspace configuration
        const workspaceConfig = this.configLoader.load(this.configPath);

        // Analyze containers
        const containers: C4Container[] = [];
        const failures: { name: string; error: string }[] = [];

        for (const includeConfig of Object.values(workspaceConfig.include)) {
            try {
                // Only support c4container.json for now
                if (includeConfig.type !== 'c4container.json') {
                    continue;
                }

                // Find container configuration files
                const patterns = Array.isArray(includeConfig.source) 
                    ? includeConfig.source 
                    : [includeConfig.source];

                // Find all matching config files
                const configPaths = globSync(patterns[0], {
                    ignore: ['**/node_modules/**', ...patterns.slice(1).map(p => p.replace(/^!/, ''))],
                    cwd: this.workspaceDir,
                    absolute: true
                });

                // Process each config file
                for (const configPath of configPaths) {
                    const containerConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

                    // Create container analyzer
                    const analyzer = new ContainerAnalyzer({
                        tsConfigPath: resolve(dirname(configPath), 'tsconfig.json'),
                        config: containerConfig,
                        rootDir: dirname(configPath)
                    });

                    // Analyze container
                    const analysis = analyzer.analyze(options);

                    // Add to containers list
                    containers.push({
                        data: {
                            name: containerConfig.name,
                            description: containerConfig.description,
                            technology: containerConfig.technology,
                            tags: containerConfig.tags,
                            sourcePath: configPath,
                            external: containerConfig.external
                        },
                        analysis
                    });
                }
            } catch (error) {
                failures.push({
                    name: includeConfig.type,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        // Find relations between containers
        const relations = this.relationsAnalyzer.analyze(containers);

        // Build workspace model
        return {
            name: workspaceConfig.name,
            description: workspaceConfig.description,
            containers,
            relations
        };
    }
} 