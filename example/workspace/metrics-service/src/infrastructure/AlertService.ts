/**
 * Service for sending alerts
 * @c4Component
 * - technology: TypeScript
 * @c4Group Infrastructure
 */
export class AlertService {
    async notify(message: string): Promise<void> {
        console.log(`Alert: ${message}`);
    }
} 