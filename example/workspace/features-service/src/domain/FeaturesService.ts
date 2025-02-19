import { FeatureRepository } from '../infrastructure/FeatureRepository';
import { ConfigClient } from '../infrastructure/ConfigClient';

/**
 * Core service for feature flag management
 * @c4Component
 * - description: Manages feature flags and their states
 * - technology: TypeScript
 * - tags: Domain
 * @c4Group Core/Domain/Features
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
     * @c4Relationship ConfigClient | Gets feature configuration | HTTP/REST
     * - technology: HTTP/REST
     * - tags: DirectRelationship
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

    /**
     * @c4Relationship ConfigClient | Updates feature configuration | HTTP/REST
     * - technology: HTTP/REST
     * - tags: DirectRelationship
     */
    async updateFeature(name: string, enabled: boolean): Promise<void> {
        // Implementation
    }
} 