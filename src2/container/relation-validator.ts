import { ClassDeclaration, MethodDeclaration, Node, Type, Project, SourceFile, Symbol, CallExpression, SyntaxKind } from 'ts-morph';
import { ComponentInfo } from './component';
import { RelationInfo } from './relation';
import { ContainerConfig } from './config';

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
}

/**
 * Validates relations between components
 */
export class RelationValidator {
    private project: Project;
    private config?: ContainerConfig;

    constructor(tsConfigPath?: string) {
        this.project = new Project({
            tsConfigFilePath: tsConfigPath
        });
    }

    /**
     * Set container configuration for validating external components
     */
    setConfig(config: ContainerConfig) {
        this.config = config;
    }

    /**
     * Validate all relations in components
     */
    validateRelations(components: ComponentInfo[]): ValidationResult[] {
        const results: ValidationResult[] = [];
        const componentsByName = new Map(components.map(c => [c.metadata.name, c]));

        for (const component of components) {
            for (const relation of component.relations) {
                const result = this.validateRelation(relation, componentsByName);
                results.push(result);
            }
        }

        return results;
    }

    private validateRelation(
        relation: RelationInfo, 
        componentsByName: Map<string, ComponentInfo>
    ): ValidationResult {
        const targetComponent = componentsByName.get(relation.metadata.target);
        const sourceComponent = componentsByName.get(relation.sourceComponent);

        // Check if target is an external component
        const isExternalTarget = this.config?.external?.[relation.metadata.target];

        if (!sourceComponent) {
            return {
                relation,
                targetExists: !!targetComponent || !!isExternalTarget,
                isUsed: false
            };
        }

        // If target is external, we consider it exists but don't validate usage
        if (isExternalTarget) {
            return {
                relation,
                targetExists: true,
                isUsed: true // We trust the relation is used if declared
            };
        }

        // If target is internal but not found, it's invalid
        if (!targetComponent) {
            return {
                relation,
                targetExists: false,
                isUsed: false
            };
        }

        // Get source class declaration
        const sourceFile = this.project.getSourceFile(sourceComponent.location.filePath);
        if (!sourceFile) {
            return {
                relation,
                targetExists: true,
                isUsed: false
            };
        }

        // Get target class declaration
        const targetFile = this.project.getSourceFile(targetComponent.location.filePath);
        if (!targetFile) {
            return {
                relation,
                targetExists: true,
                isUsed: false
            };
        }

        const targetClass = targetFile.getClass(targetComponent.location.className);
        if (!targetClass) {
            return {
                relation,
                targetExists: true,
                isUsed: false
            };
        }

        // Get target symbol once
        const targetSymbol = targetClass.getSymbol();
        if (!targetSymbol) {
            return {
                relation,
                targetExists: true,
                isUsed: false
            };
        }

        // Check constructor parameters
        const constructorUsage = this.checkConstructorParameters(sourceFile, targetSymbol);
        if (constructorUsage) {
            return {
                relation,
                targetExists: true,
                isUsed: true,
                usageLocation: constructorUsage
            };
        }

        // Check properties
        const propertyUsage = this.checkProperties(sourceFile, targetSymbol);
        if (propertyUsage) {
            return {
                relation,
                targetExists: true,
                isUsed: true,
                usageLocation: propertyUsage
            };
        }

        // Check methods
        const methodUsage = this.checkMethods(sourceFile, targetSymbol);
        if (methodUsage) {
            return {
                relation,
                targetExists: true,
                isUsed: true,
                usageLocation: methodUsage
            };
        }

        return {
            relation,
            targetExists: true,
            isUsed: false
        };
    }

    /**
     * Check if target component is used in constructor parameters
     */
    private checkConstructorParameters(
        sourceFile: SourceFile, 
        targetSymbol: Symbol
    ): { filePath: string; line: number; } | undefined {
        const sourceClass = sourceFile.getClass(sourceFile.getFilePath().split('/').pop() || '');
        if (!sourceClass) return undefined;

        const constructor = sourceClass.getConstructors()[0];
        if (!constructor) return undefined;

        for (const param of constructor.getParameters()) {
            const type = param.getType();
            
            // Get type symbol (follows imports and aliases)
            const typeSymbol = type.getSymbol();
            if (!typeSymbol) continue;

            // Compare symbols to check if they point to the same declaration
            if (typeSymbol === targetSymbol) {
                return {
                    filePath: sourceFile.getFilePath(),
                    line: param.getStartLineNumber()
                };
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
        const sourceClass = sourceFile.getClass(sourceFile.getFilePath().split('/').pop() || '');
        if (!sourceClass) return undefined;

        for (const property of sourceClass.getProperties()) {
            // Get property type
            const type = property.getType();
            const typeSymbol = type.getSymbol();
            if (!typeSymbol) continue;

            // Compare with target symbol
            if (typeSymbol === targetSymbol) {
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

        return undefined;
    }

    /**
     * Check if target component is used in methods
     */
    private checkMethods(
        sourceFile: SourceFile,
        targetSymbol: Symbol
    ): { filePath: string; line: number; } | undefined {
        const sourceClass = sourceFile.getClass(sourceFile.getFilePath().split('/').pop() || '');
        if (!sourceClass) return undefined;

        for (const method of sourceClass.getMethods()) {
            // Check method parameters
            for (const param of method.getParameters()) {
                const type = param.getType();
                const typeSymbol = type.getSymbol();
                if (typeSymbol && typeSymbol === targetSymbol) {
                    return {
                        filePath: sourceFile.getFilePath(),
                        line: param.getStartLineNumber()
                    };
                }

                // Check array/promise type parameters
                const typeArgs = type.getTypeArguments();
                for (const typeArg of typeArgs) {
                    const argSymbol = typeArg.getSymbol();
                    if (argSymbol && argSymbol === targetSymbol) {
                        return {
                            filePath: sourceFile.getFilePath(),
                            line: param.getStartLineNumber()
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
                    line: method.getStartLineNumber()
                };
            }

            // Check array/promise return type parameters
            const returnTypeArgs = returnType.getTypeArguments();
            for (const typeArg of returnTypeArgs) {
                const argSymbol = typeArg.getSymbol();
                if (argSymbol && argSymbol === targetSymbol) {
                    return {
                        filePath: sourceFile.getFilePath(),
                        line: method.getStartLineNumber()
                    };
                }
            }

            // Check method body for calls on target type
            const body = method.getBody();
            if (body) {
                const calls = body.getDescendantsOfKind(SyntaxKind.CallExpression) as CallExpression[];
                for (const call of calls) {
                    const expression = call.getExpression();
                    const expressionType = expression.getType();
                    const expressionSymbol = expressionType.getSymbol();

                    if (expressionSymbol && expressionSymbol === targetSymbol) {
                        return {
                            filePath: sourceFile.getFilePath(),
                            line: call.getStartLineNumber()
                        };
                    }
                }
            }
        }

        return undefined;
    }
} 