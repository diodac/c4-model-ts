# DSL Generator Design

## Overview
The DSL generator will be responsible for converting analyzer data into Structurizr DSL format using liquid.js templating engine. The generator will use template files (*.dsl.tpl) to define the structure of the output DSL files.

## Template System

### Template Engine
- Using liquid.js for template processing
- Templates will be stored with `.dsl.tpl` extension
- Support for nested templates and includes

### Custom Filters
We will implement the following custom liquid filters:

1. `containers` - Processes container data into DSL format
   ```typescript
   // Input: Workspace data from analyzer containing containers
   // Output: DSL representation of containers
   workspace = {
     containers: [
       { name: "analytics", technology: "node.js", ... }
     ]
   }
   // Usage in template:
   {{ workspace | containers | indent: 12 }}
   // Output example:
   analytics = container "Analytics Service" {
     technology "Node.js"
     description "Analytics processing service"
   }
   ```

2. `relationships` - Processes relationships between containers
   ```typescript
   // Input: Workspace data from analyzer containing relationships
   // Output: DSL representation of relationships
   workspace = {
     relationships: [
       { source: "analytics", target: "metrics", type: "uses", technology: "REST" }
     ]
   }
   // Usage in template:
   {{ workspace | relationships | indent: 12 }}
   // Output example:
   analytics -> metrics "Sends metrics data" "REST"
   ```

3. `indent` - Helper filter for proper DSL indentation
   ```typescript
   // Input: DSL content and number of spaces
   // Output: Indented DSL content
   {{ content | indent: 12 }}
   ```

## Data Flow
1. Analyzer collects data about:
   - Containers and their properties
   - Components within containers
   - Relationships between containers
   - Groups and hierarchies
   - Tags and metadata

2. Data is passed to the generator as structured objects

3. Generator:
   - Loads appropriate template
   - Registers custom filters
   - Processes template with data
   - Outputs formatted DSL

## Template Structure
Templates will follow Structurizr DSL hierarchy:
```
workspace {
    model {
        system {
            containers {
                components
            }
            relationships
        }
    }
    views {
        // View definitions
    }
}
```

## Validation
The generator will validate:
- Template syntax correctness
- Required data presence
- DSL structure compliance
- Proper indentation
- Relationship validity

## Error Handling
- Template syntax errors
- Missing required data
- Invalid relationships
- Malformed DSL structure

## Future Considerations
1. Support for multiple output formats
2. Template inheritance
3. Custom DSL extensions
4. View generation
5. Dynamic template selection based on configuration

## CLI Command
The generator will provide a CLI command for DSL generation:

```bash
c4-model generate-dsl <path-to-c4workspace.json>
```

### Command Behavior
1. Input:
   - Required: Path to `c4workspace.json` configuration file
   - Optional flags:
     - `--workspace-dir` - custom workspace directory (overrides value from c4workspace.json)
     - `--template` - custom template file (default: `workspace.dsl.tpl`)
     - `--output` - custom output file (default: `workspace.dsl`)

2. Configuration Priority:
   ```json
   // c4workspace.json
   {
     "name": "Feature Management System",
     "workspaceDir": "./workspace",  // Default workspace directory
     // ... other configuration
   }
   ```
   - CLI `--workspace-dir` flag has highest priority
   - If not provided, uses `workspaceDir` from c4workspace.json
   - If neither is specified, defaults to `<c4workspace.json-dir>/workspace`

3. Directory Structure:
   ```
   system/
   ├── c4workspace.json  # Contains workspaceDir configuration
   └── workspace/        # Default or configured workspace directory
       ├── workspace.dsl.tpl  # Template file
       └── workspace.dsl      # Generated output
   ```

4. Process:
   - Load and validate c4workspace.json
   - Locate or create workspace directory
   - Verify template file existence
   - Run analyzer to collect data
   - Generate DSL using template
   - Write output file

5. Error Cases:
   - Missing c4workspace.json
   - Invalid configuration
   - Missing template file
   - Template processing errors
   - File system permission issues
