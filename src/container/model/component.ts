import { RelationInfo } from './relation';

/**
 * C4 component metadata from @c4Component annotation
 */
export interface ComponentMetadata {
    /** Component name (from annotation or class name) */
    name: string;
    
    /** Component description (from annotation or JSDoc) */
    description: string;
    
    /** Technology used by the component */
    technology?: string;
    
    /** Component tags */
    tags?: string[];
    
    /** Group that the component belongs to (from @c4Group) */
    group?: string;
}

/**
 * Information about a component found in the code
 */
export interface ComponentInfo {
    /** Component metadata */
    metadata: ComponentMetadata;
    
    /** Location in code */
    location: {
        /** File path */
        filePath: string;
        /** Class name */
        className: string;
        /** Line number in file */
        line: number;
    };
    
    /** Relations defined in this component */
    relations: RelationInfo[];
} 