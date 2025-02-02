workspace {
    model {
        featureSystem = softwareSystem "Feature Management System" {
            description "System for managing feature flags and configurations"
            
            {{ containers | containers | indent: 12 }}
            
            # relationships between services
            {{ containers | relationships | indent: 12 }}
        }
    }
}