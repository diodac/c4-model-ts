import { resolve, dirname } from 'path';
import { ContainerConfig, Groups, ContainerRelationship } from './model/container';
import { ComponentFinder } from './component-finder';
import { RelationshipFinder, MethodUsage } from './relationship-finder';
import { ComponentInfo } from './model/component';
import { C4RelationshipTags } from './model/constants';

/**
 * Metadata for a relationship between components
 */
export interface RelationshipMetadata {
    /** Target component name */
    target: string;
    /** Description of the relationship */
    description: string;
    /** Technology used in the relationship */
    technology?: string;
    /** Tags describing the relationship type and properties */
    tags?: string[];
}

/**
 * Result of relationship validation
 */
export interface ValidationResult {
    /** Relationship being validated */
    relationship: {
        sourceComponent: string;
        metadata: RelationshipMetadata;
        location: {
            filePath: string;
            line: number;
            className: string;
        };
    };
    /** Whether target component exists */
    targetExists: boolean;
    /** Whether relationship is actually used in code */
    isUsed: boolean;
    /** Location where relationship is used (if found) */
    usageLocation?: {
        filePath: string;
        line: number;
    };
    /** Validation errors */
    errors?: string[];
}

export interface AnalysisResult {
    container: {
        name: string;
        description: string;
        technology?: string;
        tags?: string[];
        properties?: Record<string, string>;
        relationships?: ContainerRelationship[];
    };
    components: Array<ComponentInfo & { relationships: Array<{ sourceComponent: string }> }>;
    groups: Groups;
    undeclaredRelationships?: MethodUsage[];
    invalidRelationships?: ValidationResult[];
    uniqueUndeclaredRelationships?: Array<{
        from: string;
        to: string;
        type: string;
        occurrences: number;
    }>;
}

export interface ContainerAnalyzerConfig {
    /** Path to tsconfig.json file */
    tsConfigPath: string;
    /** Container configuration */
    config: ContainerConfig;
    /** Root directory of the container project */
    rootDir: string;
}

export class ContainerAnalyzer {
    private componentFinder: ComponentFinder;
    private relationshipFinder: RelationshipFinder;
    private containerConfig: ContainerConfig;

    constructor(config: ContainerAnalyzerConfig) {
        this.containerConfig = config.config;
        this.componentFinder = new ComponentFinder(config.tsConfigPath, config.config);
        this.relationshipFinder = new RelationshipFinder(config.tsConfigPath, config.rootDir);

        // Add source files to component finder
        if (config.config.source) {
            const sourcePaths = config.config.source.map(pattern => 
                resolve(config.rootDir, pattern)
            );
            this.componentFinder.addSourceFiles(sourcePaths);
        }
    }

    /**
     * Create a summary of unique undeclared relationships
     */
    private createUniqueRelationshipsSummary(relationships: MethodUsage[]): Array<{
        from: string;
        to: string;
        type: string;
        occurrences: number;
    }> {
        // Create a map to count occurrences of unique relationships
        const relationshipMap = new Map<string, {
            from: string;
            to: string;
            type: string;
            occurrences: number;
        }>();

        // Count occurrences of each unique relationship
        for (const rel of relationships) {
            const key = `${rel.summary.from}|${rel.summary.to}|${rel.summary.type}`;
            const existing = relationshipMap.get(key);
            if (existing) {
                existing.occurrences++;
            } else {
                relationshipMap.set(key, {
                    from: rel.summary.from,
                    to: rel.summary.to,
                    type: rel.summary.type,
                    occurrences: 1
                });
            }
        }

        // Convert map to array and sort by from, to, type
        return Array.from(relationshipMap.values()).sort((a, b) => {
            const fromCompare = a.from.localeCompare(b.from);
            if (fromCompare !== 0) return fromCompare;
            const toCompare = a.to.localeCompare(b.to);
            if (toCompare !== 0) return toCompare;
            return a.type.localeCompare(b.type);
        });
    }

    /**
     * Analyze the container and return results
     */
    analyze(options: {
        includeUndeclared?: boolean;
        includeInvalid?: boolean;
    } = {}): AnalysisResult {
        // Find components
        const components = this.componentFinder.findComponents();

        // Find all actual relationships in code
        const allRelationships = this.relationshipFinder.findAllRelationships(components);

        // Create maps for quick lookups
        const componentsByName = new Map(components.map(c => [c.metadata.name, c]));
        const declaredRelations = new Map<string, Array<{ 
            sourceComponent: string; 
            metadata: RelationshipMetadata;
        }>>();
        
        // Create a set to track all relationships (declared and undeclared)
        const allRelationshipKeys = new Set<string>();
        
        // Collect all declared relationships
        for (const component of components) {
            for (const rel of component.relationships) {
                const key = `${component.metadata.name}|${rel.metadata.target}`;
                const existing = declaredRelations.get(key) || [];
                existing.push({
                    sourceComponent: component.metadata.name,
                    metadata: rel.metadata
                });
                declaredRelations.set(key, existing);
                // Add to all relationships set
                allRelationshipKeys.add(key);
            }
        }

        // Prepare validation results
        const validationResults: ValidationResult[] = [];
        const undeclaredRelationships: MethodUsage[] = [];
        const uniqueUndeclaredMap = new Map<string, MethodUsage>();

        // Analyze each actual relationship
        for (const usage of allRelationships) {
            const key = `${usage.calledFrom.component.metadata.name}|${usage.method.component.metadata.name}`;
            
            if (declaredRelations.has(key)) {
                // Relationship is declared and used - validate tags
                const declared = declaredRelations.get(key)![0]; // Take first declaration for now
                const declaredTags = new Set(declared.metadata.tags || []);

                // Check if relationship is marked as both direct and indirect
                const errors: string[] = [];
                const targetComponent = componentsByName.get(declared.metadata.target);
                
                // Only validate tags if target component exists
                if (targetComponent && declaredTags.has(C4RelationshipTags.DIRECT) && declaredTags.has(C4RelationshipTags.INDIRECT)) {
                    errors.push(
                        `Relationship from "${declared.sourceComponent}" to "${declared.metadata.target}" cannot be both direct and indirect`
                    );
                }

                // Add appropriate tag based on actual usage - only if target exists
                const isDirect = usage.summary.type === C4RelationshipTags.DIRECT;
                const tags = [...(declared.metadata.tags || [])];
                if (targetComponent) {
                    if (isDirect && !declaredTags.has(C4RelationshipTags.DIRECT)) {
                        tags.push(C4RelationshipTags.DIRECT);
                    } else if (!isDirect && !declaredTags.has(C4RelationshipTags.INDIRECT)) {
                        tags.push(C4RelationshipTags.INDIRECT);
                    }
                }

                // Only add validation result if there are tag-related errors
                if (errors.length > 0) {
                    validationResults.push({
                        relationship: {
                            sourceComponent: declared.sourceComponent,
                            metadata: {
                                ...declared.metadata,
                                tags
                            },
                            location: {
                                filePath: usage.calledFrom.filePath,
                                line: usage.calledFrom.line,
                                className: usage.calledFrom.component.metadata.name
                            }
                        },
                        targetExists: true,
                        isUsed: true,
                        usageLocation: {
                            filePath: usage.calledFrom.filePath,
                            line: usage.calledFrom.line
                        },
                        errors
                    });
                }
                
                // Mark this relationship as processed
                declaredRelations.delete(key);
            } else if (!allRelationshipKeys.has(key)) {
                // Only add as undeclared if there's no relationship at all between these components
                undeclaredRelationships.push(usage);
                uniqueUndeclaredMap.set(
                    `${usage.summary.from}|${usage.summary.to}|${usage.summary.type}`,
                    usage
                );
                // Add to all relationships set to prevent duplicates
                allRelationshipKeys.add(key);
            }
        }

        // Any remaining declared relations are unused
        for (const [key, declarations] of declaredRelations) {
            const [source, target] = key.split('|');
            const targetComponent = componentsByName.get(target);

            // Skip if target is external or container-level relationship
            if (this.containerConfig?.external?.[target] || 
                this.containerConfig?.relationships?.some(rel => rel.target === target)) {
                continue;
            }

            for (const declared of declarations) {
                // For unused relationships, we only report that they are unused
                validationResults.push({
                    relationship: {
                        sourceComponent: declared.sourceComponent,
                        metadata: declared.metadata,
                        location: componentsByName.get(source)!.location
                    },
                    targetExists: !!targetComponent,
                    isUsed: false,
                    errors: targetComponent 
                        ? ['This relationship is documented but not found in the code.']
                        : ['The target component does not exist in the codebase.']
                });
            }
        }

        // Prepare result
        const result: AnalysisResult = {
            container: {
                name: this.containerConfig.name,
                description: this.containerConfig.description || '',
                technology: this.containerConfig.technology,
                tags: this.containerConfig.tags,
                properties: this.containerConfig.properties,
                relationships: this.containerConfig.relationships
            },
            components: components.map(component => ({
                ...component,
                relationships: component.relationships.map(relationship => ({
                    ...relationship,
                    sourceComponent: component.metadata.name
                }))
            })),
            groups: new Set(components
                .filter(c => c.metadata.group)
                .map(c => c.metadata.group!)
            )
        };

        // Add undeclared relations if requested
        if (options.includeUndeclared) {
            result.undeclaredRelationships = undeclaredRelationships;
            result.uniqueUndeclaredRelationships = this.createUniqueRelationshipsSummary(undeclaredRelationships);
        }

        // Add invalid relations if requested
        if (options.includeInvalid) {
            result.invalidRelationships = validationResults;
        }

        return result;
    }
} 