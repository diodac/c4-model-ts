import { C4Container, C4ContainerRelationship } from './model/workspace';

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
 * Analyzes relationships between containers based on their components' relationships
 */
export class ContainerRelationshipsAnalyzer {
    /**
     * Find relationships between containers based on their analysis results
     */
    analyze(containers: C4Container[]): C4ContainerRelationship[] {
        // Use Map to store unique relationships by source-target-technology key
        const relationshipsMap = new Map<string, C4ContainerRelationship>();
        const containersByName = new Map(
            containers.map(c => [c.data.name, c])
        );

        // Look for relationships in each container's components
        for (const container of containers) {
            // Get list of allowed external containers
            const allowedTargets = new Set(
                Object.keys(container.data.external || {})
            );

            for (const component of container.analysis.components) {
                for (const relationship of component.relationships) {
                    // Check if target is another container (either directly or as container.component)
                    const targetParts = relationship.metadata.target.split('.');
                    const targetContainerName = targetParts.length > 1 ? targetParts[0] : relationship.metadata.target;
                    const targetContainer = containersByName.get(targetContainerName);
                    
                    if (targetContainer && targetContainer !== container && allowedTargets.has(targetContainerName)) {
                        // Create unique key for this relationship direction and technology
                        const technology = relationship.metadata.technology || 'unknown';
                        const relationshipKey = `${container.data.name}->${targetContainer.data.name}:${technology}`;

                        if (!relationshipsMap.has(relationshipKey)) {
                            // Get technology-specific description or use default
                            const description = technology !== 'unknown'
                                ? TECHNOLOGY_DESCRIPTIONS[technology.toLowerCase()] || `communicates using ${technology} with`
                                : 'is connected with';

                            relationshipsMap.set(relationshipKey, {
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

        return Array.from(relationshipsMap.values());
    }
} 