import { MetricsRepository } from '../infrastructure/MetricsRepository';
import { ConfigService } from '../infrastructure/ConfigService';
import { Logger } from '../infrastructure/Logger';
import { MetricsProcessor } from './MetricsProcessor';
import { DataValidator } from './DataValidator';
import { AlertService } from '../infrastructure/AlertService';

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

    /**
     * @c4Relation MetricsRepository | Stores metrics data | Database
     * - technology: Internal
     * - tags: DirectRelation
     */
    constructor(
        private repository: MetricsRepository,
        /**
         * @c4Relation Logger | Logs service operations | Logging
         * - technology: Internal
         * - tags: IndirectRelation
         */
        private logger: Logger,
        private configService: ConfigService
    ) {
        this.processor = new MetricsProcessor();
        this.validator = new DataValidator();
        this.alertService = new AlertService();
    }

    /**
     * @c4Relation ConfigService | Gets metrics configuration | HTTP
     * - technology: HTTP
     * - tags: DirectRelation
     */
    async getMetricsConfig(): Promise<any> {
        const config = await this.configService.getConfig();
        return config;
    }

    /**
     * @c4Relation MetricsProcessor | Processes metrics data | Internal
     * - technology: Internal
     * - tags: DirectRelation
     */
    async processMetrics(data: any): Promise<void> {
        this.logger.log('Processing metrics');
        if (this.validator.validate(data)) {
            const processor = new MetricsProcessor();
            await processor.process(data);
            await this.repository.save(data);
            await this.alertService.notify('Metrics processed');
        }
    }

    /**
     * @c4Relation DataValidator | Validates metrics data | Internal
     * - technology: Internal
     * - tags: DirectRelation
     */
    private validateData(data: any): boolean {
        return this.validator.validate(data);
    }
} 