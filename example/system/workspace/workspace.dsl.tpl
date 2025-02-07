workspace {
    model {
        featureSystem = softwareSystem "Feature Management System" {
            description "System for managing feature flags and configurations"
            
            {{ workspace | containers | indent: 12 }}
            
            # relationships between services
            {{ workspace | relationships | indent: 12 }}
        }
    }
}