import { ClassDeclaration, MethodDeclaration, JSDoc } from 'ts-morph';
import { RelationInfo, RelationMetadata } from './relation';
import { TagParser, TagSchema } from './tag-parser';

/**
 * Parser for @c4Relation tags
 */
export class RelationParser {
    private tagParser = new TagParser();

    /**
     * Schema for @c4Relation tag
     * Format:
     * ```
     * @c4Relation target | description | technology
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
     * Find all relations in a component
     */
    findRelations(classDecl: ClassDeclaration, componentName: string): RelationInfo[] {
        const relations: RelationInfo[] = [];

        // Check class level relations
        this.findRelationsInNode(classDecl, componentName, relations);

        // Check method level relations
        for (const method of classDecl.getMethods()) {
            this.findRelationsInNode(method, componentName, relations, method.getName());
        }

        return relations;
    }

    private findRelationsInNode(
        node: ClassDeclaration | MethodDeclaration, 
        componentName: string, 
        relations: RelationInfo[],
        methodName?: string
    ): void {
        const jsDocs = node.getJsDocs();
        if (!jsDocs.length) return;

        for (const jsDoc of jsDocs) {
            const relationTags = jsDoc.getTags().filter(tag => tag.getTagName() === 'c4Relation');
            
            for (const tag of relationTags) {
                const parsed = this.tagParser.parse(tag, this.schema);
                
                const metadata: RelationMetadata = {
                    target: parsed.args[0],
                    description: parsed.args[1],
                    technology: (parsed.params.technology as string) || parsed.args[2],
                    tags: Array.isArray(parsed.params.tags) ? parsed.params.tags : [],
                    url: parsed.params.url as string,
                    properties: parsed.params.properties as Record<string, string>
                };

                const className = node instanceof ClassDeclaration 
                    ? node.getName() || '' 
                    : this.getParentClassName(node);

                relations.push({
                    metadata,
                    sourceComponent: componentName,
                    location: {
                        filePath: node.getSourceFile().getFilePath(),
                        className,
                        methodName,
                        line: node.getStartLineNumber()
                    },
                    rawJSDoc: jsDoc.getText()
                });
            }
        }
    }

    private getParentClassName(method: MethodDeclaration): string {
        const parent = method.getParent();
        if (!parent || !(parent instanceof ClassDeclaration)) {
            return '';
        }
        return parent.getName() || '';
    }
} 