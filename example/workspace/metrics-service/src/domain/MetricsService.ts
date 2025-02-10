import { MetricsRepository } from '../infrastructure/MetricsRepository';
import { ConfigService } from '../infrastructure/ConfigService';
import { Logger } from '../infrastructure/Logger';
import { MetricsProcessor } from './MetricsProcessor';
import { DataValidator } from './DataValidator';
import { AlertService } from '../infrastructure/AlertService';
import { FeaturesClient } from '../infrastructure/FeaturesClient';

/**
 * Core service for metrics processing and analysis
 * @c4Component
 * - description: Core service for metrics processing and analysis
 * - technology: TypeScript
 * - tags: Domain, Core
 * @c4Group Domain
 */
export class MetricsService {
    private processor: MetricsProcessor;
    private validator: DataValidator;
    private alertService: AlertService;
    private featuresClient: FeaturesClient;

    /**
     * @c4Relationship MetricsRepository | Stores metrics data | Database
     * - technology: Internal
     * - tags: DirectRelation
     */
    constructor(
        private repository: MetricsRepository,
        /**
         * @c4Relationship Logger | Logs service operations | Logging
         * - technology: Internal
         * - tags: IndirectRelation
         */
        private logger: Logger,
        /**
         * @c4Relationship config-service.ConfigService | Gets configuration from config service | HTTP
         * - technology: HTTP
         * - tags: DirectRelation
         */
        private configService: ConfigService
    ) {
        this.processor = new MetricsProcessor();
        this.validator = new DataValidator();
        this.alertService = new AlertService();
        this.featuresClient = new FeaturesClient();
    }

    /**
     * @c4Relationship config-service.ConfigService | Gets metrics configuration | HTTP
     * - technology: HTTP
     * - tags: DirectRelation
     */
    async getMetricsConfig(): Promise<any> {
        const config = await this.configService.getConfig();
        return config;
    }

    /**
     * @c4Relationship features-service.FeaturesService | Checks if metrics collection is enabled | HTTP
     * - technology: HTTP
     * - tags: DirectRelation
     */
    private async isMetricsEnabled(type: string): Promise<boolean> {
        return await this.featuresClient.isFeatureEnabled(`metrics.${type}`);
    }

    /**
     * @c4Relationship MetricsProcessor | Processes metrics data | Internal
     * - technology: Internal
     * - tags: DirectRelation
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
     * @c4Relationship DataValidator | Validates metrics data | Internal
     * - technology: Internal
     * - tags: DirectRelation
     */
    private validateData(data: any): boolean {
        return this.validator.validate(data);
    }
} 