import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SendInvitationEmailParams {
  to: string;
  workspaceName: string;
  inviterName: string;
  inviteLink: string;
  expiresAt: Date;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly serviceId: string | undefined;
  private readonly templateId: string | undefined;
  private readonly publicKey: string | undefined;
  private readonly privateKey: string | undefined;
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    this.serviceId = this.configService.get<string>('EMAILJS_SERVICE_ID');
    this.templateId = this.configService.get<string>('EMAILJS_TEMPLATE_ID');
    this.publicKey = this.configService.get<string>('EMAILJS_PUBLIC_KEY');
    this.privateKey = this.configService.get<string>('EMAILJS_PRIVATE_KEY');

    this.isConfigured = !!(
      this.serviceId &&
      this.templateId &&
      this.publicKey
    );

    if (!this.isConfigured) {
      this.logger.warn(
        'EmailJS configuration incomplete. Email sending will be disabled.',
      );
    } else {
      this.logger.log('EmailJS configured successfully');
    }
  }

  async sendInvitationEmail(
    params: SendInvitationEmailParams,
  ): Promise<boolean> {
    const { to, workspaceName, inviterName, inviteLink, expiresAt } = params;

    if (!this.isConfigured) {
      this.logger.warn(
        `Email not sent to ${to}: EmailJS not configured. Invitation link: ${inviteLink}`,
      );
      return false;
    }

    const expiresFormatted = expiresAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // EmailJS template parameters
    // These should match the variables in your EmailJS template
    const templateParams = {
      to_email: to,
      to_name: to.split('@')[0], // Use email prefix as name
      workspace_name: workspaceName,
      inviter_name: inviterName,
      invite_link: inviteLink,
      expires_date: expiresFormatted,
    };

    try {
      // For server-side usage, EmailJS requires private key authentication
      // The private key should be passed in the Authorization header or as accessToken
      const payload: Record<string, unknown> = {
        service_id: this.serviceId,
        template_id: this.templateId,
        user_id: this.publicKey,
        template_params: templateParams,
      };

      // Add private key if available (required for server-side requests without origin)
      if (this.privateKey) {
        payload.accessToken = this.privateKey;
      }

      this.logger.debug(
        `Sending email with service_id: ${this.serviceId}, template_id: ${this.templateId}`,
      );

      const response = await axios.post(
        'https://api.emailjs.com/api/v1.0/email/send',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            origin: 'http://localhost', // EmailJS requires an origin header for CORS
          },
        },
      );

      if (response.status === 200) {
        this.logger.log(`Invitation email sent to ${to}`);
        return true;
      } else {
        this.logger.error(
          `Failed to send invitation email to ${to}: Status ${response.status}`,
        );
        return false;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send invitation email to ${to}: ${message}`);

      // Log more details for debugging
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `EmailJS response: ${JSON.stringify(error.response.data)}`,
        );
        this.logger.error(`EmailJS status: ${error.response.status}`);
      }

      // Log the invite link so admin can manually share it
      this.logger.log(`Manual invitation link for ${to}: ${inviteLink}`);
      return false;
    }
  }
}
