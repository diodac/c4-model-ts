/**
 * Metadata about a relation between components
 */
export interface RelationMetadata {
    /** Target component name */
    target: string;
    /** Relation description */
    description: string;
    /** Technology used for the relation */
    technology?: string;
    /** Relation tags */
    tags?: string[];
    /** URL with documentation */
    url?: string;
    /** Custom properties */
    properties?: Record<string, string>;
}

/**
 * Information about a relation found in the code
 */
export interface RelationInfo {
    /** Relation metadata */
    metadata: RelationMetadata;
    /** Source component name */
    sourceComponent: string;
    /** Location in code */
    location: {
        /** File path */
        filePath: string;
        /** Class name */
        className: string;
        /** Method name (if relation is on method) */
        methodName?: string;
        /** Line number in file */
        line: number;
    };
} 