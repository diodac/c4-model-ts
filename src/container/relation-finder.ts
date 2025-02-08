import { ClassDeclaration, Symbol, SyntaxKind, Project, Node, MethodDeclaration, CallExpression } from 'ts-morph';
import { ComponentInfo } from './model/component';
import { RelationInfo } from './model/relation';

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
}

/**
 * Finds relations between components by analyzing method usage
 */
export class RelationFinder {
    private project: Project;
    private componentMethods: Map<string, { component: ComponentInfo; methods: MethodDeclaration[] }>;
    private methodUsages: MethodUsage[];

    constructor(tsConfigPath?: string) {
        this.project = new Project({
            tsConfigFilePath: tsConfigPath
        });
        this.componentMethods = new Map();
        this.methodUsages = [];
    }

    /**
     * Find all relations between components by analyzing method usage patterns.
     * This includes both direct and indirect method calls between components.
     */
    findAllRelations(components: ComponentInfo[]): MethodUsage[] {
        this.componentMethods.clear();
        this.methodUsages = [];

        // First collect all methods from components
        this.collectComponentMethods(components);

        // Then analyze method usage patterns
        this.analyzeMethodUsages();

        return this.methodUsages;
    }

    /**
     * Find only undeclared relations between components.
     * These are relations that exist in code through method calls but are not documented with @c4Relation tags.
     */
    findUndeclaredRelations(components: ComponentInfo[]): MethodUsage[] {
        const allUsages = this.findAllRelations(components);
        
        return allUsages.filter(usage => {
            // Get all declared relations from source component
            const declaredRelations = usage.calledFrom.component.relations;
            
            // Check if there's a declared relation matching this usage
            const isDeclared = declaredRelations.some(relation => 
                relation.metadata.target === usage.method.component.metadata.name
            );

            // Keep only undeclared relations
            return !isDeclared;
        });
    }

    private collectComponentMethods(components: ComponentInfo[]): void {
        for (const component of components) {
            const componentClass = this.getComponentClass(component);
            if (!componentClass) continue;

            const methods = componentClass.getMethods();
            this.componentMethods.set(component.metadata.name, { component, methods });
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
        method: MethodDeclaration, 
        sourceComponent: ComponentInfo,
        callChain: string[]
    ): void {
        const body = method.getBody();
        if (!body) return;

        const currentChain = [...callChain, `${sourceComponent.metadata.name}.${method.getName()}`];
        
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
                        callChain
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