import { getSession } from '@/lib/session'
import VerifyClient from './verify-client'

export const dynamic = 'force-dynamic'

export default async function VerifyPage() {
  const { token } = await getSession()
  return <VerifyClient token={token} />
}
