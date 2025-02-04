import { MetricsService } from '../domain/MetricsService';

/**
 * REST API for metrics collection
 * @c4Component
 * - technology: TypeScript
 * - tags: API, Controller
 * @c4Group "API"
 */
export class MetricsController {
    /**
     * @c4Relation MetricsService | Uses for metrics processing
     * - technology: Internal
     */
    constructor(private metricsService: MetricsService) {}
} 