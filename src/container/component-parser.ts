import { ClassDeclaration, JSDoc } from 'ts-morph';
import { ComponentInfo, ComponentMetadata } from './model/component';
import { TagParser, TagSchema } from './tag-parser';
import { ContainerConfig, Groups } from './model/container';

/**
 * Error thrown when a group is not declared in container configuration
 */
export class UndeclaredGroupError extends Error {
    constructor(groupName: string) {
        super(`Group "${groupName}" is not declared in container configuration`);
        this.name = 'UndeclaredGroupError';
    }
}

/**
 * Parser for @c4Component tags
 */
export class ComponentParser {
    private tagParser = new TagParser();
    private containerConfig?: ContainerConfig;

    constructor(containerConfig?: ContainerConfig) {
        this.containerConfig = containerConfig;
    }

    /**
     * Schema for @c4Component tag
     * Format:
     * ```
     * Description of the component.
     * @c4Component [name]
     * - description: Component description (optional, defaults to comment text)
     * - technology: Technology used
     * - url: Documentation URL
     * - properties:
     *   key1: value1
     *   key2: value2
     * - tags: tag1, tag2
     * ```
     */
    private readonly schema: TagSchema = {
        args: ['?string'],
        params: {
            description: 'string',
            technology: 'string',
            url: 'string',
            properties: 'dict',
            tags: 'list'
        }
    };

    /**
     * Schema for @c4Group tag
     */
    private readonly groupSchema: TagSchema = {
        args: ['string'],
        params: {}
    };

    /**
     * Validate if a group exists in the container configuration
     */
    private validateGroup(groupName: string): void {
        if (!this.containerConfig?.groups) {
            throw new UndeclaredGroupError(groupName);
        }

        const isGroupDeclared = this.isGroupInHierarchy(groupName, this.containerConfig.groups);
        if (!isGroupDeclared) {
            throw new UndeclaredGroupError(groupName);
        }
    }

    /**
     * Recursively check if a group exists in the group hierarchy
     */
    private isGroupInHierarchy(groupName: string, groups: Groups): boolean {
        // Check if group exists at current level
        if (groupName in groups) {
            return true;
        }

        // Recursively check subgroups
        for (const subgroups of Object.values(groups)) {
            if (this.isGroupInHierarchy(groupName, subgroups)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Parse component metadata from class declaration
     */
    parse(classDecl: ClassDeclaration): ComponentInfo | null {
        const jsDocs = classDecl.getJsDocs();
        if (!jsDocs.length) return null;

        const jsDoc = jsDocs[0];

        // Look for @c4Component tag
        const componentTag = jsDoc.getTags().find(tag => tag.getTagName() === 'c4Component');
        if (!componentTag) return null;

        // Look for @c4Group tag
        const groupTag = jsDoc.getTags().find(tag => tag.getTagName() === 'c4Group');
        
        // Get comment text before tags
        const commentText = this.getCommentText(jsDoc);
        
        // Parse component tag
        const parsed = this.tagParser.parse(componentTag, this.schema);
        
        // Get component name - use class name by default, override with tag argument if provided
        const className = classDecl.getName() || '';
        const componentName = parsed.args[0] || className;
        
        // Parse group tag and remove quotes from group name
        let groupName: string | undefined;
        if (groupTag) {
            groupName = this.tagParser.parse(groupTag, this.groupSchema).args[0];
            // Validate group if container config is provided
            if (groupName && this.containerConfig) {
                this.validateGroup(groupName);
            }
        }
        
        // Convert to component metadata
        const metadata: ComponentMetadata = {
            name: componentName,
            description: parsed.params.description as string || commentText || '',
            technology: parsed.params.technology as string,
            tags: Array.isArray(parsed.params.tags) ? parsed.params.tags : [],
            group: groupName
        };

        return {
            metadata,
            location: {
                filePath: classDecl.getSourceFile().getFilePath(),
                className,
                line: classDecl.getStartLineNumber()
            },
            relationships: []
        };
    }

    /**
     * Get comment text before any tags
     */
    private getCommentText(jsDoc: JSDoc): string {
        const comment = jsDoc.getComment();
        if (!comment) return '';

        // Convert comment to string
        const commentText = Array.isArray(comment) 
            ? comment.map(node => node?.getText()).join('')
            : comment;

        // Split into lines and trim
        const lines = commentText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        // Find first line that starts with @
        const tagIndex = lines.findIndex(line => line.startsWith('@'));
        
        if (tagIndex === -1) {
            // No tags found, use all lines
            return lines.join('\n');
        } else {
            // Use only lines before first tag
            return lines.slice(0, tagIndex).join('\n');
        }
    }
} 