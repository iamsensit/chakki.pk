import { Schema, models, model } from 'mongoose'

const AuditLogSchema = new Schema({
	action: { type: String, required: true }, // e.g., 'ACCOUNT_DELETED'
	userId: { type: String, required: true }, // Original user identifier before deletion
	userEmail: { type: String, required: true }, // Original email before deletion
	anonymizedUserId: { type: String }, // Anonymized ID if data was retained
	details: { type: Schema.Types.Mixed, default: {} }, // Additional context
	ipAddress: { type: String },
	userAgent: { type: String },
	createdAt: { type: Date, default: Date.now },
})

AuditLogSchema.index({ userId: 1, createdAt: -1 })
AuditLogSchema.index({ action: 1, createdAt: -1 })

export default models.AuditLog || model('AuditLog', AuditLogSchema)

