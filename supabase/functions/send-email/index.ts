import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Email notifications are stored in the `notifications` table.
// Supabase Auth handles system emails (welcome, password reset) for free.
// To add real email delivery later, set SMTP_* secrets and uncomment the
// nodemailer block — no third-party paid service required.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type EmailType = 'welcome' | 'grade_posted' | 'deadline_reminder' | 'progress_report'

interface EmailPayload {
  type: EmailType
  user_id: string
  data: Record<string, string>
}

const titles: Record<EmailType, (d: Record<string, string>) => string> = {
  welcome:            d => `Welcome to ${d.org_name ?? 'EduCore'}!`,
  grade_posted:       d => `Grade posted: ${d.assignment_title}`,
  deadline_reminder:  d => `Reminder: ${d.assignment_title} due ${d.due_date}`,
  progress_report:    d => `Your weekly progress report — ${d.completed} lessons done`,
}

const bodies: Record<EmailType, (d: Record<string, string>) => string> = {
  welcome:            d => `Hi ${d.name}, your account is ready. Start learning!`,
  grade_posted:       d => `Your grade for ${d.assignment_title} is ${d.score}/${d.max}. Feedback: ${d.feedback}`,
  deadline_reminder:  d => `${d.assignment_title} is due on ${d.due_date}.`,
  progress_report:    d => `You completed ${d.completed} lessons this week. Keep it up!`,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const payload = await req.json() as EmailPayload
  const { type, user_id, data } = payload

  // Persist as an in-app notification (free — uses your Supabase DB)
  const { error } = await supabase.from('notifications').insert({
    user_id,
    title: titles[type](data),
    body: bodies[type](data),
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
