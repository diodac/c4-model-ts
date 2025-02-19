import { AlertService } from '../infrastructure/AlertService';
import { DataValidator } from '../infrastructure/DataValidator';
import { MetricsProcessor } from '../infrastructure/MetricsProcessor';
import { MetricsRepository } from '../infrastructure/MetricsRepository';
import { MetricsPublisher } from '../infrastructure/MetricsPublisher';
import { Logger } from '../infrastructure/Logger';
import { ConfigService } from '../infrastructure/ConfigService';

/**
 * Core metrics service
 * 
 * Handles metrics processing and validation
 * 
 * @c4Component
 * @c4Group Core/Domain/Metrics
 */
export class MetricsService {
    /**
     * @c4Relationship AlertService | Sends alerts on metrics thresholds | Internal
     * - technology: Internal
     * - tags: DirectRelationship
     */
    constructor(
        private alertService: AlertService,
        private validator: DataValidator,
        private processor: MetricsProcessor,
        private repository: MetricsRepository,
        private publisher: MetricsPublisher,
        private logger: Logger,
        private configService: ConfigService
    ) {}

    /**
     * @c4Relationship ConfigService | Gets metrics configuration | HTTP/REST
     * - technology: HTTP/REST
     * - tags: IndirectRelationship
     */
    async getConfig(): Promise<any> {
        const config = await this.configService.getConfig();
        return config;
    }

    /**
     * @c4Relationship MetricsProcessor | Processes metrics data | Internal
     * - technology: Internal
     * - tags: DirectRelationship
     */
    async processMetrics(data: any): Promise<void> {
        this.logger.log('Processing metrics');
        
        // Check if metrics collection is enabled
        if (!await this.isMetricsEnabled(data.type)) {
            this.logger.log('Metrics collection disabled');
            return;
        }

        if (this.validator.validate(data)) {
            const processor = new MetricsProcessor();
            await processor.process(data);
            await this.repository.save(data);
            await this.alertService.notify('Metrics processed');
        }
    }

    /**
     * @c4Relationship MetricsRepository | Stores metrics data | Internal
     * - technology: Internal
     * - tags: DirectRelationship
     */
    async storeMetrics(data: any): Promise<void> {
        // Implementation
    }

    /**
     * @c4Relationship MetricsPublisher | Publishes metrics data | Internal
     * - technology: Internal
     * - tags: DirectRelationship
     */
    async publishMetrics(data: any): Promise<void> {
        // Implementation
    }

    /**
     * @c4Relationship Logger | Logs metrics operations | Internal
     * - technology: Internal
     * - tags: DirectRelationship
     */
    private logOperation(operation: string): void {
        // Implementation
    }

    /**
     * @c4Relationship DataValidator | Validates metrics data | Internal
     * - technology: Internal
     * - tags: DirectRelationship
     */
    private validateData(data: any): boolean {
        return this.validator.validate(data);
    }

    /**
     * @c4Relationship features-service.FeaturesService | Checks if metrics collection is enabled | HTTP
     * - technology: HTTP
     * - tags: DirectRelation
     */
    private async isMetricsEnabled(type: string): Promise<boolean> {
        return await this.featuresClient.isFeatureEnabled(`metrics.${type}`);
    }
} 