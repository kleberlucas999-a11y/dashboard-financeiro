import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Keep-alive endpoint — called by Vercel Cron every 3 days.
 * Makes a lightweight query to prevent Supabase from pausing the project.
 */
export async function GET(request: Request) {
  // Verify this is being called by Vercel Cron (not a random person)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createSupabaseServerClient()
    // Lightweight ping — just checks if the DB is alive
    const { error } = await supabase.from('user_data').select('user_id').limit(1)

    if (error) throw error

    return NextResponse.json({
      ok: true,
      message: 'Supabase keep-alive ping successful',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
