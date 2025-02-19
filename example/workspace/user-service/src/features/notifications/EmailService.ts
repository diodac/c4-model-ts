/**
 * @c4Component
 * - description: Handles email notifications
 * - technology: TypeScript
 * @c4Group Business Features/Notification Services
 */
export class EmailService {
    constructor() {}

    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        // Implementation
    }

    async sendTemplatedEmail(to: string, template: string, data: any): Promise<void> {
        // Implementation
    }
} 