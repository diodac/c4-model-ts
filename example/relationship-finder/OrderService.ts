import { PaymentService } from './PaymentService';
import { InventoryService } from './InventoryService';
import { ShippingService } from './ShippingService';

/**
 * Service managing order processing
 * @c4Component
 * - description: Manages order processing and payment
 * - technology: TypeScript
 * - tags: core, orders
 * @c4Group Business Features/Order Processing
 * 
 * @c4Relationship PaymentService | Processes payments for orders | HTTP/REST
 * - technology: HTTP/REST
 * - tags: DirectRelationship
 * - properties:
 *   criticality: high
 */
export class OrderService {
    constructor(
        private paymentService: PaymentService,
        private inventoryService: InventoryService,
        private shippingService: ShippingService
    ) {}

    async processOrder(orderId: string): Promise<void> {
        // Check inventory first
        await this.inventoryService.checkAvailability(orderId);
        
        // Then process payment
        await this.paymentService.processPayment(orderId);
        
        // Notify shipping
        await this.shippingService.scheduleDelivery(orderId);
    }
} 