import { IntegrationTestResult } from '@qr-menu/shared';

export interface SMSPayload {
  to: string;
  message: string;
}

export class SMSService {
  static async send(
    config: { apiKey?: string; senderId?: string; providerUrl?: string; isEnabled?: boolean } | null,
    payload: SMSPayload
  ): Promise<IntegrationTestResult> {
    if (!config?.isEnabled) {
      return {
        success: false,
        provider: 'SMS',
        message: 'SMS provider integration is disabled in settings.',
        payloadPreview: payload.message,
      };
    }

    // If sandbox / simulated
    if (!config.apiKey || config.apiKey === 'DEMO_KEY') {
      return {
        success: true,
        provider: 'SMS',
        message: `[Sandbox Mode] SMS dispatched to ${payload.to}`,
        payloadPreview: payload.message,
        details: {
          recipient: payload.to,
          mode: 'SANDBOX_EMULATION',
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Live HTTP SMS Gateway call
    try {
      const endpoint = config.providerUrl || 'https://api.sms-gateway.com/v1/send';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: payload.to,
          sender: config.senderId || 'SAPOON',
          message: payload.message,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          provider: 'SMS',
          message: `SMS gateway responded with HTTP ${response.status}`,
          payloadPreview: payload.message,
        };
      }

      return {
        success: true,
        provider: 'SMS',
        message: `SMS successfully sent to ${payload.to}`,
        payloadPreview: payload.message,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'SMS',
        message: err.message || 'SMS dispatch failed',
        payloadPreview: payload.message,
      };
    }
  }
}
