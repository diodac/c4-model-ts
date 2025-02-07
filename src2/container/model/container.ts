/**
 * Container configuration from c4container.json
 */
export interface ContainerConfig {
    /** Container name */
    name: string;
    
    /** Container description */
    description: string;
    
    /** Technology stack */
    technology?: string;
    
    /** Container tags */
    tags?: string[];
    
    /** Source file patterns */
    source: string[];
    
    /** Container properties */
    properties?: Record<string, string>;
    
    /** External components */
    external?: Record<string, ExternalElement>;
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