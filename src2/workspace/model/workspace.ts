import { ContainerData } from '../../container/model/container';

/**
 * Configuration for including external sources in workspace
 */
export interface C4IncludeConfig {
    /** Type of source to include (currently only 'c4container.json' is supported) */
    type: 'c4container.json';
    
    /** 
     * Glob patterns for finding source files
     * Can be a single pattern or array of patterns
     * Patterns starting with ! are exclusions
     */
    source: string | string[];
}

/**
 * Workspace configuration from c4workspace.json
 */
export interface C4WorkspaceConfig {
    /** 
     * Map of sources to include in workspace
     * Key is an alias for the source
     */
    include: {
        [alias: string]: C4IncludeConfig;
    };
}

/**
 * Source data loaded from a single include configuration
 */
export interface C4SourceData {
    /** Alias of the source from workspace config */
    alias: string;
    
    /** Type of the source */
    type: 'c4container.json';
    
    /** Path to the source file */
    path: string;
    
    /** Loaded container data */
    data: ContainerData;
}

/**
 * Data collected from all sources in workspace
 */
export interface C4WorkspaceData {
    /** List of loaded sources */
    sources: C4SourceData[];
}

/**
 * Result of workspace data loading
 */
export interface C4WorkspaceLoadResult {
    /** Loaded workspace data */
    data: C4WorkspaceData;
    
    /** Validation warnings */
    warnings: string[];
    
    /** Files that failed to load */
    failures: {
        path: string;
        error: string;
    }[];
}

/**
 * Error thrown when workspace configuration is invalid
 */
export class C4WorkspaceValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'C4WorkspaceValidationError';
    }
} 