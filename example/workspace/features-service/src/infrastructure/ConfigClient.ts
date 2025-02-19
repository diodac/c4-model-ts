/**
 * Client for configuration service
 * @c4Component
 * - description: Client for accessing configuration service
 * - technology: TypeScript, HTTP
 * - tags: Infrastructure
 * @c4Group Technical Infrastructure/Integration
 * 
 * @c4Relationship config-service.ConfigService | Gets configuration | HTTP/REST
 * - technology: HTTP/REST
 * - tags: DirectRelationship
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

    async setConfig(key: string, value: any): Promise<void> {
        // Implementation
    }
} 