import { ClassDeclaration, MethodDeclaration, Node } from "ts-morph";
import { TSDocParser, TSDocConfiguration, DocBlockTag, TSDocTagDefinition, TSDocTagSyntaxKind, DocNode, DocExcerpt } from "@microsoft/tsdoc";
import { C4ComponentMetadata, C4RelationMetadata, C4PerspectiveMetadata, StructurizrValidationError, C4DocTags } from "./model";
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

    parseComponent(classDeclaration: ClassDeclaration): { metadata: C4ComponentMetadata, groupName?: string } | null {
        const jsDocs = classDeclaration.getJsDocs();
        if (!jsDocs.length) return null;

        const combinedJsDoc = jsDocs.map(doc => doc.getText()).join('\n');
        const parsedDoc = this.tsdocParser.parseString(combinedJsDoc);
        
        const groupBlock = parsedDoc.docComment.customBlocks.find(
            block => block.blockTag.tagName === C4DocTags.GROUP
        );

        const componentBlock = parsedDoc.docComment.customBlocks.find(
            block => block.blockTag.tagName === C4DocTags.COMPONENT
        );

        if (!componentBlock) return null;

        // Parse group content
        const groupContent = groupBlock ? Formatter.renderDocNodes(groupBlock.content.getChildNodes()).split('\n')[0] : '';
        const groupName = groupContent ? this.parseStructurizrString(groupContent)[0] : undefined;

        // Parse component content
        const componentLines = Formatter.renderDocNodes(componentBlock.content.getChildNodes()).split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        // First line contains basic parameters: [description] [technology] [tags]
        const [description, technology, tags] = this.parseStructurizrString(componentLines[0] || '');
        
        const metadata: C4ComponentMetadata = {
            name: classDeclaration.getName() || '',
            description,
            technology,
            tags: tags?.split(',').map(tag => tag.trim())
        };

        // Parse additional parameters from subsequent lines
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
                            `Perspective "${keyword}" must have at least a description`
                        );
                    }
                    perspectives[keyword] = {
                        description: values[0],
                        ...(values.length > 1 ? { value: values[1] } : {})
                    };
                }
                continue;
            }

            switch (keyword.toLowerCase()) {
                case 'description':
                    metadata.description = values.join(' ');
                    break;
                case 'tags':
                    metadata.tags = values.join(' ').split(',').map(tag => tag.trim());
                    break;
                case 'url':
                    metadata.url = values.join(' ');
                    break;
                case 'properties':
                    if (values.length === 0 || values[0] === '{') {
                        inProperties = true;
                    }
                    break;
                case 'perspectives':
                    if (values.length === 0 || values[0] === '{') {
                        inPerspectives = true;
                    }
                    break;
                case '!docs':
                    metadata.docs = values.join(' ');
                    break;
                case '!adrs':
                    metadata.adrs = values.join(' ');
                    break;
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

    parseRelations(declaration: ClassDeclaration | MethodDeclaration): C4RelationMetadata[] {
        const jsDocs = declaration.getJsDocs();
        if (!jsDocs.length) return [];

        const combinedJsDoc = jsDocs.map(doc => doc.getText()).join('\n');
        const parsedDoc = this.tsdocParser.parseString(combinedJsDoc);
        const relations: C4RelationMetadata[] = [];

        const parent = declaration.getParent();
        const sourceName = declaration instanceof ClassDeclaration 
            ? declaration.getName()
            : parent instanceof ClassDeclaration 
                ? parent.getName()
                : undefined;

        if (!sourceName) return [];

        for (const block of parsedDoc.docComment.customBlocks) {
            if (block.blockTag.tagName !== C4DocTags.RELATION) continue;

            // Parse relation content
            const relationLines = Formatter.renderDocNodes(block.content.getChildNodes()).split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            if (relationLines.length === 0) continue;

            // First line contains basic parameters: target [description] [technology] [tags]
            const [target, description, technology, tags] = this.parseStructurizrString(relationLines[0]);
            if (!target) continue;

            const relation: C4RelationMetadata = {
                source: sourceName,
                target
            };

            if (description) {
                relation.description = description;
            }
            if (technology) {
                relation.technology = technology;
            }
            if (tags) {
                relation.tags = tags.split(',').map(tag => tag.trim());
            }

            // Parse additional parameters from subsequent lines
            let inProperties = false;
            const properties: Record<string, string> = {};

            for (let i = 1; i < relationLines.length; i++) {
                const line = relationLines[i];
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

                switch (keyword.toLowerCase()) {
                    case 'url':
                        relation.url = values.join(' ');
                        break;
                    case 'properties':
                        if (values.length === 0 || values[0] === '{') {
                            inProperties = true;
                        }
                        break;
                }
            }

            if (Object.keys(properties).length > 0) {
                relation.properties = properties;
            }

            relations.push(relation);
        }

        return relations;
    }

    private parseStructurizrString(input: string): string[] {
        const tokens: string[] = [];
        let currentToken = '';
        let inQuotes = false;
        console.log(input);
        
        for (let i = 0; i < input.length; i++) {
            const char = input[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
                continue;
            }
            
            if (char === ' ' && !inQuotes) {
                if (currentToken) {
                    tokens.push(currentToken);
                    currentToken = '';
                }
            } else {
                currentToken += char;
            }
        }
        
        if (currentToken) {
            tokens.push(currentToken);
        }
        
        return tokens;
    }
} 

class Formatter {
    public static renderDocNode(docNode: DocNode): string {
      let result: string = '';
      if (docNode) {
        if (docNode instanceof DocExcerpt) {
          result += docNode.content.toString();
        }
        for (const childNode of docNode.getChildNodes()) {
          result += Formatter.renderDocNode(childNode);
        }
      }
      return result;
    }
  
    public static renderDocNodes(docNodes: ReadonlyArray<DocNode>): string {
      let result: string = '';
      for (const docNode of docNodes) {
        result += Formatter.renderDocNode(docNode);
      }
      return result;
    }
  }