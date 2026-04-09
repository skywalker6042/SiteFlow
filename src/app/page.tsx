import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Home() {
  const session = await auth()
  // Logged-in users go straight to the app
  if (session?.user) redirect('/dashboard')
  // Everyone else lands on pricing
  redirect('/pricing')
}
