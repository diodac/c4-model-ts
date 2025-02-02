workspace {
	model {
		featureSystem = softwareSystem "Feature Management System" {
			description "System for managing feature flags and configurations"
			
			{{containers containers}}
			
			# relationships between services
			{{relationships containers}}
		}
	}
}