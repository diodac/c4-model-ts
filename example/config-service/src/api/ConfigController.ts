import { ConfigService } from '../domain/ConfigService';

/**
 * @c4Component "REST API for configuration management" "TypeScript" "API,Controller"
 * @c4Group "API"
 */
export class ConfigController {
    /**
     * @c4Relation "ConfigService" "Uses for config management" "Internal"
     */
    constructor(private configService: ConfigService) {}
} 