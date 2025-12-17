import POSRegister from './POSRegister'
import { auth } from '@/app/lib/auth'
import { redirect } from 'next/navigation'

export default async function POSPage() {
  const session = await auth()
  if (!session) redirect('/auth/login')
  // Optional: add role guard here if you have admin roles
  return (
    <div className="container-pg py-6">
      <h1 className="text-2xl font-semibold mb-4">POS Register</h1>
      <POSRegister />
    </div>
  )
}


