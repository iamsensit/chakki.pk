import POSRegister from './POSRegister'
import { auth } from '@/app/lib/auth'
import { redirect } from 'next/navigation'

export default async function POSPage() {
  const session = await auth()
  if (!session) redirect('/auth/login')
  // Optional: add role guard here if you have admin roles
  return (
    <div className="container-pg py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">POS Register</h1>
        <p className="text-slate-600">In-store point of sale system</p>
      </div>
      <POSRegister />
    </div>
  )
}


