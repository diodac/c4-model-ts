export const C4DocTags = {
    COMPONENT: '@c4Component',
    RELATION: '@c4Relation',
    GROUP: '@c4Group'
} as const;

export type C4ElementType = 'component' | 'container' | 'softwareSystem' | 'person';

export interface C4ExternalElement {
    type: C4ElementType;
}

export interface C4ExternalConfig {
    [elementId: string]: C4ExternalElement;
}

export interface C4ContainerMetadata {
    name: string;
    description: string;
    technology?: string;
    external?: C4ExternalConfig;
}

export interface C4PerspectiveMetadata {
    description: string;
    value?: string;
}

export interface C4GroupsConfig {
    [groupName: string]: C4GroupsConfig
}

export interface C4ComponentMetadata {
    name: string;
    description?: string;
    technology?: string;
    tags?: string[];
    url?: string;
    properties?: Record<string, string>;
    perspectives?: Record<string, C4PerspectiveMetadata>;
    docs?: string;
    adrs?: string;
}

export interface C4GroupComponents {
    [groupName: string]: string[];  // array of component names
}

export interface C4RelationMetadata {
    source: string;
    target: string;
    description?: string;
    technology?: string;
    tags?: string[];
    url?: string;
    properties?: Record<string, string>;
}

export interface C4ModelData {
    container: C4ContainerMetadata;
    components: C4ComponentMetadata[];
    relations: C4RelationMetadata[];
    groups: C4GroupsConfig;
    groupComponents: C4GroupComponents;
}

export const Tags = {
    ELEMENT: 'Element',
    COMPONENT: 'Component',
    RELATIONSHIP: 'Relationship'
} as const;

export class StructurizrValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'StructurizrValidationError';
    }
}

export class StructurizrModel {
    private container: C4ContainerMetadata;
    private components: Map<string, C4ComponentMetadata> = new Map();
    private relations: C4RelationMetadata[] = [];
    private groups: C4GroupsConfig;
    private groupComponents: C4GroupComponents = { "_": [] };

    constructor(containerMetadata: C4ContainerMetadata, groupsConfig: C4GroupsConfig) {
        this.validateName(containerMetadata.name);
        this.container = containerMetadata;
        this.groups = groupsConfig;
    }

    private validateGroup(groupName: string): void {
        // Check if group exists in configuration
        const allGroups = this.getAllGroupNames();
        if (!allGroups.includes(groupName)) {
            throw new StructurizrValidationError(
                `Group "${groupName}" is not defined in c4container.json`
            );
        }
    }

    private getAllGroupNames(): string[] {
        const groups: string[] = [];
        
        // Recursively collect all group names
        const collectGroups = (obj: C4GroupsConfig) => {
            Object.entries(obj).forEach(([key, value]) => {
                groups.push(key);
                collectGroups(value);
            });
        };

        collectGroups(this.groups);
        return groups;
    }

    private assignToGroup(componentName: string, groupName?: string) {
        // Remove from previous group if exists
        Object.values(this.groupComponents).forEach(components => {
            const index = components.indexOf(componentName);
            if (index !== -1) {
                components.splice(index, 1);
            }
        });

        // Assign to new group or default group
        const targetGroup = groupName || "_";
        if (!this.groupComponents[targetGroup]) {
            this.groupComponents[targetGroup] = [];
        }
        this.groupComponents[targetGroup].push(componentName);
    }

    addComponent(metadata: C4ComponentMetadata, groupName?: string) {
        this.validateName(metadata.name);
        
        // Check if component with this name already exists
        if (this.components.has(metadata.name)) {
            throw new StructurizrValidationError(
                `Component "${metadata.name}" already exists in container "${this.container.name}"`
            );
        }

        // If group is specified, validate it
        if (groupName) {
            this.validateGroup(groupName);
        }

        // Add default tags
        const tags = metadata.tags || [];
        if (!tags.includes(Tags.ELEMENT)) tags.push(Tags.ELEMENT);
        if (!tags.includes(Tags.COMPONENT)) tags.push(Tags.COMPONENT);
        metadata.tags = tags;

        this.components.set(metadata.name, metadata);
        this.assignToGroup(metadata.name, groupName);
    }

    addRelation(relation: C4RelationMetadata) {
        // Check if source component exists
        if (!this.components.has(relation.source)) {
            throw new StructurizrValidationError(
                `Source component "${relation.source}" does not exist`
            );
        }

        // Check if target component exists internally or is defined as external
        const isTargetExternal = this.container.external?.[relation.target];
        if (!this.components.has(relation.target) && !isTargetExternal) {
            throw new StructurizrValidationError(
                `Target "${relation.target}" does not exist as internal component or external element`
            );
        }

        // Check relation uniqueness
        const existingRelation = this.relations.find(r => 
            r.source === relation.source && 
            r.target === relation.target && 
            r.description === relation.description
        );

        if (existingRelation) {
            throw new StructurizrValidationError(
                `Relation from "${relation.source}" to "${relation.target}" with description "${relation.description}" already exists`
            );
        }

        // Add default tags
        const tags = relation.tags || [];
        if (!tags.includes(Tags.RELATIONSHIP)) tags.push(Tags.RELATIONSHIP);
        relation.tags = tags;

        this.relations.push(relation);
    }

    getData(): C4ModelData {
        return {
            container: this.container,
            components: Array.from(this.components.values()),
            relations: this.relations,
            groups: this.groups,
            groupComponents: this.groupComponents
        };
    }

    private validateName(name: string): void {
        if (!name) {
            throw new StructurizrValidationError('Name cannot be empty');
        }
        
        // Check if name contains invalid characters
        if (!/^[\w\s-]+$/.test(name)) {
            throw new StructurizrValidationError(
                `Name "${name}" contains invalid characters. Only letters, numbers, spaces and hyphens are allowed`
            );
        }
    }
} 