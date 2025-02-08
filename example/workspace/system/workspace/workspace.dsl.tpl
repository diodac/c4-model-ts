workspace {
    !identifiers hierarchical

    model {
        featureSystem = softwareSystem "Feature Management System" {
            description "System for managing feature flags and configurations"
            
            {{ workspace.systems.RR | containers | indent: 12 }}
            
            # relationships
            {{ workspace.systems.RR | relationships | indent: 12 }}
        }
    }

    views {
        theme default
    }
}