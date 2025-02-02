import { Project, ClassDeclaration, MethodDeclaration, Node, ReferencedSymbol, SourceFile } from "ts-morph";
import { C4ComponentMetadata, C4RelationMetadata, StructurizrValidationError } from "../model";

export class C4RelationValidator {
    private project: Project;
    private components: Map<string, ClassDeclaration> = new Map();
    private relations: C4RelationMetadata[] = [];

    constructor(project: Project) {
        this.project = project;
    }

    registerComponent(name: string, declaration: ClassDeclaration) {
        this.components.set(name, declaration);
    }

    registerRelation(relation: C4RelationMetadata) {
        this.relations.push(relation);
    }

    validate(): string[] {
        const missingRelations: string[] = [];
        const unusedRelations: string[] = [];

        // Check for missing relations (existing code)
        for (const [componentName, componentDeclaration] of this.components) {
            const methods = componentDeclaration.getMethods();
            for (const method of methods) {
                this.validateMethodReferences(componentName, method, missingRelations);
            }
        }

        // Check for declared but unused relations
        for (const relation of this.relations) {
            const sourceClass = this.components.get(relation.source);
            const targetClass = this.components.get(relation.target);

            if (!sourceClass || !targetClass) continue;

            // Check if there's any actual usage between these components
            const hasUsage = this.validateDeclaredRelation(sourceClass, targetClass);
            if (!hasUsage) {
                unusedRelations.push(
                    `Declared but unused relation: ${relation.source} -> ${relation.target}`
                );
            }
        }

        return [...missingRelations, ...unusedRelations];
    }

    private validateMethodReferences(sourceName: string, method: MethodDeclaration, missingRelations: string[]) {
        // Find all references to this method
        const references = method.findReferences();

        for (const reference of references) {
            // For each reference, traverse up to find the first component that uses it
            const usingComponent = this.findFirstUsingComponent(reference);
            
            if (usingComponent && usingComponent !== sourceName) {
                // Check if relation exists
                const relationExists = this.relations.some(relation => 
                    relation.source === usingComponent && 
                    relation.target === sourceName
                );

                if (!relationExists) {
                    missingRelations.push(
                        `Missing relation: ${usingComponent} -> ${sourceName} (method: ${method.getName()})`
                    );
                }
            }
        }
    }

    private findFirstUsingComponent(reference: ReferencedSymbol): string | null {
        for (const ref of reference.getReferences()) {
            let node: Node | undefined = ref.getNode();

            // Traverse up the AST until we find a class declaration
            while (node) {
                if (Node.isClassDeclaration(node)) {
                    const className = node.getName();
                    if (className && this.components.has(className)) {
                        return className;
                    }
                }
                node = node.getParent();
            }
        }

        return null;
    }

    private findIndirectReferences(method: MethodDeclaration, visited: Set<string> = new Set()): Set<string> {
        const componentRefs = new Set<string>();
        const methodName = method.getName();

        // Prevent infinite recursion
        if (visited.has(methodName)) {
            return componentRefs;
        }
        visited.add(methodName);

        // Find all method calls within this method
        const methodCalls = method.getDescendants().filter(Node.isCallExpression);

        for (const call of methodCalls) {
            const symbol = call.getExpression().getSymbol();
            if (symbol) {
                const declarations = symbol.getDeclarations();
                for (const declaration of declarations) {
                    if (Node.isMethodDeclaration(declaration)) {
                        const parentClass = declaration.getParent();
                        if (Node.isClassDeclaration(parentClass)) {
                            const className = parentClass.getName();
                            if (className && this.components.has(className)) {
                                componentRefs.add(className);
                            }
                            // Recursively check called method
                            const refs = this.findIndirectReferences(declaration, visited);
                            refs.forEach(ref => componentRefs.add(ref));
                        }
                    }
                }
            }
        }

        return componentRefs;
    }

    private validateDeclaredRelation(sourceClass: ClassDeclaration, targetClass: ClassDeclaration): boolean {
        // Get all methods from target class
        const targetMethods = targetClass.getMethods();

        // Check direct method calls
        if (this.hasDirectMethodCalls(sourceClass, targetMethods)) {
            return true;
        }

        // Check indirect method calls through other methods
        const sourceMethods = sourceClass.getMethods();
        for (const method of sourceMethods) {
            const indirectRefs = this.findIndirectReferences(method);
            if (indirectRefs.has(targetClass.getName() || '')) {
                return true;
            }
        }

        // Check constructor injection
        const constructor = sourceClass.getConstructors()[0];
        if (constructor) {
            const params = constructor.getParameters();
            for (const param of params) {
                const type = param.getType();
                const symbol = type.getSymbol();
                if (symbol && symbol.getName() === targetClass.getName()) {
                    return true;
                }
            }
        }

        // Check class properties
        const properties = sourceClass.getProperties();
        for (const prop of properties) {
            const type = prop.getType();
            const symbol = type.getSymbol();
            if (symbol && symbol.getName() === targetClass.getName()) {
                return true;
            }
        }

        return false;
    }

    private hasDirectMethodCalls(sourceClass: ClassDeclaration, targetMethods: MethodDeclaration[]): boolean {
        for (const method of targetMethods) {
            const references = method.findReferences();
            for (const reference of references) {
                for (const ref of reference.getReferences()) {
                    let node: Node | undefined = ref.getNode();
                    while (node) {
                        if (Node.isClassDeclaration(node) && node === sourceClass) {
                            return true;
                        }
                        node = node.getParent();
                    }
                }
            }
        }
        return false;
    }
} 