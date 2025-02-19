/**
 * Handles system alerts and notifications
 * @c4Component
 * @c4Group Technical Infrastructure/Alerting
 */
export class AlertService {
    async notify(message: string): Promise<void> {
        console.log(`Alert: ${message}`);
    }
} 