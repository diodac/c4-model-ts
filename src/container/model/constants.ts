/**
 * C4 Model constants
 */

/**
 * Relationship tags
 */
export const C4RelationshipTags = {
    /** Direct relationship (e.g. through constructor injection or class properties) */
    DIRECT: 'DirectRelationship',
    /** Indirect relationship (e.g. through method calls or instance creation) */
    INDIRECT: 'IndirectRelationship',
    /** Undeclared relationship (found in code but not documented) */
    UNDECLARED: 'UndeclaredRelationship'
} as const;

/**
 * JSDoc tag names
 */
export const C4DocTags = {
    /** Component definition tag */
    COMPONENT: 'c4Component',
    /** Relationship definition tag */
    RELATIONSHIP: 'c4Relationship',
    /** Group assignment tag */
    GROUP: 'c4Group'
} as const; 