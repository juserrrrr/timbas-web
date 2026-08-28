import { getSession } from '@/lib/session'
import ClashScoutClient from './clash-client'

export const dynamic = 'force-dynamic'

export default async function ClashPage() {
  const { token } = await getSession()
  return <ClashScoutClient token={token} />
}
