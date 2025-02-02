import { C4WorkspaceData } from "./model";
import { C4ModelData } from "../model";
import * as Handlebars from "handlebars";
import * as fs from 'fs';

export class C4WorkspaceGenerator {
    constructor(
        private templatePath: string
    ) {
        // Register Handlebars helpers
        Handlebars.registerHelper('containers', function(containers: Map<string, C4ModelData>) {
            return Array.from(containers.values()).map((container: C4ModelData) => {
                // Generate DSL for each container
                const lines = [];
                lines.push(`            ${container.container.name} = container "${container.container.name}" {`);
                lines.push(`                description "${container.container.description}"`);
                if (container.container.technology) {
                    lines.push(`                technology "${container.container.technology}"`);
                }
                lines.push('            }');
                return lines.join('\n');
            }).join('\n\n');
        });

        Handlebars.registerHelper('relationships', function(containers: Map<string, C4ModelData>) {
            const relationships = Array.from(containers.values()).flatMap((container: C4ModelData) => 
                container.relations.map(relation => {
                    // If source is a component from current container, prefix it with container name
                    const source = container.components.some(c => c.name === relation.source) ? 
                        `${container.container.name}.${relation.source}` : relation.source;
                    
                    // If target is a component from current container, prefix it with container name
                    const target = container.components.some(c => c.name === relation.target) ? 
                        `${container.container.name}.${relation.target}` : relation.target;

                    let line = `            ${source} -> ${target}`;
                    if (relation.description) {
                        line += ` "${relation.description}"`;
                    }
                    if (relation.technology) {
                        line += ` "${relation.technology}"`;
                    }
                    if (relation.tags?.length) {
                        line += ` "${relation.tags.join(',')}"`;
                    }
                    return line;
                })
            );
            return relationships.join('\n');
        });
    }

    generate(data: C4WorkspaceData): string {
        // Load template
        const templateContent = fs.readFileSync(this.templatePath, 'utf-8');
        
        // Compile template with noEscape option
        const template = Handlebars.compile(templateContent, { noEscape: true });
        
        // Generate DSL
        return template(data);
    }
} 