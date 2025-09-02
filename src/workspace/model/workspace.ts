import { ContainerData } from '../../container/model/container';
import { ComponentInfo } from '../../container/model/component';

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
 * Configuration for a software system
 */
export interface C4SystemConfig {
    /** System name */
    name?: string;

    /** System description */
    description?: string;

    /** Container configuration */
    containers: {
        /** 
         * Glob patterns for finding container source files
         * Can be a single pattern or array of patterns
         * Patterns starting with ! are exclusions
         */
        source: string | string[];
    };
}

/**
 * Workspace configuration from c4workspace.json
 */
export interface C4WorkspaceConfig {
    /** Workspace name */
    name: string;
    
    /** Workspace description */
    description?: string;
    
    /** Systems in the workspace */
    systems: Record<string, C4SystemConfig>;
    
    /** External systems */
    external?: Record<string, ExternalSystem>;
    
    /** Workspace properties */
    properties?: Record<string, string>;
    
    /** Workspace tags */
    tags?: string[];
    
    /** Workspace directory (relative to config file) */
    workspaceDir?: string;
    
    /** Base path for resolving relative paths */
    basePath?: string;
}

/**
 * Container analysis results
 */
export interface AnalysisResult {
    /** Components found in container */
    components: ComponentInfo[];
    /** Undeclared relationships found in code analysis */
    uniqueUndeclaredRelationships?: Array<{
        from: string;
        to: string;
        type: string;
        occurrences: number;
    }>;
}

/**
 * Represents a container in the workspace
 */
export interface C4Container {
    /** Container data */
    data: ContainerData;

    /** Analysis results */
    analysis: AnalysisResult;
}

/**
 * Represents a relationship between containers
 */
export interface C4ContainerRelationship {
    /** Source container name */
    source: string;

    /** Target container name */
    target: string;

    /** Description of the relationship */
    description: string;

    /** Technology used for the relationship */
    technology?: string;
}

/**
 * Represents a software system in the workspace
 */
export interface C4System {
    /** System identifier */
    id: string;

    /** System name */
    name: string;

    /** System description */
    description: string;

    /** Containers in the system */
    containers: C4Container[];

    /** Relationships between containers in this system */
    relationships: C4ContainerRelationship[];
}

/**
 * Workspace model after analysis
 */
export interface C4WorkspaceModel {
    /** Systems in the workspace */
    systems: C4System[];
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
    /** Loaded workspace model */
    model: C4WorkspaceModel;
    
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

/**
 * External system configuration
 */
export interface ExternalSystem {
    /** System name */
    name: string;
    
    /** System description */
    description: string;
    
    /** System containers */
    containers?: Record<string, ContainerData>;
} 