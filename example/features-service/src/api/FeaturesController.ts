import { FeaturesService } from '../domain/FeaturesService';

/**
 * @c4Component "" "TypeScript" "API,Controller"
 *   description "REST API for managing feature flags"
 *   group "API"
 */
export class FeaturesController {
    /**
     * @c4Relation "FeaturesService" "Uses for feature management" "Internal"
     */
    constructor(private featuresService: FeaturesService) {}
} 