import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth'

export default async function LoginAliasPage() {
	const session = await auth()
	if (session) redirect('/account')
	redirect('/auth/login')
}

