# C4 Model Generator

This module automatically generates C4 model documentation from TypeScript code using [TSDoc](https://tsdoc.org/) annotations. It follows the [Structurizr DSL](https://docs.structurizr.com/dsl) format and C4 model principles.

## Features

- Extracts C4 components and relationships from TypeScript code
- Uses TSDoc standard for documentation comments
- Implements custom TSDoc block tags (@c4Component and @c4Relation)
- Supports all Structurizr DSL parameters for components and relationships
- Handles perspectives with descriptions and optional values
- Supports properties and custom metadata
- Configurable source file patterns with glob support
- Command-line interface (CLI) for easy integration

## Technical Details

The module uses:
- [@microsoft/tsdoc](https://www.npmjs.com/package/@microsoft/tsdoc) for parsing documentation comments
- [ts-morph](https://github.com/dsherret/ts-morph) for TypeScript code analysis
- Custom block tags that extend the TSDoc standard:
  - `@c4Component` - Marks a class as a C4 component
  - `@c4Relation` - Defines relationships between components

## Installation

```bash
# Local installation
npm install @rhino/c4-generator

# Global installation (for CLI usage)
npm install -g @rhino/c4-generator
```

## Usage

### Command Line Interface

The generator can be run from the command line:

```bash
# Using global installation
c4-generator [config-path]

# Using local installation
npx c4-generator [config-path]
```

The `config-path` argument is optional:
- If provided, it should point to a `c4model.json` file
- If omitted, the generator will search for `c4model.json` in the current directory and its parent directories

Example:
```bash
# Using specific config file
c4-generator ./path/to/c4model.json

# Using automatic config file detection
c4-generator
```

The generator will:
1. Load the configuration from `c4model.json`
2. Look for `tsconfig.json` in the same directory
3. Generate the C4 model
4. Output the result as JSON to stdout

### Programmatic Usage

### 1. Configure Container

Create a `c4model.json` file in your project root:

```json
{
    "container": {
        "name": "your-service-name",
        "description": "Service description",
        "technology": "technology stack"
    },
    "source": [
        "**/*.ts",
        "!node_modules/**",
        "!dist/**",
        "!test/**"
    ]
}
```

### 2. Annotate Your Code

Add C4 annotations using TSDoc syntax:

```typescript
/**
 * @c4Component "Component name" "Technology" "Tags"
 *   description "Detailed description"
 *   tags "Additional,Tags"
 *   url "https://docs.example.com"
 *   properties {
 *     criticality high
 *     maintainer "team-name"
 *   }
 *   perspectives {
 *     security "Security requirements" "high"
 *     performance "Performance requirements"
 *   }
 *   !docs "./docs/component"
 *   !adrs "./docs/decisions"
 */
export class ExampleService {
    /**
     * @c4Relation "DatabaseService" "Stores application data" "PostgreSQL" "Database,Core"
     */
    constructor(private db: DatabaseService) {}

    /**
     * @c4Relation "NotificationService" "Sends email notifications" "SMTP" "External"
     */
    async notifyUser(userId: string): Promise<void> {
        // Implementation
    }
}
```

### 3. Generate Model

```typescript
import { C4Generator } from './c4';

const generator = new C4Generator("tsconfig.json");
const model = generator.generate([
    "**/*.ts",
    "!node_modules/**/*.ts",
    "!dist/**/*.ts",
    "!test/**/*.ts"
]);
```

## Annotations

### @c4Component
Defines a C4 component with its metadata:
- First line: `"name" "technology" "tags"`
- Additional parameters:
  - `description` - Detailed component description
  - `tags` - Additional tags (comma-separated)
  - `url` - Documentation URL
  - `properties` - Custom properties in key-value format
  - `perspectives` - Component perspectives with descriptions and optional values
  - `!docs` - Path to documentation
  - `!adrs` - Path to architecture decision records

### @c4Relation
Defines a relationship between components:
- Format: `"target" "description" "technology" "tags"`
- Can be used on:
  - Class declarations (component-level relationships)
  - Constructor parameters (dependency relationships)
  - Methods (behavioral relationships)

## Output

The generator produces a `C4ModelData` object containing:
- Container metadata
- List of components with their metadata
- List of relationships between components

This data can be used to:
- Generate Structurizr DSL
- Create C4 diagrams
- Build documentation
- Analyze architecture

## Example

See `example.ts` for a complete example of component and relationship definitions.