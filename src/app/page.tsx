import { redirect } from 'next/navigation'

/**
 * Root "/" redirects to the login page.
 * After login, the server sets the destination (kiosk or dashboard)
 * based on the user's role.
 */
export default function RootPage() {
  redirect('/login')
}
