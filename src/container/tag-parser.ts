import { JSDocTag } from 'ts-morph';

/**
 * Type of tag argument or parameter
 */
export type TagValueType = 'string' | 'list' | 'dict';

/**
 * Schema for a tag
 */
export interface TagSchema {
    /** Types of arguments in order of appearance */
    args: (TagValueType | `?${TagValueType}`)[];
    /** Types of parameters by name */
    params: Record<string, TagValueType>;
}

/**
 * Result of parsing a JSDoc tag
 */
export interface ParsedTag {
    /** Arguments from the first line after tag name */
    args: string[];
    /** Parameters from subsequent lines */
    params: Record<string, string | string[] | Record<string, string>>;
}

/**
 * Parser for JSDoc tags in format:
 * @tag arg1 | arg2 | arg3
 * - param1: value1
 * - param2: """
 *   multiline
 *   value2
 *   """
 * - param3:
 *   key1: value1
 *   key2: value2
 */
export class TagParser {
    /**
     * Parse JSDoc tag content according to schema
     */
    parse(tag: JSDocTag, schema: TagSchema): ParsedTag {
        this.validateSchema(schema);

        const comment = tag.getComment()?.toString() || '';
        const lines = comment.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        if (lines.length === 0) {
            return { args: [], params: {} };
        }

        // Find first line that starts with a parameter
        const paramStartIndex = lines.findIndex(line => line.startsWith('-'));
        const argsLines = paramStartIndex === -1 ? lines : lines.slice(0, paramStartIndex);
        const paramLines = paramStartIndex === -1 ? [] : lines.slice(paramStartIndex);

        // Parse arguments from first non-parameter lines
        const args = this.parseArgs(argsLines.join(' '), schema);
        this.validateArgs(args, schema);
        
        // Parse parameters from subsequent lines
        const params: Record<string, string | string[] | Record<string, string>> = {};
        let currentParam = '';
        let multilineValue: string[] = [];
        let inMultiline = false;
        let inDict = false;
        let currentDict: Record<string, string> = {};

        for (const line of paramLines) {
            if (inMultiline) {
                if (line.includes('"""')) {
                    inMultiline = false;
                    params[currentParam] = this.convertParamValue(currentParam, multilineValue.join('\n'), schema);
                    multilineValue = [];
                } else {
                    multilineValue.push(line);
                }
                continue;
            }

            if (inDict) {
                if (!line.startsWith('-') && line.includes(':')) {
                    const [key, ...valueParts] = line.split(':');
                    currentDict[key.trim()] = valueParts.join(':').trim();
                    continue;
                } else {
                    inDict = false;
                    params[currentParam] = currentDict;
                    currentDict = {};
                }
            }

            if (!line.startsWith('-')) continue;

            const [paramName, ...valueParts] = line.substring(1).split(':');
            const value = valueParts.join(':').trim();
            const name = paramName.trim();

            if (value.startsWith('"""')) {
                inMultiline = true;
                currentParam = name;
                multilineValue = [value.substring(3).trim()];
            } else if (!value) {
                inDict = true;
                currentParam = name;
                currentDict = {};
            } else {
                params[name] = this.convertParamValue(name, value, schema);
            }
        }

        // Handle case when dict is last parameter
        if (inDict && Object.keys(currentDict).length > 0) {
            params[currentParam] = currentDict;
        }

        this.validateParams(params, schema);
        return { args, params };
    }

    /**
     * Parse arguments from the first line
     * Format: 
     * - With separator: arg1 | arg2 | arg3
     * - Without separator: arg1
     */
    private parseArgs(line: string, schema: TagSchema): string[] {
        // If line contains pipe separator, split by it
        if (line.includes('|')) {
            return line.split('|').map(arg => arg.trim());
        }
        
        // If no separator and schema expects only one argument, use whole line
        if (schema.args.length === 1) {
            const trimmed = line.trim();
            return trimmed ? [trimmed] : [];
        }

        // Otherwise, return empty array
        return [];
    }

    /**
     * Convert parameter value according to its schema type
     */
    private convertParamValue(
        paramName: string, 
        value: string, 
        schema: TagSchema
    ): string | string[] | Record<string, string> {
        const type = schema.params[paramName];
        if (type === 'list') {
            return value.split(',').map(v => v.trim());
        }
        return value;
    }

    /**
     * Validate schema structure
     */
    private validateSchema(schema: TagSchema): void {
        let foundOptional = false;
        
        for (const type of schema.args) {
            const isOptional = type.startsWith('?');
            
            if (foundOptional && !isOptional) {
                throw new Error('Required arguments cannot follow optional arguments');
            }
            
            if (isOptional) {
                foundOptional = true;
            }
        }
    }

    /**
     * Validate arguments against schema
     */
    private validateArgs(args: string[], schema: TagSchema): void {
        for (let i = 0; i < schema.args.length; i++) {
            const type = schema.args[i];
            const value = args[i];

            if (!type) continue;

            const isOptional = type.startsWith('?');
            if (!value && !isOptional) {
                throw new Error(`Missing required argument at position ${i}`);
            }
        }

        if (args.length > schema.args.length) {
            throw new Error(`Too many arguments. Expected ${schema.args.length}, got ${args.length}`);
        }
    }

    /**
     * Validate parameters against schema
     */
    private validateParams(
        params: Record<string, string | string[] | Record<string, string>>, 
        schema: TagSchema
    ): void {
        // Check for unknown parameters
        for (const name of Object.keys(params)) {
            if (!schema.params[name]) {
                throw new Error(`Unknown parameter: ${name}`);
            }
        }
    }
} 