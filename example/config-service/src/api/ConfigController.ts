import { ConfigService } from '../domain/ConfigService';

/**
 * REST API for configuration management
 * @c4Component
 * - description: REST API for configuration management
 * - technology: TypeScript
 * - tags: API, Controller
 * @c4Group "API"
 */
export class ConfigController {
    /**
     * @c4Relation ConfigService | Uses for config management
     * - technology: Internal
     */
    constructor(private configService: ConfigService) {}
} 