// src/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class MailService {
  private readonly log: Logger;
  private readonly from: string;
  private readonly fromFormatted: string;
  private readonly enabled: boolean;
  private readonly resend: Resend | null;

  constructor(private readonly cfg: ConfigService) {
    this.log = new Logger(MailService.name);
    const resendApiKey = this.cfg.get<string>('RESEND_API_KEY');
    const sendgridApiKey = this.cfg.get<string>('SENDGRID_API_KEY');
    const emailFrom = this.cfg.get<string>('EMAIL_FROM');
    
    this.log.log(`Email configuration - RESEND_API_KEY: ${resendApiKey ? 'SET' : 'NOT SET'}`);
    this.log.log(`Email configuration - SENDGRID_API_KEY: ${sendgridApiKey ? 'SET' : 'NOT SET'}`);
    this.log.log(`Email configuration - EMAIL_FROM: ${emailFrom || 'NOT SET'}`);
    
    this.enabled = Boolean(resendApiKey || sendgridApiKey);
    
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.log.log('Resend email service enabled');
    } else if (sendgridApiKey) {
      this.resend = null;
      sgMail.setApiKey(sendgridApiKey);
      this.log.log('SendGrid email service enabled');
    } else {
      this.resend = null;
      this.log.warn('No email API key configured – MailService disabled');
    }

    this.from = emailFrom ?? 'noreply@earningsquake.com';
    this.log.log(`Final from address: ${this.from}`);
    
    // Format from address with display name for SendGrid
    this.fromFormatted = `EarningsQuake <${this.from}>`;
    this.log.log(`Formatted from address: ${this.fromFormatted}`);
  }

  async sendVerificationEmail(to: string, code: string) {
    if (!this.enabled) {
      this.log.warn('Email service disabled - verification code:', code);
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your EarningsQuake account</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
            background-color: #f8f9fa;
          }
          .container { 
            background: white; 
            padding: 40px; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px;
          }
          .logo { 
            font-size: 24px; 
            font-weight: bold; 
            color: #2563eb; 
            margin-bottom: 10px;
          }
          .code { 
            background: #f1f5f9; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px; 
            margin: 30px 0;
            font-family: 'Courier New', monospace;
          }
          .code-number { 
            font-size: 32px; 
            font-weight: bold; 
            color: #2563eb; 
            letter-spacing: 8px;
          }
          .expiry { 
            color: #64748b; 
            font-size: 14px; 
            text-align: center;
            margin-top: 20px;
          }
          .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #e2e8f0; 
            text-align: center; 
            color: #64748b; 
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">EarningsQuake</div>
            <h1>Verify your account</h1>
          </div>
          
          <p>Hi there! 👋</p>
          <p>Thanks for signing up for EarningsQuake. To complete your registration, please enter the verification code below:</p>
          
          <div class="code">
            <div class="code-number">${code}</div>
          </div>
          
          <p>This code will expire in <strong>10 minutes</strong> for security reasons.</p>
          
          <div class="expiry">
            ⏰ Code expires in 10 minutes
          </div>
          
          <div class="footer">
            <p>If you didn't create an account with EarningsQuake, you can safely ignore this email.</p>
            <p>© 2025 EarningsQuake. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      if (this.resend) {
        await this.resend.emails.send({
          from: this.fromFormatted,
          to: [to],
          subject: 'Verify your EarningsQuake account',
          html: html,
        });
        this.log.log(`Verification email sent to ${to}`);
      } else {
        // Use SendGrid if Resend is not available
        this.log.log(`Attempting to send verification email via SendGrid - From: ${this.fromFormatted}, To: ${to}`);
        await sgMail.send({
          from: this.fromFormatted,
          to: to,
          subject: 'Verify your EarningsQuake account',
          html: html,
        });
        this.log.log(`Verification email sent to ${to} via SendGrid`);
      }
    } catch (err) {
      this.log.error('Verification email failed', err);
      this.log.error('Full verification error details:', JSON.stringify(err, null, 2));
      // Re-throw error so auth service can handle it and return dev code
      throw err;
    }
  }

  async sendPasswordResetEmail(to: string, code: string) {
    if (!this.enabled) {
      this.log.warn('Email service disabled - reset code:', code);
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your EarningsQuake password</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
            background-color: #f8f9fa;
          }
          .container { 
            background: white; 
            padding: 40px; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px;
          }
          .logo { 
            font-size: 24px; 
            font-weight: bold; 
            color: #dc2626; 
            margin-bottom: 10px;
          }
          .code { 
            background: #fef2f2; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px; 
            margin: 30px 0;
            font-family: 'Courier New', monospace;
          }
          .code-number { 
            font-size: 32px; 
            font-weight: bold; 
            color: #dc2626; 
            letter-spacing: 8px;
          }
          .expiry { 
            color: #64748b; 
            font-size: 14px; 
            text-align: center;
            margin-top: 20px;
          }
          .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #e2e8f0; 
            text-align: center; 
            color: #64748b; 
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">EarningsQuake</div>
            <h1>Reset your password</h1>
          </div>
          
          <p>You requested a password reset for your EarningsQuake account.</p>
          <p>Please enter the reset code below to create a new password:</p>
          
          <div class="code">
            <div class="code-number">${code}</div>
          </div>
          
          <p>This code will expire in <strong>10 minutes</strong> for security reasons.</p>
          
          <div class="expiry">
            ⏰ Code expires in 10 minutes
          </div>
          
          <div class="footer">
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
            <p>© 2025 EarningsQuake. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      if (this.resend) {
        await this.resend.emails.send({
          from: this.fromFormatted,
          to: [to],
          subject: 'Reset your EarningsQuake password',
          html: html,
        });
        this.log.log(`Password reset email sent to ${to}`);
      } else {
        // Use SendGrid if Resend is not available
        this.log.log(`Attempting to send email via SendGrid - From: ${this.fromFormatted}, To: ${to}`);
        await sgMail.send({
          from: this.fromFormatted,
          to: to,
          subject: 'Reset your EarningsQuake password',
          html: html,
        });
        this.log.log(`Password reset email sent to ${to} via SendGrid`);
      }
    } catch (err) {
      this.log.error('Reset email failed', err);
      this.log.error('Full error details:', JSON.stringify(err, null, 2));
      // Don't throw error to avoid breaking the reset flow
    }
  }
}
