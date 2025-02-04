import { FeaturesService } from '../domain/FeaturesService';

/**
 * REST API for managing feature flags
 * @c4Component
 * - description: REST API for managing feature flags
 * - technology: TypeScript
 * - tags: API, Controller
 * @c4Group "API"
 */
export class FeaturesController {
    /**
     * @c4Relation FeaturesService | Uses for feature management
     * - technology: Internal
     */
    constructor(private featuresService: FeaturesService) {}
} 