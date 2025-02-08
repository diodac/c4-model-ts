workspace {
    !identifiers hierarchical

    model {
        featureSystem = softwareSystem "Feature Management System" {
            description "System for managing feature flags and configurations"
            
            metrics-service = container "metrics-service" {
                technology "Node.js, TypeScript, Express"
                description "Service for collecting and analyzing system metrics"

                MetricsPublisher = component "MetricsPublisher" {
                    technology "TypeScript, Kafka"
                    description "Publishes metrics data to Kafka for analytics"
                }
                MetricsMapper = component "MetricsMapper" {
                    technology "TypeScript"
                    description "Metrics data transformation helper"
                }

                group "API" {
                    MetricsController = component "MetricsController" {
                        technology "TypeScript"
                        description "REST API for metrics collection"
                    }
                }

                group "Domain" {
                    DataValidator = component "DataValidator" {
                        technology "TypeScript"
                        description "Validates metrics data"
                    }
                    MetricsProcessor = component "MetricsProcessor" {
                        technology "TypeScript"
                        description "Processes metrics data"
                    }
                    MetricsService = component "MetricsService" {
                        technology "TypeScript"
                        description "Core service for metrics processing and analysis"
                    }
                }

                group "Infrastructure" {
                    AlertService = component "AlertService" {
                        technology "TypeScript"
                        description "Service for sending alerts"
                    }
                    ConfigService = component "ConfigService" {
                        technology "TypeScript"
                        description "Configuration service client"
                    }
                    FeaturesClient = component "FeaturesClient" {
                        technology "TypeScript"
                        description "Client for checking feature flags"
                    }
                    Logger = component "Logger" {
                        technology "TypeScript"
                        description "Logger component"
                    }
                    MetricsRepository = component "MetricsRepository" {
                        technology "TypeScript"
                        description "Repository for metrics data"
                    }
                }
            }

            features-service = container "features-service" {
                technology "Node.js, TypeScript, Express"
                description "Service for managing feature flags"

                FeatureMapper = component "FeatureMapper" {
                    technology "TypeScript"
                    description "Helper for transforming feature flags data between different formats"
                }

                group "API" {
                    FeaturesController = component "FeaturesController" {
                        technology "TypeScript"
                        description "REST API for managing feature flags"
                    }
                }

                group "Domain" {
                    FeaturesService = component "FeaturesService" {
                        technology "TypeScript"
                        description "Core service for feature flag management"
                    }
                }

                group "Infrastructure" {
                    ConfigClient = component "ConfigClient" {
                        technology "TypeScript"
                        description "Client for accessing configuration"
                    }
                    FeatureRepository = component "FeatureRepository" {
                        technology "TypeScript, MongoDB"
                        description "Repository for storing feature flags data"
                    }
                }
            }

            config-service = container "config-service" {
                technology "Node.js, TypeScript, Express"
                description "Service for managing system configuration"

                ConfigMapper = component "ConfigMapper" {
                    technology "TypeScript"
                    description "Configuration data transformation helper"
                }

                group "API" {
                    ConfigController = component "ConfigController" {
                        technology "TypeScript"
                        description "REST API for configuration management"
                    }
                }

                group "Domain" {
                    ConfigService = component "ConfigService" {
                        technology "TypeScript"
                        description "Core service for configuration management"
                    }
                }

                group "Infrastructure" {
                    ConfigRepository = component "ConfigRepository" {
                        technology "TypeScript, Redis"
                        description "Stores configuration data"
                    }
                }
            }

            analytics-service = container "analytics-service" {
                technology "Node.js, TypeScript, Kafka"
                description "Service for advanced metrics analysis and reporting"

                AnalyticsController = component "AnalyticsController" {
                    technology "TypeScript, Kafka"
                    description "Processes analytics data from Kafka"
                }

            }
            
            # relationships
            metrics-service -> analytics-service "publishes/subscribes messages via Kafka to" "kafka"
            metrics-service -> config-service "makes HTTP calls to" "HTTP"
            metrics-service -> features-service "makes HTTP calls to" "HTTP"
            features-service -> config-service "makes HTTP calls to" "HTTP"
            features-service -> metrics-service "publishes/subscribes messages via Kafka to" "Kafka"
            config-service -> metrics-service "publishes/subscribes messages via Kafka to" "Kafka"
        }
    }

    views {
        theme default
    }
}