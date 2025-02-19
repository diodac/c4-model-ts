import { ConfigService } from '../domain/ConfigService';

/**
 * Configuration API Controller
 * 
 * Handles HTTP requests for configuration operations
 * @c4Component
 * @c4Group Application Layer/API
 */
export class ConfigController {
    /**
     * @c4Relationship ConfigService | Uses for config management
     * - technology: Internal
     */
    constructor(private configService: ConfigService) {}
} 