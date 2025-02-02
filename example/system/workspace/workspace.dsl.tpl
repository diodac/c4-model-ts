workspace {
	model {
		featureSystem = softwareSystem "Feature Management System" {
			description "System for managing feature flags and configurations"
			
			{{ include.containers|containers }}
			
			# relationships between services
			{{ include.containers|relationships }}
		}
	}
}