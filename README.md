# C4 Model Generator

This module automatically generates C4 model documentation from TypeScript code using JSDoc annotations. It follows the [Structurizr DSL](https://docs.structurizr.com/dsl) format and C4 model principles.

## Features

- Extracts C4 components and relationships from TypeScript code
- Uses JSDoc standard for documentation comments
- Implements custom JSDoc block tags (@c4Component, @c4Relation, and @c4Group)
- Supports core Structurizr DSL parameters for components and relationships
- Validates relationships and detects undeclared dependencies
- Supports direct and indirect relationship detection
- Groups components logically with hierarchical group structures
- Configurable source file patterns with glob support
- Command-line interface (CLI) with component and relation validation
- External component definitions support

## Technical Details

The module uses:
- [ts-morph](https://github.com/dsherret/ts-morph) for TypeScript code analysis and JSDoc parsing
- Custom block tags that extend the JSDoc standard:
  - `@c4Component` - Marks a class as a C4 component
  - `@c4Relation` - Defines relationships between components
  - `@c4Group` - Defines logical grouping of components

## Installation

```bash
# Local installation
npm install @rhino/c4-generator

# Global installation (for CLI usage)
npm install -g @rhino/c4-generator
```

## Usage

### Command Line Interface

The generator can be run from the command line with various options:

```bash
# Basic usage
c4-generator [config-path]

# Show components and their relations
c4-generator [config-path] --components

# Show undeclared relations
c4-generator [config-path] --undeclared

# Show invalid relations
c4-generator [config-path] --invalid
```

The `config-path` argument should point to a `c4container.json` file.

### Container Configuration

Create a `c4container.json` file in your project root:

```json
{
    "name": "your-service-name",
    "description": "Service description",
    "technology": "technology stack",
    "tags": ["tag1", "tag2"],
    "properties": {
        "criticality": "high",
        "maintainer": "team-core"
    },
    "source": [
        "src/**/*.ts",
        "!node_modules/**",
        "!dist/**",
        "!test/**"
    ],
    "external": {
        "external-service": {
            "name": "External Service",
            "description": "Description of external service",
            "technology": "REST API"
        }
    }
}
```

### Code Annotations

Add C4 annotations using JSDoc syntax:

```typescript
/**
 * @c4Component [name]
 * - description: Component description
 * - technology: Technology stack
 * - url: Documentation URL
 * - properties:
 *   criticality: high
 *   maintainer: team-name
 * - tags: tag1, tag2
 * 
 * @c4Group GroupName
 */
export class ExampleService {
    /**
     * @c4Relation target | description | technology
     * - technology: Technology used (overrides the argument if specified)
     * - url: Documentation URL
     * - properties:
     *   key1: value1
     *   key2: value2
     * - tags: DirectRelation, tag2
     */
    constructor(private db: DatabaseService) {}

    /**
     * @c4Relation NotificationService | Sends notifications | SMTP
     * - tags: IndirectRelation
     */
    async notifyUser(userId: string): Promise<void> {
        // Implementation
    }
}
```### Relationship Types

The generator automatically detects and validates two types of relationships:

- **Direct Relations**: When a component directly uses another component (e.g., through constructor injection or class properties)
- **Indirect Relations**: When a component creates or uses another component indirectly (e.g., creating new instances or using in method calls)

Relationships can be explicitly tagged with `DirectRelation` or `IndirectRelation` tags. The generator validates these tags against actual usage patterns in the code.

### Analysis Output

The analysis produces detailed information about:

- Components with their metadata and locations
- Declared relationships between components
- Undeclared relationships found in the code
- Invalid relationships (missing targets, unused relations, or incorrect tags)
- Component grouping structure

Components are organized by their logical groups, making it easier to understand the system structure.

## Example

See the `example` directory for complete examples of:
- Container configuration
- Component and relationship definitions
- Group structures
- External component definitions

## DSL Templates

The generator uses Liquid templates to generate Structurizr DSL files. Templates should be placed in the workspace directory with `.dsl.tpl` extension.

### Template Variables

- `workspace` - Contains analyzed workspace data:
  - `containers` - List of containers with their properties
  - `relationships` - List of relationships between containers

### Template Filters

- `containers` - Generates DSL code for containers
- `relationships` - Generates DSL code for relationships
- `indent` - Indents content by specified number of spaces

### Example Template

```
workspace {
    model {
        enterprise "Example Corp" {
            mySystem = softwareSystem "My System" {
                description "Example system description"
                
                # Generate container definitions
                {{ workspace | containers | indent: 16 }}
                
                # Generate relationships
                {{ workspace | relationships | indent: 16 }}
            }
        }
    }
    
    views {
        systemContext mySystem "SystemContext" {
            include *
            autoLayout
        }
        
        container mySystem "Containers" {
            include *
            autoLayout
        }
    }
}
```

### Template Location

By default, the generator looks for templates in:
- `<workspace_dir>/workspace.dsl.tpl`

You can override the template location using:
- `workspaceDir` in c4workspace.json
- `--workspace-dir` CLI option
- Custom template path in API options

### Generated DSL Format

Container definitions:
```
containerName = container "Container Title" {
    technology "Technology Stack"
    description "Container description"
}
```

Relationship definitions:
```
sourceContainer -> targetContainer "Relationship description" "Technology"
```

