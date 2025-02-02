import { Project, ClassDeclaration, MethodDeclaration } from "ts-morph";
import { C4DocParser } from "./parser";
import { 
    StructurizrModel, 
    C4ModelData, 
    C4ContainerMetadata,
    C4ComponentMetadata,
    C4RelationMetadata,
    C4ContainerConfig,
    C4ExternalConfig,
    C4ElementType
} from "./model";
import { C4RelationValidator } from "./validator";
import * as path from 'path';

export class C4Generator {
    private project: Project;
    private parser: C4DocParser;
    private model: StructurizrModel;
    private validator: C4RelationValidator;

    constructor(
        private containerConfig: C4ContainerConfig,
        private baseDir: string
    ) {
        const tsConfigPath = path.join(baseDir, 'tsconfig.json');
        
        this.project = new Project({
            tsConfigFilePath: tsConfigPath,
        });
        
        this.parser = new C4DocParser();
        this.validator = new C4RelationValidator(this.project);
        
        // Konwersja external config do wymaganego formatu
        const externalConfig: C4ExternalConfig = {};
        if (containerConfig.external) {
            Object.entries(containerConfig.external).forEach(([key, value]) => {
                externalConfig[key] = {
                    type: value.type as C4ElementType
                };
            });
        }
        
        const containerData: C4ContainerMetadata = {
            name: containerConfig.name,
            description: containerConfig.description,
            technology: containerConfig.technology,
            external: externalConfig
        };
        
        this.model = new StructurizrModel(containerData, containerConfig.groups || {});
    }

    generate(): C4ModelData {
        // Zmiana katalogu roboczego na katalog bazowy
        const originalCwd = process.cwd();
        process.chdir(this.baseDir);
        
        try {
            const sourceFiles = this.project.getSourceFiles(this.containerConfig.source || ['**/*.ts']);
            const components: { metadata: C4ComponentMetadata, groupName?: string, declaration: ClassDeclaration }[] = [];
            const relations: { relation: C4RelationMetadata, declaration: ClassDeclaration | MethodDeclaration }[] = [];

            // First pass: collect all components and relations
            for (const sourceFile of sourceFiles) {
                const classes = sourceFile.getClasses();
                
                for (const classDeclaration of classes) {
                    // Process component metadata
                    const componentData = this.parser.parseComponent(classDeclaration);
                    if (componentData) {
                        components.push({ ...componentData, declaration: classDeclaration });
                    }

                    // Collect class-level relationships
                    const classRelations = this.parser.parseRelations(classDeclaration);
                    for (const relation of classRelations) {
                        relations.push({ relation, declaration: classDeclaration });
                    }

                    // Collect method-level relationships
                    const methods = classDeclaration.getMethods();
                    for (const method of methods) {
                        const methodRelations = this.parser.parseRelations(method);
                        for (const relation of methodRelations) {
                            relations.push({ relation, declaration: method });
                        }
                    }
                }
            }

            // Second pass: add components to model and register them with validator
            for (const component of components) {
                this.model.addComponent(component.metadata, component.groupName);
                this.validator.registerComponent(component.metadata.name, component.declaration);
            }

            // Third pass: add relations to model and register them with validator
            for (const relation of relations) {
                this.model.addRelation(relation.relation);
                this.validator.registerRelation(relation.relation);
            }

            // Validate relations
            const missingRelations = this.validator.validate();
            if (missingRelations.length > 0) {
                throw new Error(
                    'Missing component relations detected:\n' + missingRelations.join('\n')
                );
            }

            return this.model.getData();
        } finally {
            // Przywróć oryginalny katalog roboczy
            process.chdir(originalCwd);
        }
    }

    generateDSL(): string {
        const model = this.generate();
        const dsl: string[] = [];

        // Container definition
        dsl.push(`container "${model.container.name}" {`);
        dsl.push(`    description "${model.container.description}"`);
        if (model.container.technology) {
            dsl.push(`    technology "${model.container.technology}"`);
        }
        dsl.push('');

        // Groups and components
        const processGroup = (groupName: string, indent: number) => {
            const indentation = ' '.repeat(indent);
            
            // Skip default group in DSL output
            if (groupName === '_') {
                // Components without group
                model.groupComponents[groupName].forEach(componentName => {
                    const component = model.components.find(c => c.name === componentName);
                    if (component) {
                        dsl.push(this.formatComponent(component, indent));
                        dsl.push('');
                    }
                });
                return;
            }

            dsl.push(`${indentation}group "${groupName}" {`);
            
            // Components in this group
            model.groupComponents[groupName]?.forEach(componentName => {
                const component = model.components.find(c => c.name === componentName);
                if (component) {
                    dsl.push(this.formatComponent(component, indent + 4));
                    dsl.push('');
                }
            });

            // Subgroups
            const subgroups = Object.entries(model.groups[groupName] || {});
            subgroups.forEach(([subgroupName]) => {
                processGroup(subgroupName, indent + 4);
            });

            dsl.push(`${indentation}}`);
            dsl.push('');
        };

        // Process root groups
        Object.keys(model.groups).forEach(groupName => {
            processGroup(groupName, 4);
        });

        // Components without group (in root)
        processGroup('_', 4);

        // Relationships
        dsl.push('    # relationships');
        model.relations.forEach(relation => {
            let relationStr = `    ${relation.source} -> ${relation.target}`;
            if (relation.description) {
                relationStr += ` "${relation.description}"`;
            }
            if (relation.technology) {
                relationStr += ` "${relation.technology}"`;
            }
            if (relation.tags?.length) {
                relationStr += ` "${relation.tags.join(',')}"`;
            }
            dsl.push(relationStr);
        });

        dsl.push('}');

        return dsl.join('\n');
    }

    private formatComponent(component: C4ComponentMetadata, indent: number): string {
        const indentation = ' '.repeat(indent);
        const lines: string[] = [];

        lines.push(`${indentation}component "${component.name}" {`);
        
        if (component.description) {
            lines.push(`${indentation}    description "${component.description}"`);
        }
        if (component.technology) {
            lines.push(`${indentation}    technology "${component.technology}"`);
        }
        if (component.tags?.length) {
            lines.push(`${indentation}    tags "${component.tags.join(',')}"`);
        }
        if (component.url) {
            lines.push(`${indentation}    url "${component.url}"`);
        }

        if (component.properties && Object.keys(component.properties).length > 0) {
            lines.push(`${indentation}    properties {`);
            Object.entries(component.properties).forEach(([key, value]) => {
                lines.push(`${indentation}        ${key} "${value}"`);
            });
            lines.push(`${indentation}    }`);
        }

        if (component.perspectives && Object.keys(component.perspectives).length > 0) {
            lines.push(`${indentation}    perspectives {`);
            Object.entries(component.perspectives).forEach(([key, perspective]) => {
                const value = perspective.value ? ` "${perspective.value}"` : '';
                lines.push(`${indentation}        ${key} "${perspective.description}"${value}`);
            });
            lines.push(`${indentation}    }`);
        }

        if (component.docs) {
            lines.push(`${indentation}    !docs "${component.docs}"`);
        }
        if (component.adrs) {
            lines.push(`${indentation}    !adrs "${component.adrs}"`);
        }

        lines.push(`${indentation}}`);
        return lines.join('\n');
    }
} 