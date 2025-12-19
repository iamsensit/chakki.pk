import { Schema, models, model } from 'mongoose'

const UserSchema = new Schema({
	name: String,
	email: { type: String, unique: true, sparse: true },
	image: String,
	role: { type: String, enum: ['USER', 'ADMIN', 'CADMIN'], default: 'USER' },
	passwordHash: { type: String, default: '' },
	emailVerified: { type: Boolean, default: false },
	verificationToken: { type: String, default: '' },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
})

UserSchema.pre('save', function (next) {
	(this as any).updatedAt = new Date()
	next()
})

export default models.User || model('User', UserSchema)
