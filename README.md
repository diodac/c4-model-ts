# C4 Model Generator

This module automatically generates C4 model documentation from TypeScript code using JSDoc-style annotations. It follows the [Structurizr DSL](https://docs.structurizr.com/dsl) format and C4 model principles.

## Features

- Extracts C4 components and relationships from TypeScript code
- Uses JSDoc-style annotations with custom C4 tags
- Implements custom block tags (@c4Component, @c4Relationship, and @c4Group)
- Supports core Structurizr DSL parameters for components and relationships
- Validates relationships and detects undeclared dependencies
- Supports direct and indirect relationship detection
- Groups components logically with hierarchical group structures
- Configurable source file patterns with glob support
- Command-line interface (CLI) with component and relationship validation
- External component definitions support

## Annotation Format

The generator uses JSDoc-style block comments with custom C4 tags. Each tag supports structured property definitions:

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
     * @c4Relationship target | description | technology
     * - technology: Technology used (overrides the argument if specified)
     * - url: Documentation URL
     * - properties:
     *   key1: value1
     *   key2: value2
     * - tags: DirectRelation, tag2
     */
    constructor(private db: DatabaseService) {}

    /**
     * @c4Relationship NotificationService | Sends notifications | SMTP
     * - tags: IndirectRelation
     */
    async notifyUser(userId: string): Promise<void> {
        // Implementation
    }
}
```

### Tag Format

Each C4 tag supports the following format:
- `@c4Component [name]` - Defines a component with optional inline name
- `@c4Relationship target | description | technology` - Defines a relationship with target, description, and technology
- `@c4Group name` - Assigns component to a group

Properties are defined using a simple structured format:
- Each property starts with `-` followed by a property name and value separated by `:`
- Nested properties are indented under their parent property
- Multiple values can be separated by commas
- Properties are optional and can be omitted if not needed

## Technical Details

The module uses:
- [ts-morph](https://github.com/dsherret/ts-morph) for TypeScript code analysis and JSDoc parsing
- Custom block tags that extend the JSDoc standard:
  - `@c4Component` - Marks a class as a C4 component
  - `@c4Relationship` - Defines relationships between components
  - `@c4Group` - Defines logical grouping of components

## Installation

This project is currently in development. To use it:

1. Get the source code
2. Install project dependencies and build:
```bash
npm install
npm run build
```

## Usage

### Command Line Interface

The project provides several CLI commands:

#### Container Analysis

Analyze components and relations within a container:

```bash
# Basic usage
npm run c4-container [config-path]

# Show only components
npm run c4-container [config-path] --components

# Show only undeclared relations
npm run c4-container [config-path] --undeclared

# Show only invalid relations
npm run c4-container [config-path] --invalid

# Output raw JSON
npm run c4-container [config-path] --json
```

#### Workspace Analysis

Analyze containers and their relations in a workspace:

```bash
# Basic usage
npm run c4-workspace [config-path]

# Show only containers
npm run c4-workspace [config-path] --containers

# Show only undeclared relations
npm run c4-workspace [config-path] --undeclared

# Show only invalid relations
npm run c4-workspace [config-path] --invalid

# Output raw JSON
npm run c4-workspace [config-path] --json
```

#### DSL Generation

Generate Structurizr DSL from workspace configuration:

```bash
# Basic usage
npm run c4-dsl [config-path]

# Use custom template
npm run c4-dsl [config-path] --template path/to/template.dsl.tpl

# Specify output file
npm run c4-dsl [config-path] --output path/to/output.dsl

# Use custom workspace directory
npm run c4-dsl [config-path] --workspace-dir path/to/workspace
```

#### Schema Generation

Generate JSON schemas for configuration files:

```bash
# Generate container config schema
npm run c4-schema c4container

# Generate workspace config schema
npm run c4-schema c4workspace

# Specify output directory
npm run c4-schema c4container --output path/to/dir
```

### Configuration Files

#### Container Configuration (c4container.json)

Create a `c4container.json` file in your project root to define a container:

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
    },
    "relationships": [
        {
            "target": "external-service",
            "description": "Sends data to",
            "technology": "HTTP/REST",
            "tags": ["api", "external"],
            "url": "https://api.docs.example.com",
            "properties": {
                "criticality": "high",
                "sla": "99.9%"
            }
        }
    ],
    "groups": {
        "Core": {
            "CustomerManagement": {},
            "OrderProcessing": {}
        },
        "Infrastructure": {
            "Database": {},
            "Messaging": {}
        }
    }
}
```

#### Workspace Configuration (c4workspace.json)

Create a `c4workspace.json` file to define your C4 workspace structure:

```json
{
    "name": "Example System",
    "description": "Example system description",
    "containers": [
        {
            "path": "path/to/service1/c4container.json"
        },
        {
            "path": "path/to/service2/c4container.json"
        }
    ],
    "external": {
        "external-system": {
            "name": "External System",
            "description": "External system description",
            "containers": {
                "external-service": {
                    "name": "External Service",
                    "description": "External service description",
                    "technology": "REST API"
                }
            }
        }
    },
    "properties": {
        "criticality": "high",
        "team": "core"
    },
    "tags": ["system", "core"]
}
```

The workspace configuration allows you to:
- Define multiple containers and their locations
- Specify external systems and their containers
- Add workspace-level properties and tags
- Group containers into a cohesive system view

### Code Annotations

The generator uses JSDoc-style block comments with custom C4 tags to document your architecture.

#### @c4Component [name]

Marks a class as a C4 component. The name argument is optional - if omitted, the class name will be used.

Properties (all optional):
- `description` - Component description
- `technology` - Technology stack used by the component
- `url` - Link to component documentation
- `properties` - Custom key-value pairs
- `tags` - List of tags for filtering and styling

Example:
```typescript
/**
 * @c4Component PaymentProcessor
 * - description: Processes customer payments
 * - technology: Node.js, Stripe API
 * - url: https://docs/payment-processor
 * - properties:
 *   criticality: high
 *   maintainer: team-payments
 * - tags: core, payment
 */
export class PaymentProcessor {
    // Implementation
}
```

#### @c4Relationship target | description | technology

Defines a relationship between components. Typically used on methods to document their dependencies, but can also be used on constructors or at the class level.
All three arguments are required and should be separated by `|`:
- `target` - Name of the target component
- `description` - Description of the relationship
- `technology` - Technology used for communication

Additional properties (all optional):
- `url` - Link to relationship documentation
- `properties` - Custom key-value pairs
- `tags` - List of tags (including DirectRelation/IndirectRelation)

Example:
```typescript
/**
 * @c4Component OrderService
 * @c4Relationship PaymentGateway | Uses for payment processing | HTTPS
 */
export class OrderService {
    /**
     * @c4Relationship Database | Persists order data | SQL
     */
    constructor(private db: Database) {}

    /**
     * @c4Relationship NotificationService | Sends order confirmations | Message Queue
     * - technology: RabbitMQ
     * - tags: IndirectRelationship
     */
    async notifyCustomer(): Promise<void> {
        // Implementation
    }

    /**
     * @c4Relationship PaymentProcessor | Processes refunds | REST API
     */
    async processRefund(orderId: string): Promise<void> {
        // Implementation
    }
}
```

In the example above:
- Class-level relationship defines a general dependency on PaymentGateway
- Constructor relationship documents database dependency
- Method relations show specific interactions with other services

Relationships can be explicitly tagged with `DirectRelationship` or `IndirectRelationship` tags. The generator validates these tags against actual usage patterns in the code.

#### @c4Group name

Assigns a component to a logical group. The group name must match one of the groups defined in `c4container.json`.

Example:
```typescript
/**
 * @c4Component
 * - description: Manages customer data
 * - technology: Node.js
 * @c4Group CustomerManagement
 */
export class CustomerService {
    // Implementation
}
```

Groups and their hierarchy are defined in the container configuration:

```json
{
    "name": "your-service-name",
    "groups": {
        "Core": {
            "CustomerManagement": {},
            "OrderProcessing": {}
        },
        "Infrastructure": {
            "Database": {},
            "Messaging": {}
        }
    }
}
```

In this example:
- `CustomerManagement` is a subgroup of `Core`
- Components can be assigned to any group (`Core`, `CustomerManagement`, `Infrastructure`, etc.)
- Group hierarchy is used for visualization and organization

### Relationship Types

The generator automatically detects and validates two types of relationships:

- **Direct Relationships**: When a component directly uses another component (e.g., through constructor injection or class properties)
- **Indirect Relationships**: When a component creates or uses another component indirectly (e.g., creating new instances or using in method calls)

Relationships can be explicitly tagged with `DirectRelationship` or `IndirectRelationship` tags. The generator validates these tags against actual usage patterns in the code.

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

The generator uses [Liquid](https://liquidjs.com/) templates to generate Structurizr DSL files. Templates should be placed in the workspace directory with `.dsl.tpl` extension.

### Template Variables

The template has access to a `workspace` object containing:

- `containers` - List of containers with their properties:
  - `name` - Container identifier used in DSL
  - `title` - Container display name
  - `technology` - Technology stack
  - `description` - Container description
  - `analysis` - Container analysis results:
    - `components` - List of components with their metadata
    - `groups` - Component group hierarchy

- `relationships` - List of relationships between elements:
  - `source` - Source element identifier (container.component or container)
  - `target` - Target element identifier
  - `description` - Relationship description
  - `technology` - Technology used for communication

### Custom Filters

The template engine provides custom filters for DSL generation:

- `containers` - Generates container and component DSL code
- `relationships` - Generates relationship DSL code
- `indent` - Indents content by specified number of spaces

### Example Template

```liquid
workspace {
    model {
        {{ workspace | containers }}

        # Relationships
        {{ workspace | relationships }}
    }

    views {
        container system "Containers" {
            include *
            autolayout
        }
    }
}
```

The template will generate a Structurizr DSL file with:
- Container definitions with their components
- Component grouping structure
- All relationships between containers and components
- A container diagram view with auto-layout

This allows for flexible relationship definitions while maintaining validation and consistency.

### Relationship Validation

The generator validates relationships in several ways:

1. **Target Existence**: For relationships defined with `@c4Relationship`, the target must exist as one of:
   - A component defined with `@c4Component`
   - An external component defined in the `external` section
   - A target defined in the `relationships` section

2. **Usage Validation**: For relationships between internal components, the generator checks if the relationship is actually used in the code:
   - Direct usage through constructor injection, properties, or method parameters
   - Indirect usage through method calls or instance creation
   - The validation adds appropriate tags (`DirectRelationship` or `IndirectRelationship`)

3. **Tag Consistency**: The generator validates that:
   - A relationship cannot be both direct and indirect
   - Tags match the actual usage pattern in code

4. **Undeclared Relations**: The generator can detect relationships that exist in code but are not documented with `@c4Relationship`

For container-level relationships defined in `c4container.json`:
- No code-level validation is performed
- The target must be defined in the `external` section
- Basic validation of required fields (target, description) and field formats