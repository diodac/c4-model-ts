import { resolve, dirname } from 'path';
import { ContainerConfig, Groups } from './model/container';
import { ComponentFinder } from './component-finder';
import { RelationFinder } from './relation-finder';
import { RelationValidator, RelationValidatorConfig } from './relation-validator';
import { ComponentInfo } from './model/component';
import { RelationUsage } from './relation-finder';
import { ValidationResult } from './relation-validator';

export interface GroupHierarchy {
    name: string;
    components: ComponentInfo[];
    subgroups: GroupHierarchy[];
}

export interface AnalysisResult {
    container: {
        name: string;
        description: string;
        technology?: string;
        tags?: string[];
        properties?: Record<string, string>;
    };
    components: Array<ComponentInfo & { relations: Array<{ sourceComponent: string }> }>;
    groupHierarchy: GroupHierarchy[];
    undeclaredRelations?: RelationUsage[];
    invalidRelations?: ValidationResult[];
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
    private relationFinder: RelationFinder;
    private relationValidator: RelationValidator;
    private containerConfig: ContainerConfig;

    constructor(config: ContainerAnalyzerConfig) {
        this.containerConfig = config.config;

        // Initialize finders
        this.componentFinder = new ComponentFinder(config.tsConfigPath, config.config);
        this.relationFinder = new RelationFinder();
        this.relationValidator = new RelationValidator({
            tsConfigPath: config.tsConfigPath,
            config: config.config,
            rootDir: config.rootDir
        });

        // Add source files - resolve paths relative to root directory
        const sourcePatterns = config.config.source.map(pattern => resolve(config.rootDir, pattern));
        this.componentFinder.addSourceFiles(sourcePatterns);
    }

    /**
     * Analyze the container and return results
     */
    analyze(options: {
        includeUndeclared?: boolean;
        includeInvalid?: boolean;
    } = {}): AnalysisResult {
        // Find components and relations
        const components = this.componentFinder.findComponents();

        // Build group hierarchy
        const groupHierarchy = this.buildGroupHierarchy(components);

        // Prepare result
        const result: AnalysisResult = {
            container: {
                name: this.containerConfig.name,
                description: this.containerConfig.description,
                technology: this.containerConfig.technology,
                tags: this.containerConfig.tags,
                properties: this.containerConfig.properties
            },
            components: components.map(component => ({
                ...component,
                relations: component.relations.map(relation => ({
                    ...relation,
                    sourceComponent: component.metadata.name
                }))
            })),
            groupHierarchy
        };

        // Add undeclared relations if requested
        if (options.includeUndeclared) {
            result.undeclaredRelations = this.relationFinder.findUndeclaredRelations(components);
        }

        // Add invalid relations if requested
        if (options.includeInvalid) {
            const validationResults = this.relationValidator.validateRelations(components);
            result.invalidRelations = validationResults.filter(result => 
                !result.targetExists || 
                !result.isUsed || 
                (result.errors && result.errors.length > 0)
            );
        }

        return result;
    }

    /**
     * Build hierarchical group structure from components using configuration
     */
    private buildGroupHierarchy(components: ComponentInfo[]): GroupHierarchy[] {
        const result: GroupHierarchy[] = [];
        const ungroupedComponents: ComponentInfo[] = [];

        // Collect ungrouped components
        for (const component of components) {
            if (!component.metadata.group) {
                ungroupedComponents.push(component);
            }
        }

        // Add ungrouped components if any
        if (ungroupedComponents.length > 0) {
            result.push({
                name: "(no group)",
                components: ungroupedComponents,
                subgroups: []
            });
        }

        // Build hierarchy from configuration
        if (this.containerConfig.groups) {
            for (const [groupName, subgroups] of Object.entries(this.containerConfig.groups)) {
                result.push(this.buildGroupFromConfig(
                    groupName,
                    subgroups,
                    components.filter(c => c.metadata.group === groupName)
                ));
            }
        }

        return result;
    }

    /**
     * Build group hierarchy from configuration recursively
     */
    private buildGroupFromConfig(name: string, subgroups: Groups | Record<string, never>, components: ComponentInfo[]): GroupHierarchy {
        const result: GroupHierarchy = {
            name,
            components,
            subgroups: []
        };

        // Process subgroups if any
        for (const [subgroupName, nestedSubgroups] of Object.entries(subgroups)) {
            result.subgroups.push(this.buildGroupFromConfig(
                subgroupName,
                nestedSubgroups,
                components.filter(c => c.metadata.group === subgroupName)
            ));
        }

        return result;
    }

    /**
     * Group components by their immediate group
     * @deprecated Use buildGroupHierarchy instead for hierarchical grouping
     */
    groupComponents(components: ComponentInfo[]): Map<string, ComponentInfo[]> {
        const groupedComponents = new Map<string, ComponentInfo[]>();
        
        for (const component of components) {
            const group = component.metadata.group || '(no group)';
            if (!groupedComponents.has(group)) {
                groupedComponents.set(group, []);
            }
            groupedComponents.get(group)!.push(component);
        }

        return groupedComponents;
    }
} 