import { Project, SourceFile } from 'ts-morph';
import { ComponentInfo } from './model/component';
import { RelationshipParser } from './relationship-parser';
import { ComponentParser } from './component-parser';
import { ContainerConfig } from './model/container';

export class ComponentFinder {
    private project: Project;
    private relationshipParser: RelationshipParser;
    private componentParser: ComponentParser;

    constructor(tsConfigPath?: string, config?: ContainerConfig) {
        this.project = new Project({
            tsConfigFilePath: tsConfigPath
        });
        this.relationshipParser = new RelationshipParser();
        this.componentParser = new ComponentParser(config);
    }

    /**
     * Add source files to the project
     */
    addSourceFiles(patterns: string[]): void {
        this.project.addSourceFilesAtPaths(patterns);
    }

    /**
     * Find all components in the project
     */
    findComponents(): ComponentInfo[] {
        const components: ComponentInfo[] = [];

        for (const sourceFile of this.project.getSourceFiles()) {
            this.findComponentsInFile(sourceFile, components);
        }

        return components;
    }

    private findComponentsInFile(sourceFile: SourceFile, components: ComponentInfo[]): void {
        // Find all classes in the file
        const classes = sourceFile.getClasses();

        for (const classDecl of classes) {
            const componentInfo = this.componentParser.parse(classDecl);
            if (componentInfo) {
                // Find relationships in the component
                const relationships = this.relationshipParser.findRelationships(classDecl);
                componentInfo.relationships = relationships;
                
                components.push(componentInfo);
            }
        }
    }
} 