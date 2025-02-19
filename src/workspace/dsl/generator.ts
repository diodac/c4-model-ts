import { Liquid } from 'liquidjs';
import { WorkspaceAnalyzer } from '../analyzer';
import { C4WorkspaceConfig, C4WorkspaceModel, C4Container } from '../model/workspace';
import { resolve, dirname } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { Groups } from '../../container/model/container';
import { C4RelationshipTags } from '../../container/model/constants';

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
    /** Component URL */
    url?: string;
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
    /** Map of systems in the workspace */
    systems: {
        [systemId: string]: {
            /** System name */
            name: string;
            /** System description */
            description: string;
            /** List of containers in the system */
            containers: Container[];
            /** List of relationships between containers in this system */
            relationships: Relationship[];
        }
    };
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
     * @param system - Workspace data containing containers
     * @returns Generated DSL code for containers
     */
    private containersFilter(system: WorkspaceData['systems'][string]): string {
        const containers = system.containers || [];
        const parts: string[] = [];

        // Helper function to render a component
        const renderComponent = (component: any, indent: number): string => {
            const indentation = ' '.repeat(indent);
            const lines = [
                `${indentation}${component.metadata.name} = component "${component.metadata.name}" {`
            ];

            if (component.metadata.technology) {
                lines.push(`${indentation}    technology "${component.metadata.technology}"`);
            }
            
            if (component.metadata.url) {
                lines.push(`${indentation}    url "${component.metadata.url}"`);
            }
            
            lines.push(
                `${indentation}    description "${component.metadata.description}"`,
                `${indentation}}`
            );
            
            return lines.join('\n');
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
            const dslContainer: Container = {
                name: container.name,
                title: container.title,
                technology: container.technology,
                description: container.description,
                analysis: container.analysis
            };

            const lines = [
                `${dslContainer.name} = container "${dslContainer.title}" {`,
                `    technology "${dslContainer.technology}"`,
                `    description "${dslContainer.description}"`
            ];

            if (dslContainer.analysis?.components) {
                // First render ungrouped components
                const ungroupedComponents = dslContainer.analysis.components.filter(c => !c.metadata.group);
                if (ungroupedComponents.length > 0) {
                    lines.push('');
                    lines.push(...ungroupedComponents.map(component => renderComponent(component, 4)));
                }

                // Then render grouped components
                if (dslContainer.analysis.groups && Object.keys(dslContainer.analysis.groups).length > 0) {
                    if (ungroupedComponents.length > 0) lines.push('');
                    lines.push(...renderGroupedComponents(dslContainer.analysis.groups, dslContainer.analysis.components, 4));
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
     * @param system - Workspace data containing relationships
     * @returns Generated DSL code for relationships
     */
    private relationshipsFilter(system: WorkspaceData['systems'][string]): string {
        const relationships = system.relationships || [];

        // Split relationships into declared and undeclared
        const declaredRelations = relationships.filter(rel => !rel.tags?.includes(C4RelationshipTags.UNDECLARED));
        const undeclaredRelations = relationships.filter(rel => rel.tags?.includes(C4RelationshipTags.UNDECLARED));

        // Group declared relationships
        const containerRelations = declaredRelations.filter(rel => !rel.source.includes('.'));
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
        const parts = [];

        // First add container-to-container relations
        if (containerRelations.length > 0) {
            parts.push('# Container relationships');
            parts.push(...containerRelations.map(formatRelation));
        }

        // Then add component relations grouped by container
        if (componentRelations.length > 0) {
            if (parts.length > 0) parts.push('');
            parts.push('# Component relationships');
            for (const [containerName, relations] of componentRelationsByContainer) {
                parts.push(...relations.map(formatRelation));
                parts.push('');
            }
        }

        // Add undeclared relations if any exist
        if (undeclaredRelations.length > 0) {
            if (parts.length > 0) {
                parts.push('');
                parts.push('# Undeclared relations found in code analysis');
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
     * Transforms workspace model into template-friendly format
     */
    private transformWorkspaceData(model: C4WorkspaceModel): WorkspaceData {
        const systems: WorkspaceData['systems'] = {};

        for (const system of model.systems) {
            // Transform containers and collect their relationships
            const containers: Container[] = [];
            const relationships: Relationship[] = [];

            for (const c4container of system.containers) {
                // Add container
                containers.push({
                    name: c4container.data.name,
                    title: c4container.data.name,
                    technology: c4container.data.technology || '',
                    description: c4container.data.description || '',
                    analysis: c4container.analysis && {
                        components: c4container.analysis.components.map(component => ({
                            metadata: {
                                name: component.metadata.name,
                                description: component.metadata.description || '',
                                technology: component.metadata.technology,
                                group: component.metadata.group,
                                url: component.metadata.url
                            }
                        })),
                        groups: c4container.analysis.groups
                    }
                });

                // Add container-level relationships from c4container.json
                if (c4container.data.relationships) {
                    relationships.push(...c4container.data.relationships.map(relation => ({
                        source: c4container.data.name,
                        target: relation.target,
                        description: relation.description,
                        technology: relation.technology || '',
                        tags: relation.tags
                    })));
                }

                // Extract relationships from components
                if (c4container.analysis?.components) {
                    for (const component of c4container.analysis.components) {
                        if (component.relationships) {
                            relationships.push(...component.relationships.map(relation => {
                                // First check if the entire target is defined in external
                                const isFullPathExternal = c4container.data.external && 
                                    relation.metadata.target in c4container.data.external;
                                
                                if (isFullPathExternal) {
                                    return {
                                        source: `${c4container.data.name}.${component.metadata.name}`,
                                        target: relation.metadata.target,
                                        description: relation.metadata.description || '',
                                        technology: relation.metadata.technology || '',
                                        tags: relation.metadata.tags
                                    };
                                }

                                // If not external as full path, check if needs container prefix
                                const targetParts = relation.metadata.target.split('.');
                                const target = targetParts.length === 1 
                                    ? `${c4container.data.name}.${relation.metadata.target}`
                                    : relation.metadata.target;

                                return {
                                    source: `${c4container.data.name}.${component.metadata.name}`,
                                    target,
                                    description: relation.metadata.description || '',
                                    technology: relation.metadata.technology || '',
                                    tags: relation.metadata.tags
                                };
                            }));
                        }
                    }
                }
            }

            // Add system to the map using id as key
            systems[system.id] = {
                name: system.name,
                description: system.description,
                containers,
                relationships
            };
        }

        return { systems };
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