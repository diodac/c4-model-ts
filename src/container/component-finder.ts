import { Project, SourceFile } from 'ts-morph';
import { ComponentInfo } from './model/component';
import { ComponentParser } from './component-parser';
import { RelationParser } from './relation-parser';
import { ContainerConfig } from './model/container';

export class ComponentFinder {
    private project: Project;
    private componentParser: ComponentParser;
    private relationParser: RelationParser;

    constructor(tsConfigPath?: string, containerConfig?: ContainerConfig) {
        this.project = new Project({
            tsConfigFilePath: tsConfigPath
        });
        this.componentParser = new ComponentParser(containerConfig);
        this.relationParser = new RelationParser();
    }

    /**
     * Add source files to analyze
     */
    addSourceFiles(patterns: string[]): void {
        this.project.addSourceFilesAtPaths(patterns);
    }

    /**
     * Find all components in added source files
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
                // Find relations in the component
                const relations = this.relationParser.findRelations(classDecl);
                componentInfo.relations = relations;
                
                components.push(componentInfo);
            }
        }
    }
} 