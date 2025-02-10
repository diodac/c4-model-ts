/**
 * Metadata about a relationship between components
 */
export interface RelationshipMetadata {
    /** Target component name */
    target: string;
    /** Relationship description */
    description: string;
    /** Technology used for the relationship */
    technology?: string;
    /** Relationship tags */
    tags?: string[];
    /** URL with documentation */
    url?: string;
    /** Custom properties */
    properties?: Record<string, string>;
}

/**
 * Information about a relationship found in the code
 */
export interface RelationshipInfo {
    /** Relationship metadata */
    metadata: RelationshipMetadata;
    /** Source component name */
    sourceComponent: string;
    /** Location in code */
    location: {
        /** File path */
        filePath: string;
        /** Class name */
        className: string;
        /** Method name (if relationship is on method) */
        methodName?: string;
        /** Line number in file */
        line: number;
    };
} 