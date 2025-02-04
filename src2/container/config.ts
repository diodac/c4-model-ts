/** C4 model element type */
export type C4ElementType = 'component' | 'container' | 'softwareSystem' | 'person';

/** 
 * Hierarchical group structure
 * @additionalProperties true
 */
export interface GroupHierarchy {
    [groupName: string]: GroupHierarchy;
}

/** External element definition */
export interface ExternalElement {
    /** Element type */
    type: C4ElementType;
    /** Element description */
    description?: string;
    /** Technology used */
    technology?: string;
    /** Element tags */
    tags?: string[];
}

/** Container configuration */
export interface ContainerConfig {
    /** Container name */
    name: string;
    /** Container description */
    description: string;
    /** Technology stack */
    technology: string;
    /** Container tags */
    tags?: string[];
    /** Custom properties */
    properties?: Record<string, string>;
    /** Group hierarchy */
    groups?: GroupHierarchy;
    /** Source file patterns */
    source: string[];
    /** External components */
    external?: Record<string, ExternalElement>;
} 