/**
 * Service Email pour AMS GLA
 * Gestion de l'envoi d'emails via SMTP
 */

import nodemailer from 'nodemailer';
import logger from './logger.js';

/**
 * Crée un transporteur nodemailer configuré
 * @returns {Object} Transporteur nodemailer
 */
export function createTransporter() {
    const config = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        } : undefined
    };

    logger.debug('[EMAIL] Creating transporter', { host: config.host, port: config.port, secure: config.secure });

    return nodemailer.createTransporter(config);
}

/**
 * Envoie un email de confirmation d'alerte
 * @param {string} userEmail - Email du destinataire
 * @param {Object} alert - Objet alerte
 * @param {string} confirmUrl - URL de confirmation
 */
export async function sendAlertConfirmation(userEmail, alert, confirmUrl) {
    if (!process.env.SMTP_HOST) {
        logger.warn('[EMAIL] SMTP not configured, skipping email');
        return { skipped: true, reason: 'SMTP not configured' };
    }

    try {
        const transporter = createTransporter();

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            background: #0a0e1a;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #1a1f2e 0%, #0f1419 100%);
            border: 1px solid rgba(0, 212, 255, 0.2);
            border-radius: 12px;
            padding: 30px;
          }
          h2 {
            color: #00d4ff;
            margin-top: 0;
            font-size: 24px;
          }
          p { 
            color: #e6eef8; 
            line-height: 1.6;
          }
          .alert-details {
            background: rgba(255, 255, 255, 0.03);
            border-left: 4px solid #00d4ff;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .alert-details strong {
            color: #00d4ff;
          }
          .btn {
            display: inline-block;
            padding: 14px 28px;
            background: linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3);
          }
          .footer {
            color: #9aa4b2;
            font-size: 12px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>🔔 Confirmation d'Alerte - AMS GLA</h2>
          <p>Bonjour,</p>
          <p>Vous avez créé une nouvelle alerte de prix pour surveiller <strong>${alert.symbol}</strong>.</p>
          
          <div class="alert-details">
            <p><strong>Symbole :</strong> ${alert.symbol}</p>
            <p><strong>Prix seuil :</strong> $${parseFloat(alert.threshold).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
            <p><strong>Direction :</strong> ${alert.direction === 'above' ? '📈 Au-dessus' : '📉 En-dessous'}</p>
            <p><strong>Méthode :</strong> ${alert.delivery_method || 'email'}</p>
          </div>
          
          <p>Pour activer cette alerte, veuillez cliquer sur le bouton ci-dessous :</p>
          
          <a href="${confirmUrl}" class="btn">✅ Confirmer l'Alerte</a>
          
          <p class="footer">
            Si vous n'avez pas créé cette alerte, vous pouvez ignorer cet email en toute sécurité.
            <br>
            <br>
            © ${new Date().getFullYear()} AMS GLA - Plateforme de Surveillance Crypto
          </p>
        </div>
      </body>
      </html>
    `;

        const result = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"AMS GLA Alerts" <no-reply@ams-gla.com>',
            to: userEmail,
            subject: `🔔 Confirmez votre alerte ${alert.symbol}`,
            html,
            text: `Confirmez votre alerte pour ${alert.symbol}\n\nSeuil: $${alert.threshold}\nDirection: ${alert.direction}\n\nCliquez ici pour confirmer: ${confirmUrl}`
        });

        logger.info('[EMAIL] Alert confirmation sent', { to: userEmail, messageId: result.messageId });
        return { success: true, messageId: result.messageId };

    } catch (error) {
        logger.error('[EMAIL] Failed to send confirmation', { error: error.message, to: userEmail });
        throw error;
    }
}

/**
 * Envoie un email quand une alerte se déclenche
 * @param {string} userEmail - Email du destinataire  
 * @param {Object} alert - Objet alerte
 * @param {number} currentPrice - Prix actuel
 */
export async function sendAlertTriggered(userEmail, alert, currentPrice) {
    if (!process.env.SMTP_HOST) {
        logger.warn('[EMAIL] SMTP not configured, skipping email');
        return { skipped: true, reason: 'SMTP not configured' };
    }

    try {
        const transporter = createTransporter();

        const priceFormatted = parseFloat(currentPrice).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
        const thresholdFormatted = parseFloat(alert.threshold).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
        const emoji = alert.direction === 'above' ? '📈' : '📉';
        const color = alert.direction === 'above' ? '#00ff88' : '#ff4757';

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            background: #0a0e1a;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #1a1f2e 0%, #0f1419 100%);
            border: 2px solid ${color};
            border-radius: 12px;
            padding: 30px;
          }
          h2 {
            color: ${color};
            margin-top: 0;
            font-size: 28px;
          }
          .price-alert {
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid ${color};
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            text-align: center;
          }
          .price {
            font-size: 36px;
            font-weight: 700;
            color: ${color};
            margin: 10px 0;
          }
          .details {
            color: #e6eef8;
            margin: 10px 0;
          }
          .footer {
            color: #9aa4b2;
            font-size: 12px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>${emoji} Alerte Déclenchée !</h2>
          
          <div class="price-alert">
            <p class="details"><strong>${alert.symbol}</strong></p>
            <p class="price">$${priceFormatted}</p>
            <p class="details">
              ${alert.direction === 'above' ? 'a dépassé' : 'est tombé sous'} le seuil de <strong>$${thresholdFormatted}</strong>
            </p>
          </div>
          
          <p style="color: #e6eef8;">
            Votre alerte configurée pour <strong>${alert.symbol}</strong> s'est déclenchée.
            Le prix actuel est maintenant ${alert.direction === 'above' ? 'supérieur' : 'inférieur'} à votre seuil défini.
          </p>
          
          <p class="footer">
            Cette alerte a été automatiquement désactivée. Connectez-vous à votre compte AMS GLA pour en créer une nouvelle.
            <br><br>
            © ${new Date().getFullYear()} AMS GLA - Plateforme de Surveillance Crypto
          </p>
        </div>
      </body>
      </html>
    `;

        const result = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"AMS GLA Alerts" <no-reply@ams-gla.com>',
            to: userEmail,
            subject: `${emoji} ALERTE ${alert.symbol}: $${priceFormatted}`,
            html,
            text: `ALERTE ${alert.symbol}\n\nPrix actuel: $${priceFormatted}\nSeuil: $${thresholdFormatted}\nDirection: ${alert.direction}`
        });

        logger.info('[EMAIL] Alert triggered email sent', { to: userEmail, symbol: alert.symbol, messageId: result.messageId });
        return { success: true, messageId: result.messageId };

    } catch (error) {
        logger.error('[EMAIL] Failed to send triggered alert', { error: error.message, to: userEmail });
        throw error;
    }
}

/**
 * Teste la configuration SMTP
 * @returns {Promise<boolean>} True si la config est valide
 */
export async function testSmtpConfig() {
    if (!process.env.SMTP_HOST) {
        return { success: false, error: 'SMTP_HOST not configured' };
    }

    try {
        const transporter = createTransporter();
        await transporter.verify();
        logger.info('[EMAIL] SMTP configuration verified successfully');
        return { success: true };
    } catch (error) {
        logger.error('[EMAIL] SMTP configuration test failed', { error: error.message });
        return { success: false, error: error.message };
    }
}
