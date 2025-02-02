workspace {
	model {
		enterprise "Platform" {
			featureSystem = softwareSystem "Feature Management System" {
				description "System for managing feature flags and configurations"
				
				featuresService = container "Features Service" {
					description "Service for managing feature flags"
					technology "Node.js, TypeScript, Express"
					tags "backend" "features"
				}
				
				configService = container "Config Service" {
					description "Service for managing system configuration"
					technology "Node.js, TypeScript, Express"
					tags "backend" "configuration"
				}
				
				metricsService = container "Metrics Service" {
					description "Service for collecting and analyzing system metrics"
					technology "Node.js, TypeScript, Express"
					tags "backend" "monitoring"
				}
				
				# relationships between services
				featuresService -> configService "Gets configuration" "HTTP"
				featuresService -> metricsService "Sends usage metrics" "Kafka"
				configService -> metricsService "Sends config access metrics" "Kafka"
				metricsService -> configService "Gets metrics configuration" "HTTP"
			}
		}
	}
}