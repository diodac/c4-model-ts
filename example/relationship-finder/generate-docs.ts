import { execSync } from 'child_process';
import * as fs from 'fs';

// Get JSON data from analyzer
const jsonOutput = execSync('npx ts-node ../../src/cli/container.ts c4container.json --json', { encoding: 'utf-8' });
const data = JSON.parse(jsonOutput);

// Generate Markdown documentation
function generateMarkdown(): string {
    let md = `# ${data.container.name}\n\n`;
    md += `${data.container.description}\n\n`;
    md += `## Technology Stack\n${data.container.technology}\n\n`;
    
    md += `## Components\n\n`;
    for (const component of data.components) {
        md += `### ${component.metadata.name}\n\n`;
        md += `${component.metadata.description}\n\n`;
        md += `- **Technology:** ${component.metadata.technology}\n`;
        md += `- **Tags:** ${component.metadata.tags.join(', ')}\n\n`;
        
        if (component.relations.length > 0) {
            md += `#### Relations\n\n`;
            for (const relation of component.relations) {
                md += `- → ${relation.metadata.target}\n`;
                md += `  - Description: ${relation.metadata.description}\n`;
                md += `  - Technology: ${relation.metadata.technology}\n`;
                if (relation.metadata.tags) {
                    md += `  - Tags: ${relation.metadata.tags.join(', ')}\n`;
                }
                md += '\n';
            }
        }
    }

    if (data.undeclaredRelations?.length > 0) {
        md += `## Undeclared Relations\n\n`;
        for (const relation of data.undeclaredRelations) {
            md += `- ${relation.calledFrom.component.metadata.name} → ${relation.method.component.metadata.name}\n`;
            md += `  - Method: ${relation.method.name}\n`;
            md += `  - Called from: ${relation.calledFrom.method}\n`;
            md += `  - Location: ${relation.calledFrom.filePath}:${relation.calledFrom.line}\n\n`;
        }
    }

    return md;
}

// Generate PlantUML diagram
function generatePlantUML(): string {
    let puml = '@startuml\n\n';
    puml += `title ${data.container.name} - Component Diagram\n\n`;
    
    // Components
    for (const component of data.components) {
        puml += `[${component.metadata.name}] as ${component.metadata.name.replace(/\s+/g, '')}\n`;
        puml += `note right of ${component.metadata.name.replace(/\s+/g, '')}\n`;
        puml += `  ${component.metadata.description}\n`;
        puml += `  --\n`;
        puml += `  Tech: ${component.metadata.technology}\n`;
        puml += `end note\n\n`;
    }

    // Declared relations
    for (const component of data.components) {
        for (const relation of component.relations) {
            const sourceId = component.metadata.name.replace(/\s+/g, '');
            const targetId = relation.metadata.target.replace(/\s+/g, '');
            puml += `${sourceId} --> ${targetId}: ${relation.metadata.technology}\n`;
        }
    }

    // Undeclared relations (as dashed lines)
    if (data.undeclaredRelations) {
        puml += '\n' + '/' + '* Undeclared Relations *' + '/\n';
        for (const relation of data.undeclaredRelations) {
            const sourceId = relation.calledFrom.component.metadata.name.replace(/\s+/g, '');
            const targetId = relation.method.component.metadata.name.replace(/\s+/g, '');
            puml += `${sourceId} ..> ${targetId}: ${relation.method.name}()\n`;
        }
    }

    puml += '\n@enduml';
    return puml;
}

// Generate HTML table
function generateHTML(): string {
    let html = `<!DOCTYPE html>
<html>
<head>
    <title>${data.container.name} - Component Relations</title>
    <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .undeclared { color: orange; }
        .declared { color: green; }
    </style>
</head>
<body>
    <h1>${data.container.name}</h1>
    <h2>Component Relations</h2>
    <table>
        <tr>
            <th>Source</th>
            <th>Target</th>
            <th>Type</th>
            <th>Method</th>
            <th>Technology</th>
            <th>Description</th>
        </tr>`;

    // Declared relations
    for (const component of data.components) {
        for (const relation of component.relations) {
            html += `
        <tr class="declared">
            <td>${component.metadata.name}</td>
            <td>${relation.metadata.target}</td>
            <td>Declared</td>
            <td>-</td>
            <td>${relation.metadata.technology}</td>
            <td>${relation.metadata.description}</td>
        </tr>`;
        }
    }

    // Undeclared relations
    if (data.undeclaredRelations) {
        for (const relation of data.undeclaredRelations) {
            html += `
        <tr class="undeclared">
            <td>${relation.calledFrom.component.metadata.name}</td>
            <td>${relation.method.component.metadata.name}</td>
            <td>Undeclared</td>
            <td>${relation.method.name}</td>
            <td>Internal</td>
            <td>Called from ${relation.calledFrom.method}</td>
        </tr>`;
        }
    }

    html += `
    </table>
</body>
</html>`;

    return html;
}

// Generate all formats
fs.writeFileSync('docs/components.md', generateMarkdown());
fs.writeFileSync('docs/components.puml', generatePlantUML());
fs.writeFileSync('docs/relations.html', generateHTML());

console.log('Documentation generated:');
console.log('- docs/components.md (Markdown documentation)');
console.log('- docs/components.puml (PlantUML diagram)');
console.log('- docs/relations.html (HTML relations table)'); 