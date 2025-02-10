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
                        description "Processes and analyzes metrics data"
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
                    DataValidator = component "DataValidator" {
                        technology "TypeScript"
                        description "Validates metrics data format and content"
                    }
                    FeaturesClient = component "FeaturesClient" {
                        technology "TypeScript, HTTP"
                        description "Client for checking feature flags from features service"
                    }
                    Logger = component "Logger" {
                        technology "TypeScript"
                        description "Logger component"
                    }
                    MetricsProcessor = component "MetricsProcessor" {
                        technology "TypeScript"
                        description "Processes and transforms metrics data"
                    }
                    MetricsPublisher = component "MetricsPublisher" {
                        technology "TypeScript, Kafka"
                        description "Publishes metrics data to Kafka for analytics"
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
                        description "Manages feature flags and their states"
                    }
                }

                group "Infrastructure" {
                    ConfigClient = component "ConfigClient" {
                        technology "TypeScript, HTTP"
                        description "Client for accessing configuration service"
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
            # Container relationships
            metrics-service -> analytics-service "Sends metrics data to" "Kafka" {
                tags "metrics,streaming"
            }
            metrics-service -> config-service "Gets configuration from" "HTTP/REST" {
                tags "config"
            }
            metrics-service -> features-service "Checks feature flags using" "HTTP/REST" {
                tags "features"
            }
            config-service -> metrics-service "Sends telemetry data to" "HTTP/REST" {
                tags "metrics,telemetry"
            }
            config-service -> analytics-system "Provides configuration data to" "HTTP/REST" {
                tags "analytics,config"
            }

            # Component relationships
            metrics-service.MetricsPublisher -> analytics-service "publishes metrics data to" "kafka"
            metrics-service.MetricsController -> metrics-service.MetricsService "Uses for metrics processing" "TypeScript"
            metrics-service.MetricsService -> metrics-service.AlertService "Sends alerts on metrics thresholds" "Internal" {
                tags "DirectRelationship"
            }
            metrics-service.MetricsService -> metrics-service.ConfigService "Gets metrics configuration" "HTTP/REST" {
                tags "IndirectRelationship"
            }
            metrics-service.MetricsService -> metrics-service.MetricsProcessor "Processes metrics data" "Internal" {
                tags "DirectRelationship"
            }
            metrics-service.MetricsService -> metrics-service.MetricsRepository "Stores metrics data" "Internal" {
                tags "DirectRelationship"
            }
            metrics-service.MetricsService -> metrics-service.MetricsPublisher "Publishes metrics data" "Internal" {
                tags "DirectRelationship"
            }
            metrics-service.MetricsService -> metrics-service.Logger "Logs metrics operations" "Internal" {
                tags "DirectRelationship"
            }
            metrics-service.MetricsService -> metrics-service.DataValidator "Validates metrics data" "Internal" {
                tags "DirectRelationship"
            }
            metrics-service.MetricsService -> features-service.FeaturesService "Checks if metrics collection is enabled" "HTTP" {
                tags "DirectRelation"
            }
            metrics-service.FeaturesClient -> features-service.FeaturesService "Checks feature flags" "HTTP/REST" {
                tags "DirectRelationship"
            }
            metrics-service.FeaturesClient -> features-service.FeaturesService "Checks feature flags" "HTTP" {
                tags "DirectRelation"
            }
            features-service.FeaturesController -> features-service.FeaturesService "Uses for feature management" "Internal"
            features-service.FeaturesService -> features-service.FeatureRepository "Stores feature flags" "MongoDB" {
                tags "DirectRelation"
            }
            features-service.FeaturesService -> features-service.ConfigClient "Gets feature configuration" "HTTP/REST" {
                tags "DirectRelationship"
            }
            features-service.FeaturesService -> metrics-service "Sends usage metrics" "Kafka"
            features-service.FeaturesService -> features-service.ConfigClient "Updates feature configuration" "HTTP/REST" {
                tags "DirectRelationship"
            }
            features-service.ConfigClient -> config-service.ConfigService "Gets configuration" "HTTP/REST" {
                tags "DirectRelationship"
            }
            features-service.ConfigClient -> config-service.ConfigService "Gets configuration" "HTTP" {
                tags "DirectRelation"
            }
            config-service.ConfigController -> config-service.ConfigService "Uses for config management" "Internal"
            config-service.ConfigService -> config-service.ConfigRepository "Stores configuration" "Internal"
            config-service.ConfigService -> metrics-service "Sends config access metrics" "Kafka"
        }
    }

    views {
        theme default
    }
}