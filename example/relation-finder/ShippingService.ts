import { NotificationService } from './NotificationService';

/**
 * Service managing shipping and delivery operations
 * @c4Component
 * - description: Manages order shipping and delivery scheduling
 * - technology: TypeScript, Logistics API
 * - tags: core, shipping
 * - properties:
 *   criticality: medium
 *   maintainer: team-shipping
 * 
 * @c4Relation target | description | technology
 * - technology: Message Queue
 * - tags: DirectRelation
 * - properties:
 *   reliability: high
 */
export class ShippingService {
    constructor(private notificationService: NotificationService) {}

    async scheduleDelivery(orderId: string): Promise<void> {
        // Schedule delivery logic
        await this.notificationService.notifyCustomer(orderId, "Your order has been scheduled for delivery");
    }
} 