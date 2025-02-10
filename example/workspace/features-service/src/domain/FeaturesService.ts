import { FeatureRepository } from '../infrastructure/FeatureRepository';
import { ConfigClient } from '../infrastructure/ConfigClient';

/**
 * Core service for feature flags management
 * @c4Component
 * - description: Core service for feature flag management
 * - technology: TypeScript
 * - tags: Domain, Core
 * @c4Group Domain
 */
export class FeaturesService {
    private configClient: ConfigClient;

    /**
     * @c4Relationship FeatureRepository | Stores feature flags | Database
     * - technology: MongoDB
     * - tags: DirectRelation
     */
    constructor(
        private repository: FeatureRepository
    ) {
        this.configClient = new ConfigClient();
    }

    /**
     * @c4Relationship config-service.ConfigService | Stores feature flags configuration | HTTP
     * - technology: HTTP
     * - tags: DirectRelation
     */
    async getFeatureConfig(name: string): Promise<any> {
        return await this.configClient.getConfig(`features.${name}`);
    }

    async isEnabled(name: string): Promise<boolean> {
        const config = await this.getFeatureConfig(name);
        const feature = await this.repository.findByName(name);
        return feature?.enabled && config?.enabled;
    }

    /**
     * @c4Relationship metrics-service | Sends usage metrics
     * - technology: Kafka
     */
    async trackFeatureUsage(featureId: string): Promise<void> {
        // Implementation
    }
} 