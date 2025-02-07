import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { ContainerAnalyzer, AnalysisResult } from '../container/container-analyzer';
import { 
    C4WorkspaceConfig, 
    C4WorkspaceModel,
    C4Container,
    C4ContainerRelation
} from './model/workspace';
import { WorkspaceConfigLoader } from './config-loader';

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

    constructor(config: WorkspaceAnalyzerConfig, schema: object) {
        this.configPath = config.configPath;
        this.workspaceDir = dirname(config.configPath);
        this.configLoader = new WorkspaceConfigLoader(schema);
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
        const failures: { alias: string; error: string }[] = [];

        for (const [alias, includeConfig] of Object.entries(workspaceConfig.include)) {
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
                        alias,
                        data: {
                            name: containerConfig.name,
                            description: containerConfig.description,
                            technology: containerConfig.technology,
                            tags: containerConfig.tags,
                            sourcePath: configPath
                        },
                        analysis
                    });
                }
            } catch (error) {
                failures.push({
                    alias,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        // Find relations between containers
        const relations = this.findContainerRelations(containers);

        // Build workspace model
        return {
            name: workspaceConfig.name,
            description: workspaceConfig.description,
            containers,
            relations
        };
    }

    /**
     * Find relations between containers based on their analysis results
     */
    private findContainerRelations(containers: C4Container[]): C4ContainerRelation[] {
        // Use Map to store unique relations by source-target-technology key
        const relationsMap = new Map<string, C4ContainerRelation>();
        const containersByName = new Map(
            containers.map(c => [c.data.name, c])
        );

        // Look for relations in each container's components
        for (const container of containers) {
            for (const component of container.analysis.components) {
                for (const relation of component.relations) {
                    // Check if target is another container
                    const targetParts = relation.metadata.target.split('.');
                    if (targetParts.length > 1) {
                        const targetContainerName = targetParts[0];
                        const targetContainer = containersByName.get(targetContainerName);
                        
                        if (targetContainer && targetContainer !== container) {
                            // Create unique key for this relation direction and technology
                            const technology = relation.metadata.technology || 'unknown';
                            const relationKey = `${container.alias}->${targetContainer.alias}:${technology}`;

                            if (!relationsMap.has(relationKey)) {
                                relationsMap.set(relationKey, {
                                    source: container.alias,
                                    target: targetContainer.alias,
                                    description: `${container.data.name} uses ${targetContainer.data.name}`,
                                    technology: technology !== 'unknown' ? technology : undefined
                                });
                            }
                        }
                    }
                }
            }
        }

        return Array.from(relationsMap.values());
    }
} 