import { Liquid } from 'liquidjs';
import { WorkspaceAnalyzer } from '../analyzer';
import { C4WorkspaceConfig, C4WorkspaceModel } from '../model/workspace';
import { resolve, dirname } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { Groups } from '../../container/model/container';

/**
 * Component metadata in DSL generation context
 */
interface ComponentMetadata {
    /** Component name */
    name: string;
    /** Component description */
    description: string;
    /** Component technology */
    technology?: string;
    /** Component group */
    group?: string;
}

/**
 * Component in DSL generation context
 */
interface Component {
    /** Component metadata */
    metadata: ComponentMetadata;
}

/**
 * Represents a container in DSL generation context
 */
interface Container {
    /** Container identifier used in DSL */
    name: string;
    /** Container display name */
    title: string;
    /** Container technology stack */
    technology: string;
    /** Container description */
    description: string;
    /** Container analysis results */
    analysis?: {
        /** Components in this container */
        components: Component[];
        /** Component groups */
        groups?: Groups;
    };
}

/**
 * Represents a relationship between containers in DSL generation context
 */
interface Relationship {
    /** Source container identifier */
    source: string;
    /** Target container identifier */
    target: string;
    /** Relationship description */
    description: string;
    /** Technology used for communication */
    technology: string;
    /** Relationship tags */
    tags?: string[];
}

/**
 * Data structure passed to DSL template
 */
interface WorkspaceData {
    /** List of containers in the workspace */
    containers: Container[];
    /** List of relationships between containers */
    relationships: Relationship[];
}

/**
 * Generator for Structurizr DSL files from workspace data
 * Uses liquid templates for generating DSL code
 */
export class DslGenerator {
    private readonly analyzer: WorkspaceAnalyzer;
    private readonly engine: Liquid;
    private readonly workspaceDir: string;
    private readonly templateFile: string;
    private readonly outputFile: string;
    private readonly includeUndeclared: boolean;

    /**
     * Creates a new DSL generator instance
     * 
     * @param analyzer - Workspace analyzer instance
     * @param config - Workspace configuration
     * @param configPath - Path to workspace configuration file (used for resolving relative paths)
     * @param options - Optional generator settings
     * @param options.workspaceDir - Custom workspace directory (overrides config.workspaceDir)
     * @param options.templateFile - Custom template file path (default: workspace.dsl.tpl)
     * @param options.outputFile - Custom output file path (default: workspace.dsl)
     * @param options.includeUndeclared - Whether to include undeclared relations in DSL output (default: false)
     */
    constructor(
        analyzer: WorkspaceAnalyzer,
        config: C4WorkspaceConfig,
        configPath: string,
        options?: {
            workspaceDir?: string;
            templateFile?: string;
            outputFile?: string;
            includeUndeclared?: boolean;
        }
    ) {
        this.analyzer = analyzer;
        this.includeUndeclared = options?.includeUndeclared || false;
        
        // Get base path - either from config or from config file location
        const basePath = config.basePath || dirname(configPath);
        
        // Setup workspace directory using resolve instead of join
        this.workspaceDir = options?.workspaceDir || 
            config.workspaceDir || 
            resolve(basePath, 'workspace');

        // Setup template and output files
        this.templateFile = options?.templateFile || 
            resolve(this.workspaceDir, 'workspace.dsl.tpl');
        this.outputFile = options?.outputFile || 
            resolve(this.workspaceDir, 'workspace.dsl');

        // Initialize Liquid engine
        this.engine = new Liquid();
        this.registerFilters();
    }

    /**
     * Registers custom filters for DSL template processing
     */
    private registerFilters(): void {
        this.engine.registerFilter('containers', this.containersFilter.bind(this));
        this.engine.registerFilter('relationships', this.relationshipsFilter.bind(this));
        this.engine.registerFilter('indent', this.indentFilter.bind(this));
    }

    /**
     * Liquid filter for generating container DSL code
     * 
     * @param workspace - Workspace data containing containers
     * @returns Generated DSL code for containers
     */
    private containersFilter(workspace: WorkspaceData): string {
        const containers = workspace.containers || [];
        const parts: string[] = [];

        // Helper function to render a component
        const renderComponent = (component: any, indent: number): string => {
            const indentation = ' '.repeat(indent);
            return [
                `${indentation}${component.metadata.name} = component "${component.metadata.name}" {`,
                `${indentation}    technology "${component.metadata.technology || 'undefined'}"`,
                `${indentation}    description "${component.metadata.description}"`,
                `${indentation}}`
            ].join('\n');
        };

        // Helper function to render components in a specific group
        const renderComponentsInGroup = (group: string, components: any[], indent: number): string[] => {
            const lines: string[] = [];
            for (const component of components) {
                if (component.metadata.group === group) {
                    lines.push(renderComponent(component, indent));
                }
            }
            return lines;
        };

        // Helper function to recursively render grouped components
        const renderGroupedComponents = (groups: Record<string, any>, components: any[], indent: number): string[] => {
            const lines: string[] = [];
            for (const [group, subgroups] of Object.entries(groups)) {
                // Get components in this group
                const groupComponents = renderComponentsInGroup(group, components, indent + 4);
                
                // Get subgroup lines
                const subgroupLines = Object.keys(subgroups).length > 0 
                    ? renderGroupedComponents(subgroups, components, indent + 4)
                    : [];

                // Only render group if it has components or non-empty subgroups
                if (groupComponents.length > 0 || subgroupLines.length > 0) {
                    if (lines.length > 0) lines.push('');
                    lines.push(`${' '.repeat(indent)}group "${group}" {`);
                    
                    // Add components
                    if (groupComponents.length > 0) {
                        lines.push(...groupComponents);
                    }

                    // Add subgroups
                    if (subgroupLines.length > 0) {
                        if (groupComponents.length > 0) lines.push('');
                        lines.push(...subgroupLines);
                    }

                    lines.push(`${' '.repeat(indent)}}`);
                }
            }
            return lines;
        };

        // Generate DSL for each container
        for (const container of containers) {
            const lines = [
                `${container.name} = container "${container.title}" {`,
                `    technology "${container.technology}"`,
                `    description "${container.description}"`
            ];

            if (container.analysis?.components) {
                // First render ungrouped components
                const ungroupedComponents = container.analysis.components.filter(c => !c.metadata.group);
                if (ungroupedComponents.length > 0) {
                    lines.push('');
                    lines.push(...ungroupedComponents.map(component => renderComponent(component, 4)));
                }

                // Then render grouped components
                if (container.analysis.groups && Object.keys(container.analysis.groups).length > 0) {
                    if (ungroupedComponents.length > 0) lines.push('');
                    lines.push(...renderGroupedComponents(container.analysis.groups, container.analysis.components, 4));
                }
            }

            lines.push('}');
            parts.push(lines.join('\n'));
        }

        return parts.join('\n\n');
    }

    /**
     * Liquid filter for generating relationship DSL code
     * 
     * @param workspace - Workspace data containing relationships
     * @returns Generated DSL code for relationships
     */
    private relationshipsFilter(workspace: WorkspaceData): string {
        const relationships = workspace.relationships || [];

        // Split relationships into declared and undeclared
        const declaredRelations = relationships.filter(rel => !rel.tags?.includes('UndeclaredRelation'));
        const undeclaredRelations = relationships.filter(rel => rel.tags?.includes('UndeclaredRelation'));

        // Group declared relationships
        const containerRelations = declaredRelations.filter(rel => !rel.source.includes('.') && !rel.target.includes('.'));
        const componentRelations = declaredRelations.filter(rel => rel.source.includes('.'));

        // Group component relations by source container
        const componentRelationsByContainer = new Map<string, Relationship[]>();
        for (const rel of componentRelations) {
            const containerName = rel.source.split('.')[0];
            if (!componentRelationsByContainer.has(containerName)) {
                componentRelationsByContainer.set(containerName, []);
            }
            componentRelationsByContainer.get(containerName)!.push(rel);
        }

        // Helper function to format a relationship
        const formatRelation = (rel: Relationship) => {
            let dsl = `${rel.source} -> ${rel.target} "${rel.description}" "${rel.technology}"`;
            if (rel.tags && rel.tags.length > 0) {
                dsl += ` {
    tags "${rel.tags.join(',')}"
}`;
            }
            return dsl;
        };

        // Generate DSL for declared relations
        const parts = [
            // Container-to-container relations
            ...containerRelations.map(formatRelation)
        ];

        // Add component relations grouped by container
        for (const [containerName, relations] of componentRelationsByContainer) {
            // Add empty line before container group
            if (parts.length > 0) {
                parts.push('');
            }

            // Add relations for this container
            parts.push(...relations.map(formatRelation));
        }

        // Add undeclared relations if any exist
        if (undeclaredRelations.length > 0) {
            // Add separator
            if (parts.length > 0) {
                parts.push('');
                parts.push('# Undeclared relations found in code analysis');
                parts.push('');
            }

            // Group undeclared relations by container
            const undeclaredByContainer = new Map<string, Relationship[]>();
            for (const rel of undeclaredRelations) {
                const containerName = rel.source.split('.')[0];
                if (!undeclaredByContainer.has(containerName)) {
                    undeclaredByContainer.set(containerName, []);
                }
                undeclaredByContainer.get(containerName)!.push(rel);
            }

            // Add undeclared relations grouped by container
            for (const [containerName, relations] of undeclaredByContainer) {
                if (parts[parts.length - 1] !== '') {
                    parts.push('');
                }
                parts.push(...relations.map(formatRelation));
            }
        }

        return parts.join('\n');
    }

    /**
     * Liquid filter for indenting DSL code
     * 
     * @param content - Content to indent
     * @param spaces - Number of spaces to indent
     * @returns Indented content
     */
    private indentFilter(content: string, spaces: number): string {
        const indent = ' '.repeat(spaces);
        const lines = content.split('\n');
        
        // First line should not be indented as it replaces a placeholder
        if (lines.length <= 1) return content;
        
        return [
            lines[0],
            ...lines.slice(1).map(line => line.trim() ? indent + line : line)
        ].join('\n');
    }

    /**
     * Transforms workspace model from analyzer to template format
     */
    private transformWorkspaceData(model: C4WorkspaceModel): WorkspaceData {
        // Transform containers
        const containers = model.containers.map(container => ({
            name: container.data.name,
            title: container.data.name,
            technology: container.data.technology || 'undefined',
            description: container.data.description || 'undefined',
            analysis: container.analysis
        }));

        // Get list of container names for validating targets
        const containerNames = new Set(containers.map(c => c.name));

        // Collect all relationships
        const relationships = [
            // Container-level relations from workspace model
            ...model.relations.map(relation => ({
                source: relation.source,
                target: relation.target,
                description: relation.description,
                technology: relation.technology || 'undefined',
                tags: []
            })),
            // Component-level relations from containers
            ...model.containers.flatMap(container => 
                container.analysis.components.flatMap(component => 
                    component.relations.map(relation => {
                        const source = `${container.data.name}.${relation.sourceComponent}`;
                        let target = relation.metadata.target;

                        // If target doesn't contain a dot and is not a container name,
                        // it's an internal component - add container prefix
                        if (!target.includes('.') && !containerNames.has(target)) {
                            target = `${container.data.name}.${target}`;
                        }
                        
                        return {
                            source,
                            target,
                            description: relation.metadata.description,
                            technology: relation.metadata.technology || 'undefined',
                            tags: relation.metadata.tags || []
                        };
                    })
                )
            ),
            // Add undeclared relations from containers if enabled
            ...(this.includeUndeclared ? model.containers.flatMap(container => 
                container.analysis.undeclaredRelations?.map(relation => {
                    const source = `${container.data.name}.${relation.calledFrom.component.metadata.name}`;
                    const target = `${container.data.name}.${relation.method.component.metadata.name}`;
                    
                    return {
                        source,
                        target,
                        description: `Calls ${relation.method.name}() from ${relation.calledFrom.method || 'constructor'}`,
                        technology: 'Internal',
                        tags: ['UndeclaredRelation']
                    };
                }) || []
            ) : [])
        ];

        return {
            containers,
            relationships
        };
    }

    /**
     * Generates DSL file from workspace data
     * 
     * @throws Error if generation fails
     */
    public async generate(): Promise<void> {
        try {
            // Analyze workspace with undeclared relations if enabled
            const workspaceModel = await this.analyzer.analyze({
                includeUndeclared: this.includeUndeclared,
                includeInvalid: false
            });

            // Transform data to template format
            const workspaceData = this.transformWorkspaceData(workspaceModel);

            // Read template
            const template = readFileSync(this.templateFile, 'utf-8');

            // Generate DSL
            const dsl = await this.engine.parseAndRender(template, {
                workspace: workspaceData
            });

            // Write output
            writeFileSync(this.outputFile, dsl, 'utf-8');
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`DSL generation failed: ${error.message}`);
            }
            throw new Error('DSL generation failed with unknown error');
        }
    }
} 