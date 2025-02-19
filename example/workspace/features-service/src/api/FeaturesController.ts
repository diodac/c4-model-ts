import { FeaturesService } from '../domain/FeaturesService';

/**
 * REST API for feature flags management
 * @c4Component
 * - description: REST API for managing feature flags
 * - technology: TypeScript
 * - tags: API, Controller
 * @c4Group Application Layer/API
 */
export class FeaturesController {
    /**
     * @c4Relationship FeaturesService | Uses for feature management
     * - technology: Internal
     */
    constructor(private featuresService: FeaturesService) {}
} 