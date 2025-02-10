/**
 * Client for the configuration service
 * @c4Component
 * - description: Client for accessing configuration
 * - technology: TypeScript
 * @c4Group Infrastructure
 */
export class ConfigClient {
    /**
     * @c4Relationship config-service.ConfigService | Gets configuration | HTTP
     * - technology: HTTP
     * - tags: DirectRelation
     */
    async getConfig(key: string): Promise<any> {
        // In real code this would make an HTTP call to the config service
        return { enabled: true };
    }
} 