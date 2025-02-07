import { C4Container, C4ContainerRelation } from './model/workspace';

const TECHNOLOGY_DESCRIPTIONS: Record<string, string> = {
    'http': 'makes HTTP calls to',
    'https': 'makes HTTPS calls to',
    'rest': 'makes REST calls to',
    'grpc': 'makes gRPC calls to',
    'graphql': 'makes GraphQL queries to',
    'soap': 'makes SOAP calls to',
    'jdbc': 'connects via JDBC to',
    'jpa': 'persists data via JPA in',
    'sql': 'queries SQL database in',
    'websocket': 'connects via WebSocket to',
    'kafka': 'publishes/subscribes messages via Kafka to',
    'rabbitmq': 'exchanges messages via RabbitMQ with',
    'redis': 'caches data in',
    'mongodb': 'stores documents in',
    'elasticsearch': 'indexes/searches data in',
    'aws-sdk': 'uses AWS services from',
    'azure-sdk': 'uses Azure services from',
    'gcp-sdk': 'uses Google Cloud services from',
    'kubernetes': 'deploys to',
    'docker': 'runs in container on'
};

/**
 * Analyzes relations between containers based on their components' relations
 */
export class ContainerRelationsAnalyzer {
    /**
     * Find relations between containers based on their analysis results
     */
    analyze(containers: C4Container[]): C4ContainerRelation[] {
        // Use Map to store unique relations by source-target-technology key
        const relationsMap = new Map<string, C4ContainerRelation>();
        const containersByName = new Map(
            containers.map(c => [c.data.name, c])
        );

        // Look for relations in each container's components
        for (const container of containers) {
            // Get list of allowed external containers
            const allowedTargets = new Set(
                Object.keys(container.data.external || {})
            );

            for (const component of container.analysis.components) {
                for (const relation of component.relations) {
                    // Check if target is another container (either directly or as container.component)
                    const targetParts = relation.metadata.target.split('.');
                    const targetContainerName = targetParts.length > 1 ? targetParts[0] : relation.metadata.target;
                    const targetContainer = containersByName.get(targetContainerName);
                    
                    if (targetContainer && targetContainer !== container && allowedTargets.has(targetContainerName)) {
                        // Create unique key for this relation direction and technology
                        const technology = relation.metadata.technology || 'unknown';
                        const relationKey = `${container.data.name}->${targetContainer.data.name}:${technology}`;

                        if (!relationsMap.has(relationKey)) {
                            // Get technology-specific description or use default
                            const description = technology !== 'unknown'
                                ? TECHNOLOGY_DESCRIPTIONS[technology.toLowerCase()] || `communicates using ${technology} with`
                                : 'is connected with';

                            relationsMap.set(relationKey, {
                                source: container.data.name,
                                target: targetContainer.data.name,
                                description,
                                technology: technology !== 'unknown' ? technology : undefined
                            });
                        }
                    }
                }
            }
        }

        return Array.from(relationsMap.values());
    }
} 