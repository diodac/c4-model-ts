import { RelationshipFinder } from '../../src/container/relationship-finder';
import { ComponentInfo } from '../../src/container/model/component';
import { OrderService } from './OrderService';
import { PaymentService } from './PaymentService';
import { InventoryService } from './InventoryService';
import { ShippingService } from './ShippingService';
import { NotificationService } from './NotificationService';
import * as path from 'path';

const WORKSPACE_ROOT = path.resolve(__dirname);

// Create component infos (normally this would come from ComponentParser)
const components: ComponentInfo[] = [
    {
        metadata: {
            name: "OrderService",
            description: "Manages order processing",
            technology: "TypeScript",
            tags: ["core"]
        },
        location: {
            filePath: path.resolve(WORKSPACE_ROOT, "OrderService.ts"),
            className: "OrderService",
            line: 1
        },
        relationships: [
            {
                metadata: {
                    target: "PaymentService",
                    description: "Processes payments for orders",
                    technology: "HTTP/REST"
                },
                location: {
                    filePath: path.resolve(WORKSPACE_ROOT, "OrderService.ts"),
                    className: "OrderService",
                    line: 8
                },
                sourceComponent: "OrderService"
            }
        ]
    },
    {
        metadata: {
            name: "ShippingService",
            description: "Manages shipping",
            technology: "TypeScript",
            tags: ["core"]
        },
        location: {
            filePath: path.resolve(WORKSPACE_ROOT, "ShippingService.ts"),
            className: "ShippingService",
            line: 1
        },
        relationships: [
            {
                metadata: {
                    target: "NotificationService",
                    description: "Sends delivery notifications",
                    technology: "Message Queue"
                },
                location: {
                    filePath: path.resolve(WORKSPACE_ROOT, "ShippingService.ts"),
                    className: "ShippingService",
                    line: 10
                },
                sourceComponent: "ShippingService"
            }
        ]
    },
    {
        metadata: {
            name: "PaymentService",
            description: "Handles payment processing",
            technology: "TypeScript, Stripe API",
            tags: ["core", "payment"]
        },
        location: {
            filePath: path.resolve(WORKSPACE_ROOT, "PaymentService.ts"),
            className: "PaymentService",
            line: 1
        },
        relationships: []
    },
    {
        metadata: {
            name: "InventoryService",
            description: "Manages product inventory",
            technology: "TypeScript, Redis",
            tags: ["core", "inventory"]
        },
        location: {
            filePath: path.resolve(WORKSPACE_ROOT, "InventoryService.ts"),
            className: "InventoryService",
            line: 1
        },
        relationships: []
    },
    {
        metadata: {
            name: "NotificationService",
            description: "Handles customer notifications",
            technology: "TypeScript, SMTP",
            tags: ["core", "notifications"]
        },
        location: {
            filePath: path.resolve(WORKSPACE_ROOT, "NotificationService.ts"),
            className: "NotificationService",
            line: 1
        },
        relationships: []
    }
];

async function main() {
    const finder = new RelationshipFinder(path.resolve(WORKSPACE_ROOT, "tsconfig.json"));
    
    console.log("All method usages between components:");
    const allUsages = finder.findAllRelationships(components);
    console.log(JSON.stringify(allUsages, null, 2));

    console.log("\nUndeclared relationships (found in code but not in @c4Relationship tags):");
    const undeclaredUsages = finder.findUndeclaredRelationships(components);
    console.log(JSON.stringify(undeclaredUsages, null, 2));
}

main().catch(console.error); 