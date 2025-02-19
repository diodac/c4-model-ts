import { ClassDeclaration, Symbol, SyntaxKind, Project, Node, MethodDeclaration, CallExpression, ArrowFunction, FunctionExpression } from 'ts-morph';
import { ComponentInfo } from './model/component';
import { RelationshipInfo } from './model/relationship';
import { C4RelationshipTags } from './model/constants';

/**
 * Information about method usage between components
 */
export interface MethodUsage {
    /** Method being called */
    method: {
        name: string;
        component: ComponentInfo;
    };
    /** Location where the method is called */
    calledFrom: {
        component: ComponentInfo;
        method?: string;
        filePath: string;
        line: number;
    };
    /** Chain of method calls that led to this usage */
    callChain: string[];
    /** Summary of the undeclared relationship */
    summary: {
        /** Source component in format "path/to/file:ClassName" */
        from: string;
        /** Target component in format "path/to/file:ClassName" */
        to: string;
        /** Type of relationship (DirectRelationship or IndirectRelationship) */
        type: string;
    };
}

/**
 * Finds relationships between components by analyzing method usage
 */
export class RelationshipFinder {
    private project: Project;
    private componentMethods: Map<string, { 
        component: ComponentInfo; 
        methods: Array<MethodDeclaration | ArrowFunction | FunctionExpression>;
    }>;
    private methodUsages: MethodUsage[];
    private configDir: string;

    constructor(tsConfigPath?: string, configDir?: string) {
        this.project = new Project({
            tsConfigFilePath: tsConfigPath
        });
        this.componentMethods = new Map();
        this.methodUsages = [];
        this.configDir = configDir || process.cwd();
    }

    /**
     * Get relative path from config directory
     */
    private getRelativePath(absolutePath: string): string {
        return absolutePath.startsWith(this.configDir) 
            ? absolutePath.slice(this.configDir.length + 1) 
            : absolutePath;
    }

    /**
     * Find all relationships between components, both declared and undeclared
     */
    findAllRelationships(components: ComponentInfo[]): MethodUsage[] {
        const usages: MethodUsage[] = [];
        const componentsByName = new Map(components.map(c => [c.metadata.name, c]));

        // First collect all methods from components
        this.collectComponentMethods(components);

        // Then analyze method usage patterns
        this.analyzeMethodUsages();

        return this.methodUsages;
    }

    /**
     * Find only undeclared relationships between components.
     * These are relationships that exist in code through method calls but are not documented with @c4Relationship tags.
     */
    findUndeclaredRelationships(components: ComponentInfo[]): MethodUsage[] {
        const allUsages = this.findAllRelationships(components);
        
        return allUsages.filter(usage => {
            // Get all declared relationships from source component
            const relationships = usage.calledFrom.component.relationships;
            
            // Check if there's a declared relationship matching this usage
            const isDeclared = relationships.some(relationship => 
                relationship.metadata.target === usage.method.component.metadata.name
            );

            // Keep only undeclared relations
            return !isDeclared;
        });
    }

    private collectComponentMethods(components: ComponentInfo[]): void {
        for (const component of components) {
            const componentClass = this.getComponentClass(component);
            if (!componentClass) continue;

            // Get regular methods
            const methods = componentClass.getMethods();

            // Get properties that are functions
            const propertyMethods = componentClass.getProperties()
                .filter(prop => {
                    const type = prop.getType();
                    return type.getCallSignatures().length > 0;
                })
                .map(prop => {
                    const arrowFunc = prop.getFirstChildByKind(SyntaxKind.ArrowFunction);
                    const funcExpr = prop.getFirstChildByKind(SyntaxKind.FunctionExpression);
                    return arrowFunc || funcExpr;
                })
                .filter((node): node is ArrowFunction | FunctionExpression => node !== undefined);

            // Combine both types of methods
            this.componentMethods.set(component.metadata.name, { 
                component, 
                methods: [...methods, ...propertyMethods] 
            });
        }
    }

    private analyzeMethodUsages(): void {
        for (const [sourceName, sourceInfo] of this.componentMethods) {
            for (const method of sourceInfo.methods) {
                this.analyzeMethodCalls(method, sourceInfo.component, []);
            }
        }
    }

    private analyzeMethodCalls(
        method: MethodDeclaration | ArrowFunction | FunctionExpression, 
        sourceComponent: ComponentInfo,
        callChain: string[]
    ): void {
        const body = method instanceof MethodDeclaration 
            ? method.getBody()
            : method.getBody();
        if (!body) return;

        const methodName = method instanceof MethodDeclaration 
            ? method.getName()
            : method.getParentIfKind(SyntaxKind.PropertyDeclaration)?.getName() || 'anonymous';

        const currentChain = [...callChain, `${sourceComponent.metadata.name}.${methodName}`];
        
        // Find all method calls in the method body
        const calls = body.getDescendantsOfKind(SyntaxKind.CallExpression);
        
        for (const call of calls) {
            this.analyzeCallExpression(call, sourceComponent, currentChain);
        }
    }

    private analyzeCallExpression(
        call: CallExpression, 
        sourceComponent: ComponentInfo,
        callChain: string[]
    ): void {
        const expression = call.getExpression();
        
        // Try to get the symbol of the called method
        const type = expression.getType();
        const signatures = type.getCallSignatures();
        if (signatures.length === 0) return;

        const declaration = signatures[0].getDeclaration();
        if (!Node.isMethodDeclaration(declaration)) return;

        const containingClass = declaration.getParent();
        if (!Node.isClassDeclaration(containingClass)) return;

        // Find which component this method belongs to
        for (const [targetName, targetInfo] of this.componentMethods) {
            if (targetInfo.methods.some(m => m === declaration)) {
                // Found a call to another component's method
                if (sourceComponent.metadata.name !== targetName) {
                    // Determine if this is a direct or indirect relationship
                    let isDirectRelationship = false;

                    // Check if the target component is stored in a property
                    const sourceClass = this.getComponentClass(sourceComponent);
                    if (sourceClass) {
                        const properties = sourceClass.getProperties();
                        const hasPropertyOfType = properties.some(prop => {
                            const propType = prop.getType();
                            const propSymbol = propType.getSymbol();
                            return propSymbol === containingClass.getSymbol();
                        });

                        // If we're accessing a property of the target type, it's a direct relationship
                        if (hasPropertyOfType) {
                            const body = sourceClass.getMethod(callChain[callChain.length - 1]?.split('.')[1])?.getBody();
                            if (body) {
                                const propertyAccesses = body.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
                                isDirectRelationship = propertyAccesses.some(access => {
                                    let leftmost = access;
                                    while (leftmost.getKind() === SyntaxKind.PropertyAccessExpression) {
                                        leftmost = (leftmost as any).getExpression();
                                    }
                                    if (leftmost.getKind() === SyntaxKind.ThisKeyword) {
                                        const propertyName = access.getName();
                                        const property = sourceClass.getProperty(propertyName);
                                        if (property) {
                                            const type = property.getType();
                                            const symbol = type.getSymbol();
                                            return symbol === containingClass.getSymbol();
                                        }
                                    }
                                    return false;
                                });
                            }
                        }
                    }

                    this.methodUsages.push({
                        method: {
                            name: declaration.getName(),
                            component: targetInfo.component
                        },
                        calledFrom: {
                            component: sourceComponent,
                            method: callChain[callChain.length - 1]?.split('.')[1],
                            filePath: call.getSourceFile().getFilePath(),
                            line: call.getStartLineNumber()
                        },
                        callChain,
                        summary: {
                            from: `${this.getRelativePath(sourceComponent.location.filePath)}:${sourceComponent.location.className}`,
                            to: `${this.getRelativePath(targetInfo.component.location.filePath)}:${targetInfo.component.location.className}`,
                            type: isDirectRelationship ? C4RelationshipTags.DIRECT : C4RelationshipTags.INDIRECT
                        }
                    });

                    // Analyze the called method for indirect usage
                    if (!callChain.includes(`${targetName}.${declaration.getName()}`)) {
                        this.analyzeMethodCalls(declaration, targetInfo.component, callChain);
                    }
                }
                break;
            }
        }
    }

    private getComponentClass(component: ComponentInfo): ClassDeclaration | undefined {
        const file = this.project.getSourceFile(component.location.filePath);
        if (!file) return undefined;

        return file.getClass(component.location.className);
    }
} 