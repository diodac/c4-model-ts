# C4 Model Generator

This module automatically generates C4 model documentation from TypeScript code using JSDoc-style annotations. It follows the [Structurizr DSL](https://docs.structurizr.com/dsl) format and C4 model principles.

## Features

- Extracts C4 components and relationships from TypeScript code
- Uses JSDoc-style annotations with custom C4 tags
- Implements custom block tags (@c4Component, @c4Relationship, and @c4Group)
- Supports core Structurizr DSL parameters for components and relationships
- Validates relationships and detects undeclared dependencies
- Supports direct and indirect relationship detection
- Groups components using path-based notation (e.g., "Core/Auth/Security")
- Configurable source file patterns with glob support
- Command-line interface (CLI) with component and relationship validation
- External component definitions support

## Annotation Format

The generator uses JSDoc-style block comments with custom C4 tags. Each tag supports structured property definitions:

```typescript
/**
 * @c4Component
 * - description: Authentication service component
 * - technology: TypeScript
 * - url: https://docs/auth-service
 * - properties:
 *   criticality: high
 *   maintainer: team-auth
 * - tags: core, auth
 * 
 * @c4Group Core System/Authentication/Security Services
 */
export class AuthService {
    /**
     * @c4Relationship DatabaseService | Stores user credentials | PostgreSQL
     * - url: https://docs/db-integration
     * - properties:
     *   criticality: high
     *   sla: 99.9%
     * - tags: DirectRelation, persistence
     */
    constructor(private db: DatabaseService) {}

    /**
     * @c4Relationship EmailService | Sends password reset emails | SMTP
     * - tags: IndirectRelation
     */
    async resetPassword(userId: string): Promise<void> {
        // Implementation
    }
}
```

### Tag Format

Each C4 tag supports the following format:
- `@c4Component [name]` - Defines a component with optional inline name
- `@c4Relationship target | description | technology` - Defines a relationship with target, description, and technology
- `@c4Group path/to/group` - Assigns component to a group using path notation (e.g., "Core/Auth/Security")

Properties are defined using a simple structured format:
- Each property starts with `-` followed by a property name and value separated by `:`
- Nested properties are indented under their parent property
- Multiple values can be separated by commas
- Properties are optional and can be omitted if not needed

## Group System

Components can be organized into logical groups using a path-based notation:

```typescript
/**
 * @c4Group Core System/Authentication
 */
class AuthService { }

/**
 * @c4Group Core System/Authentication/Session Management
 */
class SessionManager { }

/**
 * @c4Group Technical Infrastructure/Data Storage
 */
class DatabaseService { }
```

Group paths:
- Use forward slashes (/) to indicate hierarchy
- Can contain spaces and hyphens
- Are used to generate nested groups in the C4 diagram
- Can be organized independently of the physical file structure

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

# Include undeclared relationships in DSL output
npm run c4-dsl [config-path] --include-undeclared
```

The `--include-undeclared` option is particularly useful when you want to:
- Discover hidden dependencies in your codebase that aren't explicitly documented
- Generate a complete view of all actual relationships between components
- Identify relationships that should be properly documented with `@c4Relationship` tags
- Validate your architecture by comparing declared vs actual dependencies

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
    ]
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
- `tags` - List of tags for filtering and styling

Example:
```typescript
/**
 * @c4Relationship DatabaseService | Stores payment data | PostgreSQL
 * - url: https://docs/payment-db-integration
 * - properties:
 *   criticality: high
 *   sla: 99.9%
 * - tags: DirectRelation, persistence
 */
async processPayment(paymentData: PaymentData): Promise<void> {
    // Implementation
}
```