import { MetricsService } from '../domain/MetricsService';

/**
 * REST API for metrics collection
 * @c4Component
 * - technology: TypeScript
 * - tags: API, Controller
 * @c4Group Application Layer/API
 */
export class MetricsController {
    /**
     * @c4Relationship MetricsService | Uses for metrics processing
     * - technology: TypeScript
     */
    constructor(private metricsService: MetricsService) {}

    async collectMetrics(data: any): Promise<void> {
        await this.metricsService.processMetrics(data);
    }
} 