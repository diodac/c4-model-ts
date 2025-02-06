import { resolve, dirname } from 'path';
import { ContainerConfig } from './model/container';
import { ComponentFinder } from './component-finder';
import { RelationFinder } from './relation-finder';
import { RelationValidator, RelationValidatorConfig } from './relation-validator';
import { ComponentInfo } from './model/component';
import { RelationUsage } from './relation-finder';
import { ValidationResult } from './relation-validator';

export interface AnalysisResult {
    container: {
        name: string;
        description: string;
        technology?: string;
        tags?: string[];
        properties?: Record<string, string>;
    };
    components: Array<ComponentInfo & { relations: Array<{ sourceComponent: string }> }>;
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
        this.componentFinder = new ComponentFinder(config.tsConfigPath);
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
            }))
        };

        // Add undeclared relations if requested
        if (options.includeUndeclared) {
            result.undeclaredRelations = this.relationFinder.findUndeclaredRelations(components);
        }

        // Add invalid relations if requested
        if (options.includeInvalid) {
            result.invalidRelations = this.relationValidator.validateRelations(components);
        }

        return result;
    }

    /**
     * Group components by their group
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