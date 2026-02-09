import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

@Injectable()
export class TwilioVoiceService {
  private readonly logger = new Logger(TwilioVoiceService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generate a Twilio Voice access token for browser-based calling
   */
  generateAccessToken(
    identity: string,
    accountSid: string,
    apiKey: string,
    apiSecret: string,
    twimlAppSid: string,
  ): string {
    this.logger.log(`========== GENERATING VOICE TOKEN ==========`);
    this.logger.log(`Identity: ${identity}`);
    this.logger.log(`Account SID: ${accountSid}`);
    this.logger.log(`API Key: ${apiKey}`);
    this.logger.log(`TwiML App SID: ${twimlAppSid}`);

    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
      throw new Error('Twilio voice credentials not configured');
    }

    // Create an access token
    const token = new AccessToken(accountSid, apiKey, apiSecret, {
      identity,
      ttl: 3600, // 1 hour
    });

    // Create a Voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    });

    // Add the grant to the token
    token.addGrant(voiceGrant);

    this.logger.log(`✅ Voice token generated successfully`);
    this.logger.log(`Token will route calls to TwiML App: ${twimlAppSid}`);
    this.logger.log(`========== VOICE TOKEN GENERATION COMPLETE ==========`);

    return token.toJwt();
  }

  /**
   * Generate TwiML for outgoing calls
   */
  generateOutgoingCallTwiML(to: string, from: string, callerId?: string): string {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    const dial = response.dial({
      callerId: callerId || from,
      answerOnBridge: true,
      record: 'record-from-answer-dual',
      recordingStatusCallback: `${this.configService.get<string>('API_URL')}/api/webhooks/twilio/recording-status`,
    });

    dial.number(to);

    return response.toString();
  }

  /**
   * Generate TwiML for incoming calls
   */
  generateIncomingCallTwiML(): string {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    response.say('Incoming call. Please wait while we connect you.');

    // You can add more logic here for routing incoming calls
    // For now, we'll just play a message
    response.pause({ length: 1 });

    return response.toString();
  }
}
