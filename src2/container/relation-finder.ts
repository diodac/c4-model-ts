import { ClassDeclaration, Symbol, SyntaxKind, Project } from 'ts-morph';
import { ComponentInfo } from './model/component';
import { RelationInfo } from './model/relation';

/**
 * Information about found relation usage
 */
export interface RelationUsage {
    /** Source component */
    sourceComponent: ComponentInfo;
    /** Target component */
    targetComponent: ComponentInfo;
    /** Location in code */
    location: {
        filePath: string;
        line: number;
        methodName?: string;
    };
    /** Type of usage */
    usageType: 'constructor' | 'property' | 'method-param' | 'method-return' | 'method-call';
}

/**
 * Finds relations between components by analyzing code
 */
export class RelationFinder {
    private project: Project;

    constructor(tsConfigPath?: string) {
        this.project = new Project({
            tsConfigFilePath: tsConfigPath
        });
    }

    /**
     * Find all relations between components by analyzing code.
     * This includes both declared (documented in JSDoc) and undeclared (found in code) relations.
     */
    findAllRelations(components: ComponentInfo[]): RelationUsage[] {
        const usages: RelationUsage[] = [];
        const componentsBySymbol = new Map<Symbol, ComponentInfo>();

        // Build map of component symbols
        for (const component of components) {
            const symbol = this.getComponentSymbol(component);
            if (symbol) {
                componentsBySymbol.set(symbol, component);
            }
        }

        // Find usages in each component
        for (const sourceComponent of components) {
            const sourceSymbol = this.getComponentSymbol(sourceComponent);
            if (!sourceSymbol) continue;

            const sourceClass = this.getComponentClass(sourceComponent);
            if (!sourceClass) continue;

            // Check constructor parameters
            this.findConstructorUsages(sourceClass, sourceComponent, componentsBySymbol, usages);

            // Check properties
            this.findPropertyUsages(sourceClass, sourceComponent, componentsBySymbol, usages);

            // Check methods
            this.findMethodUsages(sourceClass, sourceComponent, componentsBySymbol, usages);
        }

        return usages;
    }

    /**
     * Find only undeclared relations between components.
     * These are relations that exist in code but are not documented in JSDoc tags.
     */
    findUndeclaredRelations(components: ComponentInfo[]): RelationUsage[] {
        const allRelations = this.findAllRelations(components);
        return this.filterOutDeclaredRelations(allRelations, components);
    }

    private getComponentSymbol(component: ComponentInfo): Symbol | undefined {
        const file = this.project.getSourceFile(component.location.filePath);
        if (!file) return undefined;

        const classDecl = file.getClass(component.location.className);
        if (!classDecl) return undefined;

        return classDecl.getSymbol();
    }

    private getComponentClass(component: ComponentInfo): ClassDeclaration | undefined {
        const file = this.project.getSourceFile(component.location.filePath);
        if (!file) return undefined;

        return file.getClass(component.location.className);
    }

    private findConstructorUsages(
        sourceClass: ClassDeclaration,
        sourceComponent: ComponentInfo,
        componentsBySymbol: Map<Symbol, ComponentInfo>,
        usages: RelationUsage[]
    ): void {
        const constructor = sourceClass.getConstructors()[0];
        if (!constructor) return;

        for (const param of constructor.getParameters()) {
            const type = param.getType();
            const typeSymbol = type.getSymbol();
            if (!typeSymbol) continue;

            const targetComponent = componentsBySymbol.get(typeSymbol);
            if (targetComponent) {
                usages.push({
                    sourceComponent,
                    targetComponent,
                    location: {
                        filePath: sourceClass.getSourceFile().getFilePath(),
                        line: param.getStartLineNumber()
                    },
                    usageType: 'constructor'
                });
            }
        }
    }

    private findPropertyUsages(
        sourceClass: ClassDeclaration,
        sourceComponent: ComponentInfo,
        componentsBySymbol: Map<Symbol, ComponentInfo>,
        usages: RelationUsage[]
    ): void {
        for (const property of sourceClass.getProperties()) {
            const type = property.getType();
            const typeSymbol = type.getSymbol();
            if (!typeSymbol) continue;

            const targetComponent = componentsBySymbol.get(typeSymbol);
            if (targetComponent) {
                usages.push({
                    sourceComponent,
                    targetComponent,
                    location: {
                        filePath: sourceClass.getSourceFile().getFilePath(),
                        line: property.getStartLineNumber()
                    },
                    usageType: 'property'
                });
            }
        }
    }

    private findMethodUsages(
        sourceClass: ClassDeclaration,
        sourceComponent: ComponentInfo,
        componentsBySymbol: Map<Symbol, ComponentInfo>,
        usages: RelationUsage[]
    ): void {
        for (const method of sourceClass.getMethods()) {
            // Check parameters
            for (const param of method.getParameters()) {
                const type = param.getType();
                const typeSymbol = type.getSymbol();
                if (!typeSymbol) continue;

                const targetComponent = componentsBySymbol.get(typeSymbol);
                if (targetComponent) {
                    usages.push({
                        sourceComponent,
                        targetComponent,
                        location: {
                            filePath: sourceClass.getSourceFile().getFilePath(),
                            line: param.getStartLineNumber(),
                            methodName: method.getName()
                        },
                        usageType: 'method-param'
                    });
                }
            }

            // Check return type
            const returnType = method.getReturnType();
            const returnSymbol = returnType.getSymbol();
            if (returnSymbol) {
                const targetComponent = componentsBySymbol.get(returnSymbol);
                if (targetComponent) {
                    usages.push({
                        sourceComponent,
                        targetComponent,
                        location: {
                            filePath: sourceClass.getSourceFile().getFilePath(),
                            line: method.getStartLineNumber(),
                            methodName: method.getName()
                        },
                        usageType: 'method-return'
                    });
                }
            }

            // Check method calls
            const body = method.getBody();
            if (body) {
                const calls = body.getDescendantsOfKind(SyntaxKind.CallExpression);
                for (const call of calls) {
                    const expression = call.getExpression();
                    const expressionType = expression.getType();
                    const expressionSymbol = expressionType.getSymbol();
                    if (!expressionSymbol) continue;

                    const targetComponent = componentsBySymbol.get(expressionSymbol);
                    if (targetComponent) {
                        usages.push({
                            sourceComponent,
                            targetComponent,
                            location: {
                                filePath: sourceClass.getSourceFile().getFilePath(),
                                line: call.getStartLineNumber(),
                                methodName: method.getName()
                            },
                            usageType: 'method-call'
                        });
                    }
                }
            }
        }
    }

    private filterOutDeclaredRelations(usages: RelationUsage[], components: ComponentInfo[]): RelationUsage[] {
        return usages.filter(usage => {
            // Find all relations from source to target component
            const declaredRelations = usage.sourceComponent.relations.filter(relation => 
                relation.metadata.target === usage.targetComponent.metadata.name
            );

            // If there are no declared relations, this is an undeclared usage
            return declaredRelations.length === 0;
        });
    }
} 