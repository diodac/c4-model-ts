import { ClassDeclaration, MethodDeclaration, ConstructorDeclaration, JSDoc } from 'ts-morph';
import { RelationshipInfo, RelationshipMetadata } from './model/relationship';
import { TagParser, TagSchema } from './tag-parser';

/**
 * Parser for @c4Relationship tags
 */
export class RelationshipParser {
    private tagParser = new TagParser();

    /**
     * Schema for @c4Relationship tag
     * Format:
     * ```
     * @c4Relationship target | description | technology
     * - technology: Technology used (overrides the argument if specified)
     * - url: Documentation URL
     * - properties:
     *   key1: value1
     *   key2: value2
     * - tags: tag1, tag2
     * ```
     */
    private readonly schema: TagSchema = {
        args: ['string', 'string', '?string'],
        params: {
            technology: 'string',
            url: 'string',
            properties: 'dict',
            tags: 'list'
        }
    };

    /**
     * Find all relationships in a component
     */
    findRelationships(classDecl: ClassDeclaration): RelationshipInfo[] {
        const relationships: RelationshipInfo[] = [];

        // Check class level relationships
        this.findRelationshipsInNode(classDecl, relationships);

        // Check constructor relationships
        const constructor = classDecl.getConstructors()[0];
        if (constructor) {
            this.findRelationshipsInNode(constructor, relationships, 'constructor');
        }

        // Check method level relationships
        for (const method of classDecl.getMethods()) {
            this.findRelationshipsInNode(method, relationships, method.getName());
        }

        return relationships;
    }

    private findRelationshipsInNode(
        node: ClassDeclaration | MethodDeclaration | ConstructorDeclaration, 
        relationships: RelationshipInfo[],
        methodName?: string
    ): void {
        const jsDocs = node.getJsDocs();
        if (!jsDocs.length) return;

        // Get the actual class name for the source component
        const className = node instanceof ClassDeclaration 
            ? node.getName() || '' 
            : this.getParentClassName(node);

        for (const jsDoc of jsDocs) {
            const relationTags = jsDoc.getTags().filter(tag => tag.getTagName() === 'c4Relationship');
            
            for (const tag of relationTags) {
                const parsed = this.tagParser.parse(tag, this.schema);
                const targetComponent = parsed.args[0];
                
                const metadata: RelationshipMetadata = {
                    target: targetComponent,
                    description: parsed.args[1],
                    technology: (parsed.params.technology as string) || parsed.args[2],
                    tags: Array.isArray(parsed.params.tags) ? parsed.params.tags : [],
                    url: parsed.params.url as string,
                    properties: parsed.params.properties as Record<string, string>
                };

                relationships.push({
                    metadata,
                    sourceComponent: className,  // Use class name instead of component name
                    location: {
                        filePath: node.getSourceFile().getFilePath(),
                        className,
                        methodName,
                        line: node.getStartLineNumber()
                    },
                });
            }
        }
    }

    private getParentClassName(node: MethodDeclaration | ConstructorDeclaration): string {
        const parent = node.getParent();
        if (!parent || !(parent instanceof ClassDeclaration)) {
            return '';
        }
        return parent.getName() || '';
    }
} 