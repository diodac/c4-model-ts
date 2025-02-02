import { ClassDeclaration, MethodDeclaration, Node } from "ts-morph";
import { TSDocParser, TSDocConfiguration, DocBlockTag, TSDocTagDefinition, TSDocTagSyntaxKind, DocNode, DocExcerpt } from "@microsoft/tsdoc";
import { 
    C4ComponentMetadata, 
    C4RelationMetadata, 
    C4DocTags,
    C4ElementType,
    C4PerspectiveMetadata,
    StructurizrValidationError
} from "../model";
import * as fs from 'fs';
import * as path from 'path';

export class C4DocParser {
    private tsdocParser: TSDocParser;

    constructor() {
        const tsdocConfiguration = new TSDocConfiguration();
        
        // Load custom tag definitions from tsdoc.json
        const tsdocConfigPath = path.join(__dirname, '..', 'tsdoc.json');
        if (fs.existsSync(tsdocConfigPath)) {
            const tsdocConfig = JSON.parse(fs.readFileSync(tsdocConfigPath, 'utf-8'));
            for (const tagDef of tsdocConfig.tagDefinitions) {
                const tagDefinition = new TSDocTagDefinition({
                    tagName: tagDef.tagName,
                    syntaxKind: tagDef.syntaxKind === 'block' 
                        ? TSDocTagSyntaxKind.BlockTag 
                        : TSDocTagSyntaxKind.ModifierTag,
                    allowMultiple: !!tagDef.allowMultiple
                });
                tsdocConfiguration.addTagDefinitions([tagDefinition]);
            }
        }
        
        this.tsdocParser = new TSDocParser(tsdocConfiguration);
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

    /**
     * Parse a string in Structurizr DSL format into parts
     */
    private parseStructurizrString(content: string): string[] {
        const parts: string[] = [];
        let currentPart = '';
        let inQuotes = false;
        
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
                continue;
            }
            
            if (!inQuotes && char === ' ') {
                if (currentPart) {
                    parts.push(currentPart);
                    currentPart = '';
                }
            } else {
                currentPart += char;
            }
        }
        
        if (currentPart) {
            parts.push(currentPart);
        }
        
        return parts;
    }

    /**
     * Parse relations from JSDoc comment
     */
    parseRelations(node: ClassDeclaration | MethodDeclaration): C4RelationMetadata[] {
        const relations: C4RelationMetadata[] = [];
        const jsDoc = node.getJsDocs();

        // Get the source name - for methods, use the containing class name
        let sourceName: string | undefined;
        if (node instanceof ClassDeclaration) {
            sourceName = node.getName()?.toString();
        } else {
            const classNode = this.findParentClass(node);
            if (classNode) {
                sourceName = classNode.getName()?.toString();
            }
        }

        if (!sourceName) {
            throw new StructurizrValidationError('Could not determine source component name');
        }

        for (const doc of jsDoc) {
            const relationTags = doc.getTags().filter(tag => tag.getTagName() === 'c4Relation');
            
            for (const tag of relationTags) {
                const content = tag.getComment()?.toString() || '';
                const [target, description, technology, ...rest] = this.parseStructurizrString(content);

                if (!target || !description) {
                    throw new StructurizrValidationError(
                        'Invalid relation format. Expected at least target and description.'
                    );
                }

                relations.push({
                    source: sourceName,
                    target,
                    description,
                    technology,
                    tags: rest.length > 0 ? rest[0].split(',').map(t => t.trim()) : undefined
                });
            }
        }

        return relations;
    }

    private findParentClass(node: Node): ClassDeclaration | undefined {
        let current = node.getParent();
        while (current) {
            if (current instanceof ClassDeclaration) {
                return current;
            }
            current = current.getParent();
        }
        return undefined;
    }

    parseComponent(classDeclaration: ClassDeclaration): { metadata: C4ComponentMetadata, groupName?: string } | null {
        const jsDoc = classDeclaration.getJsDocs();
        if (!jsDoc.length) return null;

        const componentBlock = jsDoc[0].getTags().find(tag => tag.getTagName() === 'c4Component');
        if (!componentBlock) return null;

        const groupBlock = jsDoc[0].getTags().find(tag => tag.getTagName() === 'c4Group');
        const groupContent = groupBlock?.getComment()?.toString() || '';
        const groupName = groupContent ? this.parseStructurizrString(groupContent)[0] : undefined;

        const componentLines = (componentBlock.getComment()?.toString() || '').split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (!componentLines.length) {
            throw new StructurizrValidationError('Empty @c4Component tag content');
        }

        const [description, technology, tags] = this.parseStructurizrString(componentLines[0] || '');

        if (!description) {
            throw new StructurizrValidationError('Component description is required');
        }

        const metadata: C4ComponentMetadata = {
            name: classDeclaration.getName()?.toString() || '',
            description,
            technology,
            tags: tags?.split(',').map(tag => tag.trim())
        };

        let inProperties = false;
        let inPerspectives = false;
        const properties: Record<string, string> = {};
        const perspectives: Record<string, C4PerspectiveMetadata> = {};

        for (let i = 1; i < componentLines.length; i++) {
            const line = componentLines[i];
            const [keyword, ...values] = this.parseStructurizrString(line);

            if (!keyword) continue;

            if (inProperties) {
                if (keyword === '}') {
                    inProperties = false;
                } else {
                    properties[keyword] = values.join(' ');
                }
                continue;
            }

            if (inPerspectives) {
                if (keyword === '}') {
                    inPerspectives = false;
                } else {
                    if (values.length < 1) {
                        throw new StructurizrValidationError(
                            'Invalid perspective format. Expected at least one value.'
                        );
                    }
                    perspectives[keyword] = {
                        description: values[0],
                        value: values[1]
                    };
                }
                continue;
            }

            if (keyword === 'properties') {
                inProperties = true;
            } else if (keyword === 'perspectives') {
                inPerspectives = true;
            }
        }

        if (Object.keys(properties).length > 0) {
            metadata.properties = properties;
        }

        if (Object.keys(perspectives).length > 0) {
            metadata.perspectives = perspectives;
        }

        return { metadata, groupName };
    }
}