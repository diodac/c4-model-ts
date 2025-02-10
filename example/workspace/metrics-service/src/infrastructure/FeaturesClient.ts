/**
 * Client for checking feature flags
 * @c4Component
 * - description: Client for checking feature flags from features service
 * - technology: TypeScript, HTTP
 * - tags: Infrastructure
 * @c4Group Infrastructure
 * 
 * @c4Relationship features-service.FeaturesService | Checks feature flags | HTTP/REST
 * - technology: HTTP/REST
 * - tags: DirectRelationship
 */
export class FeaturesClient {
    /**
     * @c4Relationship features-service.FeaturesService | Checks feature flags | HTTP
     * - technology: HTTP
     * - tags: DirectRelation
     */
    async isFeatureEnabled(featureName: string): Promise<boolean> {
        // In real code this would make an HTTP call to the features service
        return true;
    }
} 