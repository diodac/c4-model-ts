import { ContainerData } from '../../container/model/container';
import { AnalysisResult } from '../../container/container-analyzer';

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
 * Configuration for a system's containers
 */
export interface C4SystemContainersConfig {
    /** 
     * Glob patterns for finding container source files
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
    containers: C4SystemContainersConfig;
}

/**
 * Workspace configuration from c4workspace.json
 */
export interface C4WorkspaceConfig {
    /** 
     * Map of systems in the workspace
     * Key is the system identifier
     */
    systems: {
        [systemId: string]: C4SystemConfig;
    };

    /** 
     * Directory for workspace files (templates, output)
     * Relative to basePath or absolute
     */
    workspaceDir?: string;

    /**
     * Base path for resolving relative paths
     * If not provided, defaults to the directory containing c4workspace.json
     */
    basePath?: string;
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
 * Represents a relation between containers
 */
export interface C4ContainerRelation {
    /** Source container name */
    source: string;

    /** Target container name */
    target: string;

    /** Relation description */
    description: string;

    /** Technology used for communication */
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

    /** Relations between containers in this system */
    relations: C4ContainerRelation[];
}

/**
 * Represents the entire workspace model
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