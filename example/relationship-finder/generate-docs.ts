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
        
        if (component.relationships.length > 0) {
            md += `#### Relationships\n\n`;
            for (const relationship of component.relationships) {
                md += `- → ${relationship.metadata.target}\n`;
                md += `  - Description: ${relationship.metadata.description}\n`;
                md += `  - Technology: ${relationship.metadata.technology}\n`;
                if (relationship.metadata.tags) {
                    md += `  - Tags: ${relationship.metadata.tags.join(', ')}\n`;
                }
                md += '\n';
            }
        }
    }

    if (data.undeclaredRelationships?.length > 0) {
        md += `## Undeclared Relationships\n\n`;
        for (const relationship of data.undeclaredRelationships) {
            md += `- ${relationship.calledFrom.component.metadata.name} → ${relationship.method.component.metadata.name}\n`;
            md += `  - Method: ${relationship.method.name}\n`;
            md += `  - Called from: ${relationship.calledFrom.method}\n`;
            md += `  - Location: ${relationship.calledFrom.filePath}:${relationship.calledFrom.line}\n\n`;
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

    // Declared relationships
    for (const component of data.components) {
        for (const relationship of component.relationships) {
            const sourceId = component.metadata.name.replace(/\s+/g, '');
            const targetId = relationship.metadata.target.replace(/\s+/g, '');
            puml += `${sourceId} --> ${targetId}: ${relationship.metadata.technology}\n`;
        }
    }

    // Undeclared relationships (as dashed lines)
    if (data.undeclaredRelationships) {
        puml += '\n' + '/' + '* Undeclared Relationships *' + '/\n';
        for (const relationship of data.undeclaredRelationships) {
            const sourceId = relationship.calledFrom.component.metadata.name.replace(/\s+/g, '');
            const targetId = relationship.method.component.metadata.name.replace(/\s+/g, '');
            puml += `${sourceId} ..> ${targetId}: ${relationship.method.name}()\n`;
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
    <title>${data.container.name} - Component Relationships</title>
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
    <h2>Component Relationships</h2>
    <table>
        <tr>
            <th>Source</th>
            <th>Target</th>
            <th>Type</th>
            <th>Method</th>
            <th>Technology</th>
            <th>Description</th>
        </tr>`;

    // Declared relationships
    for (const component of data.components) {
        for (const relationship of component.relationships) {
            html += `
        <tr class="declared">
            <td>${component.metadata.name}</td>
            <td>${relationship.metadata.target}</td>
            <td>Declared</td>
            <td>-</td>
            <td>${relationship.metadata.technology}</td>
            <td>${relationship.metadata.description}</td>
        </tr>`;
        }
    }

    // Undeclared relationships
    if (data.undeclaredRelationships) {
        for (const relationship of data.undeclaredRelationships) {
            html += `
        <tr class="undeclared">
            <td>${relationship.calledFrom.component.metadata.name}</td>
            <td>${relationship.method.component.metadata.name}</td>
            <td>Undeclared</td>
            <td>${relationship.method.name}</td>
            <td>Internal</td>
            <td>Called from ${relationship.calledFrom.method}</td>
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
console.log('- docs/relations.html (HTML relationships table)'); 