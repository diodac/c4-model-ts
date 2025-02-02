import { C4ModelData } from "../model";

/**
 * Konfiguracja workspace
 */
export interface C4WorkspaceConfig {
    include: {
        [alias: string]: C4IncludeConfig;
    };
}

/**
 * Konfiguracja źródeł danych do włączenia w workspace
 */
export interface C4IncludeConfig {
    type: string;  // currently only "c4containers"
    source: string | string[];  // glob patterns
}

/**
 * Dane zebrane z wszystkich źródeł
 */
export interface C4WorkspaceData {
    containers: Map<string, C4ModelData>;  // key is container config path
}

/**
 * Błędy walidacji workspace
 */
export class C4WorkspaceValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'C4WorkspaceValidationError';
    }
} 