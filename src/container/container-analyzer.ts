import { resolve, dirname } from 'path';
import { ContainerConfig, Groups } from './model/container';
import { ComponentFinder } from './component-finder';
import { RelationFinder } from './relation-finder';
import { RelationValidator, RelationValidatorConfig } from './relation-validator';
import { ComponentInfo } from './model/component';
import { MethodUsage } from './relation-finder';
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
    groups: Groups;
    undeclaredRelations?: MethodUsage[];
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
        this.relationFinder = new RelationFinder(config.tsConfigPath);
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
            })),
            groups: this.containerConfig.groups || {}
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
} 