workspace {
    !identifiers hierarchical

    model {
        featureSystem = softwareSystem "Feature Management System" {
            description "System for managing feature flags and configurations"
            
            metrics-service = container "metrics-service" {
                technology "Node.js, TypeScript, Express"
                description "Service for collecting and analyzing system metrics"
            }

            features-service = container "features-service" {
                technology "Node.js, TypeScript, Express"
                description "Service for managing feature flags"
            }

            config-service = container "config-service" {
                technology "Node.js, TypeScript, Express"
                description "Service for managing system configuration"
            }

            analytics-service = container "analytics-service" {
                technology "Node.js, TypeScript, Kafka"
                description "Service for advanced metrics analysis and reporting"
            }
            
            # relationships
            metrics-service -> analytics-service "publishes/subscribes messages via Kafka to" "kafka"
            metrics-service -> config-service "makes HTTP calls to" "HTTP"
            metrics-service -> features-service "makes HTTP calls to" "HTTP"
            features-service -> config-service "makes HTTP calls to" "HTTP"
            features-service -> metrics-service "publishes/subscribes messages via Kafka to" "Kafka"
            config-service -> metrics-service "publishes/subscribes messages via Kafka to" "Kafka"

            metrics-service.MetricsPublisher -> analytics-service "publishes metrics data to" "kafka"
            metrics-service.MetricsController -> metrics-service.MetricsService "Uses for metrics processing" "TypeScript"
            metrics-service.MetricsService -> metrics-service.MetricsRepository "Stores metrics data" "Internal"
            metrics-service.MetricsService -> config-service.ConfigService "Gets metrics configuration" "HTTP"
            metrics-service.MetricsService -> features-service.FeaturesService "Checks if metrics collection is enabled" "HTTP"
            metrics-service.MetricsService -> metrics-service.MetricsProcessor "Processes metrics data" "Internal"
            metrics-service.MetricsService -> metrics-service.DataValidator "Validates metrics data" "Internal"
            metrics-service.FeaturesClient -> features-service.FeaturesService "Checks feature flags" "HTTP"

            features-service.FeaturesController -> features-service.FeaturesService "Uses for feature management" "Internal"
            features-service.FeaturesService -> features-service.FeatureRepository "Stores feature flags" "MongoDB"
            features-service.FeaturesService -> config-service.ConfigService "Stores feature flags configuration" "HTTP"
            features-service.FeaturesService -> metrics-service "Sends usage metrics" "Kafka"
            features-service.ConfigClient -> config-service.ConfigService "Gets configuration" "HTTP"

            config-service.ConfigController -> config-service.ConfigService "Uses for config management" "Internal"
            config-service.ConfigService -> config-service.ConfigRepository "Stores configuration" "Internal"
            config-service.ConfigService -> metrics-service "Sends config access metrics" "Kafka"
        }
    }

    views {

    }
}