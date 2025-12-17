import bcrypt from 'bcryptjs'

export async function hashPassword(plain: string) {
	const salt = await bcrypt.genSalt(10)
	return bcrypt.hash(plain, salt)
}

export async function verifyPassword(plain: string, hash: string) {
	if (!hash) return false
	return bcrypt.compare(plain, hash)
}

export function generateToken() {
	return (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/\W/g, '')
}

export function generateVerificationCode(length = 6) {
	const chars = '0123456789'
	let code = ''
	if (globalThis.crypto?.getRandomValues) {
		const bytes = new Uint32Array(length)
		globalThis.crypto.getRandomValues(bytes)
		for (let i = 0; i < length; i++) {
			code += chars[bytes[i] % chars.length]
		}
		return code
	}
	// Fallback
	for (let i = 0; i < length; i++) {
		code += chars[Math.floor(Math.random() * chars.length)]
	}
	return code
}
