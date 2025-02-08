import { PaymentService } from './PaymentService';
import { InventoryService } from './InventoryService';
import { ShippingService } from './ShippingService';

/**
 * Component that manages order processing and orchestrates order flow
 * @c4Component
 * - description: Component that manages order processing
 * - technology: TypeScript
 * - tags: core, order-management
 * - properties:
 *   criticality: high
 *   maintainer: team-core
 * 
 * @c4Relation PaymentService | Processes payments for orders | HTTP/REST
 * - technology: HTTP/REST
 * - tags: DirectRelation
 * - properties:
 *   criticality: high
 *   frequency: high
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