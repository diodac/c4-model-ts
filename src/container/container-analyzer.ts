import { resolve, dirname } from 'path';
import { ContainerConfig, Groups, ContainerRelationship } from './model/container';
import { ComponentFinder } from './component-finder';
import { RelationshipFinder, MethodUsage } from './relationship-finder';
import { RelationshipValidator, RelationshipValidatorConfig } from './relationship-validator';
import { ComponentInfo } from './model/component';
import { ValidationResult } from './relationship-validator';

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
    private relationshipValidator: RelationshipValidator;
    private containerConfig: ContainerConfig;

    constructor(config: ContainerAnalyzerConfig) {
        this.containerConfig = config.config;

        // Initialize finders
        this.componentFinder = new ComponentFinder(config.tsConfigPath, config.config);
        this.relationshipFinder = new RelationshipFinder(config.tsConfigPath);
        this.relationshipValidator = new RelationshipValidator({
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
            groups: this.containerConfig.groups || {}
        };

        // Add undeclared relations if requested
        if (options.includeUndeclared) {
            result.undeclaredRelationships = this.relationshipFinder.findUndeclaredRelationships(components);
        }

        // Add invalid relations if requested
        if (options.includeInvalid) {
            const validationResults = this.relationshipValidator.validateRelationships(components);
            result.invalidRelationships = validationResults.filter((result: ValidationResult) => 
                !result.targetExists || 
                !result.isUsed || 
                (result.errors && result.errors.length > 0)
            );
        }

        return result;
    }
} 