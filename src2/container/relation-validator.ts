import { Project, SourceFile, Symbol, CallExpression, SyntaxKind } from 'ts-morph';
import { ComponentInfo } from './model/component';
import { RelationInfo } from './model/relation';
import { ContainerConfig } from './model/container';
import { resolve, dirname } from 'path';

/**
 * Result of relation validation
 */
export interface ValidationResult {
    /** Relation being validated */
    relation: RelationInfo;
    /** Whether target component exists */
    targetExists: boolean;
    /** Whether relation is actually used in code */
    isUsed: boolean;
    /** Location where relation is used (if found) */
    usageLocation?: {
        filePath: string;
        line: number;
    };
    /** Validation errors */
    errors?: string[];
}

/**
 * Validates relations between components
 */
export class RelationValidator {
    private project: Project;
    private config?: ContainerConfig;
    private configDir?: string;

    constructor(tsConfigPath?: string) {
        this.project = new Project({
            tsConfigFilePath: tsConfigPath
        });
    }

    /**
     * Set container configuration for validating external components
     */
    setConfig(config: ContainerConfig, configPath: string) {
        this.config = config;
        this.configDir = dirname(configPath);

        // Add source files to project
        if (config.source && this.configDir) {
            const sourcePaths = config.source.map(pattern => 
                resolve(this.configDir!, pattern)
            );
            const files = this.project.addSourceFilesAtPaths(sourcePaths);
        }
    }

    /**
     * Validate all relations in components
     */
    validateRelations(components: ComponentInfo[]): ValidationResult[] {
        const results: ValidationResult[] = [];
        const componentsByName = new Map(components.map(c => [c.metadata.name, c]));

        // First validate declared relations
        for (const component of components) {
            for (const relation of component.relations) {
                const result = this.validateRelation(relation, componentsByName);
                results.push(result);
            }
        }

        // Then check for undeclared relations
        for (const component of components) {
            const undeclaredResults = this.findUndeclaredRelations(component, components, componentsByName);
            results.push(...undeclaredResults);
        }

        return results;
    }

    /**
     * Find relations that are used in code but not declared in JSDoc
     */
    private findUndeclaredRelations(
        component: ComponentInfo,
        allComponents: ComponentInfo[],
        componentsByName: Map<string, ComponentInfo>
    ): ValidationResult[] {
        const results: ValidationResult[] = [];
        const declaredTargets = new Set(component.relations.map(r => r.metadata.target));
        const sourceFile = this.project.getSourceFile(component.location.filePath);
        
        if (!sourceFile) return results;

        // Check all components to find undeclared usages
        for (const targetComponent of allComponents) {
            // Skip if it's the same component or if relation is already declared
            if (targetComponent.metadata.name === component.metadata.name || 
                declaredTargets.has(targetComponent.metadata.name)) {
                continue;
            }

            const targetFile = this.project.getSourceFile(targetComponent.location.filePath);
            if (!targetFile) continue;

            const targetClass = targetFile.getClass(targetComponent.location.className);
            if (!targetClass) continue;

            const targetSymbol = targetClass.getSymbol();
            if (!targetSymbol) continue;

            // Check for any usage
            const constructorUsage = this.checkConstructorParameters(sourceFile, targetSymbol);
            const propertyUsage = this.checkProperties(sourceFile, targetSymbol);
            const methodUsage = this.checkMethods(sourceFile, targetSymbol);

            // Skip if the usage is in constructor parameters, as these should be declared with @c4Relation
            if (constructorUsage) {
                const constructor = sourceFile.getClass(component.location.className)?.getConstructors()[0];
                if (constructor) {
                    const params = constructor.getParameters();
                    const isConstructorParam = params.some(param => 
                        param.getStartLineNumber() === constructorUsage.line
                    );
                    if (isConstructorParam) continue;
                }
            }

            if (constructorUsage || propertyUsage || methodUsage) {
                const usage = constructorUsage || propertyUsage || methodUsage;
                if (!usage) continue;

                // Create a synthetic relation for the undeclared usage
                const relation: RelationInfo = {
                    sourceComponent: component.metadata.name,
                    metadata: {
                        target: targetComponent.metadata.name,
                        description: 'Undeclared relation',
                        tags: []
                    },
                    location: {
                        filePath: component.location.filePath,
                        className: component.location.className,
                        line: usage.line
                    },
                    rawJSDoc: ''  // No JSDoc for undeclared relations
                };

                results.push({
                    relation,
                    targetExists: true,
                    isUsed: true,
                    usageLocation: usage,
                    errors: [`Undeclared relation from "${component.metadata.name}" to "${targetComponent.metadata.name}" found at ${relation.location.filePath}:${relation.location.line}`]
                });
            }
        }

        return results;
    }

    /**
     * Validate a single relation
     */
    private validateRelation(
        relation: RelationInfo,
        componentsByName: Map<string, ComponentInfo>
    ): ValidationResult {
        const errors: string[] = [];
        const existingTags = new Set(relation.metadata.tags || []);

        // Check if relation is marked as both direct and indirect
        if (existingTags.has('DirectRelation') && existingTags.has('IndirectRelation')) {
            errors.push(`Relation from "${relation.sourceComponent}" to "${relation.metadata.target}" cannot be both direct and indirect`);
        }

        const targetComponent = componentsByName.get(relation.metadata.target);
        const sourceComponent = componentsByName.get(relation.sourceComponent);

        // Check if target is an external component
        const isExternalTarget = this.config?.external?.[relation.metadata.target];

        if (!sourceComponent) {
            return {
                relation,
                targetExists: !!targetComponent || !!isExternalTarget,
                isUsed: false,
                errors
            };
        }

        // If target is external, we consider it exists but don't validate usage
        if (isExternalTarget) {
            return {
                relation,
                targetExists: true,
                isUsed: true,
                errors
            };
        }

        // If target is internal but not found, it's invalid
        if (!targetComponent) {
            return {
                relation,
                targetExists: false,
                isUsed: false,
                errors
            };
        }

        // Get source class declaration
        const sourceFile = this.project.getSourceFile(sourceComponent.location.filePath);
        if (!sourceFile) {
            return {
                relation,
                targetExists: true,
                isUsed: false,
                errors
            };
        }

        // Get target class declaration
        const targetFile = this.project.getSourceFile(targetComponent.location.filePath);
        if (!targetFile) {
            return {
                relation,
                targetExists: true,
                isUsed: false,
                errors
            };
        }

        const targetClass = targetFile.getClass(targetComponent.location.className);
        if (!targetClass) {
            return {
                relation,
                targetExists: true,
                isUsed: false,
                errors
            };
        }

        // Get target symbol once
        const targetSymbol = targetClass.getSymbol();
        if (!targetSymbol) {
            return {
                relation,
                targetExists: true,
                isUsed: false,
                errors
            };
        }

        // Check constructor parameters and properties first (direct usage)
        const constructorUsage = this.checkConstructorParameters(sourceFile, targetSymbol);
        const propertyUsage = this.checkProperties(sourceFile, targetSymbol);
        
        // Check methods for usage
        const methodUsage = this.checkMethods(sourceFile, targetSymbol);

        // Determine if the usage is direct or indirect
        let isDirectUsage = false;
        let usageLocation: { filePath: string; line: number; methodName?: string } | undefined = undefined;

        if (constructorUsage) {
            // Constructor parameter usage is always direct
            isDirectUsage = true;
            usageLocation = constructorUsage;
        } else if (propertyUsage) {
            // Property usage is always direct
            isDirectUsage = true;
            usageLocation = propertyUsage;
        } else if (methodUsage) {
            // Check if method usage is direct (using class property) or indirect (creating new instance)
            const sourceClass = sourceFile.getClass(sourceComponent.location.className);
            if (sourceClass) {
                // Check if the component is stored in a property
                const properties = sourceClass.getProperties();
                const hasPropertyOfType = properties.some(prop => {
                    const type = prop.getType();
                    const symbol = type.getSymbol();
                    return symbol === targetSymbol;
                });

                // Check if the usage is through a property or creating a new instance
                const method = sourceClass.getMethod(methodUsage.methodName);
                const body = method?.getBody();
                if (body) {
                    // Check for direct property access
                    const propertyAccesses = body.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
                    const hasPropertyAccess = propertyAccesses.some(access => {
                        // Get the leftmost expression (e.g., 'this.logger' -> 'this')
                        let leftmost = access;
                        while (leftmost.getKind() === SyntaxKind.PropertyAccessExpression) {
                            leftmost = (leftmost as any).getExpression();
                        }

                        // Check if it's accessing a property through 'this'
                        if (leftmost.getKind() === SyntaxKind.ThisKeyword) {
                            // Get the property name being accessed
                            const propertyName = access.getName();
                            // Check if this property is of the target type
                            const property = sourceClass.getProperty(propertyName);
                            if (property) {
                                const type = property.getType();
                                const symbol = type.getSymbol();
                                return symbol === targetSymbol;
                            }
                        }
                        return false;
                    });

                    // Check for new instance creation
                    const newExpressions = body.getDescendantsOfKind(SyntaxKind.NewExpression);
                    const hasNewExpression = newExpressions.some(expr => {
                        const type = expr.getType();
                        const symbol = type.getSymbol();
                        return symbol === targetSymbol;
                    });

                    // If we have a property of this type and we're accessing it through 'this',
                    // then it's direct usage. If we're creating new instances, it's indirect.
                    isDirectUsage = hasPropertyOfType && hasPropertyAccess && !hasNewExpression;
                }
            }
            usageLocation = methodUsage;
        }

        // Validate tags based on usage
        if (isDirectUsage) {
            if (existingTags.has('IndirectRelation')) {
                errors.push(
                    `Relation from "${relation.sourceComponent}" to "${relation.metadata.target}" is marked as indirect but has direct usage at ${usageLocation?.filePath}:${usageLocation?.line}`
                );
            }
            if (!existingTags.has('DirectRelation')) {
                relation.metadata.tags = [...(relation.metadata.tags || []), 'DirectRelation'];
            }
        } else if (usageLocation) {
            if (existingTags.has('DirectRelation')) {
                errors.push(
                    `Relation from "${relation.sourceComponent}" to "${relation.metadata.target}" is marked as direct but only has indirect usage at ${usageLocation.filePath}:${usageLocation.line}`
                );
            }
            if (!existingTags.has('IndirectRelation')) {
                relation.metadata.tags = [...(relation.metadata.tags || []), 'IndirectRelation'];
            }
        }

        return {
            relation,
            targetExists: true,
            isUsed: !!usageLocation,
            usageLocation,
            errors
        };
    }

    /**
     * Check if target component is used in constructor parameters
     */
    private checkConstructorParameters(
        sourceFile: SourceFile, 
        targetSymbol: Symbol
    ): { filePath: string; line: number; } | undefined {
        const classes = sourceFile.getClasses();
        for (const sourceClass of classes) {
            const constructor = sourceClass.getConstructors()[0];
            if (!constructor) continue;

            // Check constructor parameters
            for (const param of constructor.getParameters()) {
                const type = param.getType();
                const typeSymbol = type.getSymbol();
                if (typeSymbol && typeSymbol === targetSymbol) {
                    return {
                        filePath: sourceFile.getFilePath(),
                        line: param.getStartLineNumber()
                    };
                }
            }

            // Check constructor body for property assignments
            const body = constructor.getBody();
            if (body) {
                const propertyAccesses = body.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
                for (const access of propertyAccesses) {
                    const type = access.getType();
                    const symbol = type.getSymbol();
                    if (symbol && symbol === targetSymbol) {
                        return {
                            filePath: sourceFile.getFilePath(),
                            line: access.getStartLineNumber()
                        };
                    }
                }
            }
        }

        return undefined;
    }

    /**
     * Check if target component is used in class properties
     */
    private checkProperties(
        sourceFile: SourceFile,
        targetSymbol: Symbol
    ): { filePath: string; line: number; } | undefined {
        const classes = sourceFile.getClasses();
        for (const sourceClass of classes) {
            // Check property declarations
            for (const property of sourceClass.getProperties()) {
                const type = property.getType();
                const typeSymbol = type.getSymbol();
                if (typeSymbol && typeSymbol === targetSymbol) {
                    return {
                        filePath: sourceFile.getFilePath(),
                        line: property.getStartLineNumber()
                    };
                }

                // Check array/promise type parameters
                const typeArgs = type.getTypeArguments();
                for (const typeArg of typeArgs) {
                    const argSymbol = typeArg.getSymbol();
                    if (argSymbol && argSymbol === targetSymbol) {
                        return {
                            filePath: sourceFile.getFilePath(),
                            line: property.getStartLineNumber()
                        };
                    }
                }
            }
        }

        return undefined;
    }

    /**
     * Check if target component is used in methods
     */
    private checkMethods(
        sourceFile: SourceFile,
        targetSymbol: Symbol
    ): { filePath: string; line: number; methodName: string } | undefined {
        const classes = sourceFile.getClasses();
        for (const sourceClass of classes) {
            for (const method of sourceClass.getMethods()) {
                // Check method parameters
                for (const param of method.getParameters()) {
                    const type = param.getType();
                    const typeSymbol = type.getSymbol();
                    if (typeSymbol && typeSymbol === targetSymbol) {
                        return {
                            filePath: sourceFile.getFilePath(),
                            line: param.getStartLineNumber(),
                            methodName: method.getName()
                        };
                    }

                    // Check array/promise type parameters
                    const typeArgs = type.getTypeArguments();
                    for (const typeArg of typeArgs) {
                        const argSymbol = typeArg.getSymbol();
                        if (argSymbol && argSymbol === targetSymbol) {
                            return {
                                filePath: sourceFile.getFilePath(),
                                line: param.getStartLineNumber(),
                                methodName: method.getName()
                            };
                        }
                    }
                }

                // Check return type
                const returnType = method.getReturnType();
                const returnSymbol = returnType.getSymbol();
                if (returnSymbol && returnSymbol === targetSymbol) {
                    return {
                        filePath: sourceFile.getFilePath(),
                        line: method.getStartLineNumber(),
                        methodName: method.getName()
                    };
                }

                // Check array/promise return type parameters
                const returnTypeArgs = returnType.getTypeArguments();
                for (const typeArg of returnTypeArgs) {
                    const argSymbol = typeArg.getSymbol();
                    if (argSymbol && argSymbol === targetSymbol) {
                        return {
                            filePath: sourceFile.getFilePath(),
                            line: method.getStartLineNumber(),
                            methodName: method.getName()
                        };
                    }
                }

                // Check method body for usage
                const body = method.getBody();
                if (body) {
                    // Check property access
                    const propertyAccesses = body.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
                    for (const access of propertyAccesses) {
                        const type = access.getType();
                        const symbol = type.getSymbol();
                        if (symbol && symbol === targetSymbol) {
                            return {
                                filePath: sourceFile.getFilePath(),
                                line: access.getStartLineNumber(),
                                methodName: method.getName()
                            };
                        }
                    }

                    // Check variable declarations
                    const declarations = body.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
                    for (const decl of declarations) {
                        const type = decl.getType();
                        const symbol = type.getSymbol();
                        if (symbol && symbol === targetSymbol) {
                            return {
                                filePath: sourceFile.getFilePath(),
                                line: decl.getStartLineNumber(),
                                methodName: method.getName()
                            };
                        }
                    }

                    // Check method calls
                    const calls = body.getDescendantsOfKind(SyntaxKind.CallExpression);
                    for (const call of calls) {
                        const expression = call.getExpression();
                        const expressionType = expression.getType();
                        const expressionSymbol = expressionType.getSymbol();

                        if (expressionSymbol && expressionSymbol === targetSymbol) {
                            return {
                                filePath: sourceFile.getFilePath(),
                                line: call.getStartLineNumber(),
                                methodName: method.getName()
                            };
                        }
                    }
                }
            }
        }

        return undefined;
    }
} 