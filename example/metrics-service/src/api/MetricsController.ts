import { MetricsService } from '../domain/MetricsService';

/**
 * @c4Component "REST API for metrics collection" "TypeScript" "API,Controller"
 * @c4Group "API"
 */
export class MetricsController {
    /**
     * @c4Relation "MetricsService" "Uses for metrics processing" "Internal"
     */
    constructor(private metricsService: MetricsService) {}
} 