import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth'
import Dashboard from './Dashboard'

export default async function AccountPage() {
	const session = await auth()
	if (!session) redirect('/auth/login?callbackUrl=/account')
	return (
		<div className="container-pg py-8">
			<div className="mx-auto w-full max-w-6xl">
				<h1 className="text-2xl font-bold text-slate-900 mb-8">My Account</h1>
				<Dashboard />
			</div>
		</div>
	)
}
