import { MethodUsage } from '../container/relation-finder';

/**
 * Simplifies component information in undeclared relations by keeping only essential data
 */
export function simplifyUndeclaredRelations<T extends { undeclaredRelations?: MethodUsage[] }>(result: T): T {
    if (!result.undeclaredRelations) {
        return result;
    }

    return {
        ...result,
        undeclaredRelations: result.undeclaredRelations.map(relation => ({
            method: {
                name: relation.method.name,
                component: {
                    name: relation.method.component.metadata.name,
                    location: {
                        filePath: relation.method.component.location.filePath,
                        line: relation.method.component.location.line
                    }
                }
            },
            calledFrom: {
                component: {
                    name: relation.calledFrom.component.metadata.name,
                    location: {
                        filePath: relation.calledFrom.component.location.filePath,
                        line: relation.calledFrom.component.location.line
                    }
                },
                method: relation.calledFrom.method,
                filePath: relation.calledFrom.filePath,
                line: relation.calledFrom.line
            },
            callChain: relation.callChain
        }))
    };
} 