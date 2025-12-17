import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth'
import Dashboard from './Dashboard'

export default async function AccountPage() {
	const session = await auth()
	if (!session) redirect('/auth/login')
	return (
		<div className="container-pg py-8">
			<div className="mx-auto w-full max-w-6xl">
				<h1 className="text-2xl font-semibold">My Account</h1>
				<div className="mt-6">
					<Dashboard />
				</div>
			</div>
		</div>
	)
}
