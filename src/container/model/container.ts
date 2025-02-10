import { RelationshipMetadata } from './relationship';

/**
 * Recursive group structure
 */
export interface Groups {
    [key: string]: Groups | Record<string, never>;
}

/**
 * External element configuration
 */
export interface ExternalElement {
    /** Element name */
    name: string;
    
    /** Element description */
    description: string;
    
    /** Technology stack */
    technology?: string;
    
    /** Element tags */
    tags?: string[];

    /** Element type (container, system, etc.) */
    type?: string;
}

/**
 * Container configuration from c4container.json
 */
export interface ContainerConfig {
    /** Container name */
    name: string;
    
    /** Container description */
    description?: string;
    
    /** Technology stack */
    technology?: string;
    
    /** Container tags */
    tags?: string[];
    
    /** Source file patterns */
    source: string[];
    
    /** Container properties */
    properties?: Record<string, string>;

    /** Component groups */
    groups?: Groups;
    
    /** External components */
    external?: Record<string, ExternalElement>;

    /** Container-level relationships */
    relationships?: ContainerRelationship[];
}

/**
 * Container data collected from source files
 */
export interface ContainerData {
    /** Container name */
    name: string;
    
    /** Container description */
    description: string;
    
    /** Container technology stack */
    technology?: string;
    
    /** Container tags */
    tags?: string[];
    
    /** Source file path */
    sourcePath: string;

    /** External dependencies */
    external?: Record<string, ExternalElement>;

    /** Container-level relationships */
    relationships?: ContainerRelationship[];
}

/**
 * Container-level relationship configuration
 */
export interface ContainerRelationship extends RelationshipMetadata {
    /** Target container or system name */
    target: string;
}

/**
 * Error thrown when container configuration is invalid
 */
export class ContainerValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ContainerValidationError';
    }
} 