import { ClassDeclaration, MethodDeclaration, ConstructorDeclaration, JSDoc } from 'ts-morph';
import { RelationInfo, RelationMetadata } from './model/relation';
import { TagParser, TagSchema } from './tag-parser';
import { RelationValidator } from './relation-validator';

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

        // Check constructor relations
        const constructor = classDecl.getConstructors()[0];
        if (constructor) {
            this.findRelationsInNode(constructor, componentName, relations, 'constructor');
        }

        // Check method level relations
        for (const method of classDecl.getMethods()) {
            this.findRelationsInNode(method, componentName, relations, method.getName());
        }

        return relations;
    }

    private findRelationsInNode(
        node: ClassDeclaration | MethodDeclaration | ConstructorDeclaration, 
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
                const targetComponent = parsed.args[0];
                
                const metadata: RelationMetadata = {
                    target: targetComponent,
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

    private getParentClassName(node: MethodDeclaration | ConstructorDeclaration): string {
        const parent = node.getParent();
        if (!parent || !(parent instanceof ClassDeclaration)) {
            return '';
        }
        return parent.getName() || '';
    }
} 