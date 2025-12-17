import nodemailer from 'nodemailer'

type SendEmailArgs = {
	to: string
	subject: string
	text?: string
	html?: string
}

type SendEmailResult = {
	success: boolean
	messageId?: string
	skipped?: boolean
	error?: string
}

export function renderEmailTemplate(options: {
	title: string
	intro?: string
	body?: string
	code?: string
	ctaLabel?: string
	ctaUrl?: string
	footer?: string
}) {
	const {
		title,
		intro,
		body,
		code,
		ctaLabel,
		ctaUrl,
		footer = 'Thank you for choosing Chakki.'
	} = options

	const ctaBlock = ctaLabel && ctaUrl
		? `<p style="margin:0 0 16px;"><a href="${ctaUrl}" style="display:inline-block;padding:12px 16px;background:#f97316;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">${ctaLabel}</a></p>`
		: ''

	const codeBlock = code
		? `<div style="display:inline-block;padding:12px 16px;border-radius:8px;background:#0f172a;color:#fff;font-size:20px;letter-spacing:3px;font-weight:700;margin:0 0 16px;">${code}</div>`
		: ''

	const introHtml = intro ? `<p style="margin:0 0 12px;">${intro}</p>` : ''
	const bodyHtml = body ? `<p style="margin:0 0 12px;">${body}</p>` : ''

	return `
		<div style="background:#f8fafc;padding:24px 0;font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a;">
			<div style="max-width:540px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
				<div style="background:#0f172a;color:#fff;padding:16px 20px;font-weight:700;font-size:18px;">Chakki</div>
				<div style="padding:20px;">
					<h2 style="margin:0 0 12px;color:#0f172a;">${title}</h2>
					${introHtml}
					${bodyHtml}
					${codeBlock}
					${ctaBlock}
					<p style="margin:16px 0 0;color:#475569;font-size:13px;">${footer}</p>
				</div>
			</div>
		</div>
	`
}

const smtpHost = process.env.SMTP_HOST
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const smtpFrom = process.env.SMTP_FROM || smtpUser

let transporter: nodemailer.Transporter | null = null

async function getTransporter() {
	if (transporter) return transporter
	if (!smtpHost || !smtpPort || !smtpFrom) {
		throw new Error('SMTP configuration is missing (SMTP_HOST, SMTP_PORT, SMTP_FROM)')
	}

	const secure = smtpPort === 465

	// Warn if using test email service
	if (smtpHost.includes('ethereal') || smtpFrom.includes('ethereal')) {
		console.warn('[EMAIL] ⚠️  Using Ethereal Email (test service). Emails will NOT be delivered to real addresses.')
		console.warn('[EMAIL] Configure real SMTP credentials (Gmail, SendGrid, etc.) to send actual emails.')
	}

	transporter = nodemailer.createTransport({
		host: smtpHost,
		port: smtpPort,
		secure,
		auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
		// For non-secure connections (port 587), require TLS
		...(smtpPort === 587 && !secure ? { requireTLS: true } : {})
	})

	return transporter
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
	try {
		// Validate email address
		if (!args.to || !args.to.includes('@')) {
			const msg = 'Invalid email address'
			console.error(msg, args.to)
			return { success: false, error: msg }
		}

		if (!smtpHost || !smtpPort || !smtpFrom) {
			const msg = 'SMTP not configured; skipping email send'
			console.error(msg, { smtpHost: !!smtpHost, smtpPort: !!smtpPort, smtpFrom: !!smtpFrom })
			return { success: false, skipped: true, error: msg }
		}

		const transporter = await getTransporter()
		const mailOptions = {
			from: smtpFrom,
			to: args.to,
			subject: args.subject,
			text: args.text || args.subject,
			html: args.html || args.text || args.subject
		}
		
		console.log('[EMAIL] Attempting to send email:', { to: args.to, subject: args.subject, from: smtpFrom })
		
		const info = await transporter.sendMail(mailOptions)

		console.log('[EMAIL] Email sent successfully', { to: args.to, messageId: info.messageId, response: info.response })
		return { success: true, messageId: info.messageId }
	} catch (error: any) {
		console.error('[EMAIL] Failed to send email', { 
			to: args.to, 
			error: error?.message || 'Unknown error',
			code: error?.code,
			command: error?.command
		})
		return { success: false, error: error?.message || 'Unknown email error' }
	}
}

