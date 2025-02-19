import { MethodUsage } from '../container/relationship-finder';

/**
 * Simplifies component information in undeclared relationships by keeping only essential data
 */
export function simplifyUndeclaredRelationships<T extends { undeclaredRelationships?: MethodUsage[] }>(result: T): T {
    if (!result.undeclaredRelationships) {
        return result;
    }

    return {
        ...result,
        undeclaredRelationships: result.undeclaredRelationships.map(relationship => ({
            method: {
                name: relationship.method.name,
                component: {
                    name: relationship.method.component.metadata.name,
                    location: {
                        filePath: relationship.method.component.location.filePath,
                        line: relationship.method.component.location.line
                    }
                }
            },
            calledFrom: {
                component: {
                    name: relationship.calledFrom.component.metadata.name,
                    location: {
                        filePath: relationship.calledFrom.component.location.filePath,
                        line: relationship.calledFrom.component.location.line
                    }
                },
                method: relationship.calledFrom.method,
                filePath: relationship.calledFrom.filePath,
                line: relationship.calledFrom.line
            },
            callChain: relationship.callChain,
            summary: relationship.summary
        }))
    };
} 