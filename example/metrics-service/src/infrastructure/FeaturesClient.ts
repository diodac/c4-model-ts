/**
 * Client for the features service
 * @c4Component
 * - description: Client for checking feature flags
 * - technology: TypeScript
 * @c4Group Infrastructure
 */
export class FeaturesClient {
    /**
     * @c4Relation features-service.FeaturesService | Checks feature flags | HTTP
     * - technology: HTTP
     * - tags: DirectRelation
     */
    async isFeatureEnabled(name: string): Promise<boolean> {
        // In real code this would make an HTTP call to the features service
        return true;
    }
} 