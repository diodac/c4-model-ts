import { C4WorkspaceData } from "./model";
import { C4ModelData } from "../model";
import { Liquid } from 'liquidjs';
import * as fs from 'fs';

export class C4WorkspaceGenerator {
    private engine: Liquid;

    constructor(private templatePath: string) {
        this.engine = new Liquid({
            trimTagRight: false,
            trimTagLeft: false,
            trimOutputRight: false,
            trimOutputLeft: false
        });

        // Register indent filter
        this.engine.registerFilter('indent', (value: string, spaces: number) => {
            const indent = ' '.repeat(spaces);
            const lines = value.split('\n');
            if (lines.length <= 1) return value;
            
            return [
                lines[0],
                ...lines.slice(1).map(line => `${indent}${line}`)
            ].join('\n');
        });

        // Register filters for containers and relationships
        this.engine.registerFilter('containers', (containers: Map<string, C4ModelData>) => {
            return Array.from(containers.values()).map((container: C4ModelData) => {
                const lines = [];
                // Container definition
                lines.push(`${container.container.name} = container "${container.container.name}" {`);
                lines.push(`    description "${container.container.description}"`);
                if (container.container.technology) {
                    lines.push(`    technology "${container.container.technology}"`);
                }

                // Components within container
                if (container.components.length > 0) {
                    lines.push('');
                    container.components.forEach(component => {
                        lines.push(`    ${component.name} = component "${component.name}" {`);
                        if (component.description) {
                            lines.push(`        description "${component.description}"`);
                        }
                        if (component.technology) {
                            lines.push(`        technology "${component.technology}"`);
                        }
                        if (component.tags?.length) {
                            lines.push(`        tags "${component.tags.join(',')}"`);
                        }
                        lines.push('    }');
                    });
                }

                lines.push('}');
                return lines.join('\n');
            }).join('\n\n');
        });

        this.engine.registerFilter('relationships', (containers: Map<string, C4ModelData>) => {
            const relationships = Array.from(containers.values()).flatMap((container: C4ModelData) => 
                container.relations.map(relation => {
                    // If source is a component from current container, prefix it with container name
                    const source = container.components.some(c => c.name === relation.source) ? 
                        `${container.container.name}.${relation.source}` : relation.source;
                    
                    // If target is a component from current container, prefix it with container name
                    const target = container.components.some(c => c.name === relation.target) ? 
                        `${container.container.name}.${relation.target}` : relation.target;

                    let line = `${source} -> ${target}`;
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

    async generate(data: C4WorkspaceData): Promise<string> {
        const templateContent = fs.readFileSync(this.templatePath, 'utf-8');
        return await this.engine.parseAndRender(templateContent, data);
    }
} 