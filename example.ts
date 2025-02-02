/**
 * @c4Group "Core Services"
 * @c4Component "Manages feature flags and configurations" "TypeScript, NestJS" "Core,Backend"
 *   description "Service responsible for managing feature flags and their configurations"
 *   tags "Features,Configuration"
 *   url "https://features-docs.example.com"
 *   properties {
 *     criticality high
 *     maintainer "platform-team"
 *     status active
 *   }
 *   perspectives {
 *     reliability "High availability required" "critical"
 *     performance "Must respond within 50ms" "P1"
 *     scalability "Handles high request volume"
 *   }
 *   !docs "./docs/features-service"
 *   !adrs "./docs/decisions"
 */
export class FeaturesInstancesService {
    /**
     * @c4Relation "ConfigInstancesService" "Fetches configuration data" "HTTP" "Core"
     */
    constructor(private configService: ConfigInstancesService) {}

    /**
     * @c4Relation "MetricsService" "Sends feature usage metrics" "Kafka" "Monitoring"
     */
    async sendMetrics(): Promise<void> {
        // implementation
    }
}

/**
 * @c4Group "Core Services"
 * @c4Component "Manages configuration instances" "TypeScript, NestJS" "Core,Backend"
 *   description "Service responsible for configuration management and distribution"
 *   perspectives {
 *     reliability "Must ensure configuration consistency"
 *     security "Handles sensitive configuration data" "high"
 *   }
 */
export class ConfigInstancesService {
    // implementation
}

/**
 * @c4Group "Monitoring"
 * @c4Component "Handles system metrics" "TypeScript, NestJS" "Monitoring"
 *   description "Collects and processes system metrics"
 *   perspectives {
 *     reliability "Must not lose metrics data" "critical"
 *     performance "Efficient metric processing" "P2"
 *   }
 */
export class MetricsService {
    // implementation
} 