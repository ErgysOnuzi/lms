import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// AI Study Buddy — keyword-based helper that runs entirely inside the Edge
// Function with zero external API calls.  No API keys, no paid services.
// To upgrade to an LLM later, swap the `answer` block for a fetch() call
// to any free-tier provider (Groq free tier, Ollama self-hosted, etc.).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildAnswer(question: string, context: string): string {
  const q = question.toLowerCase()

  // Greet
  if (/^(hi|hello|hey)/.test(q)) {
    return "Hi! I'm your Study Buddy. Ask me anything about this lesson and I'll do my best to help."
  }

  // Summary request
  if (q.includes('summar') || q.includes('overview') || q.includes('what is this')) {
    const snippet = context.slice(0, 400).replace(/#+/g, '').replace(/\n+/g, ' ').trim()
    return snippet
      ? `Here's a quick overview: ${snippet}…`
      : "I don't have enough lesson content to summarise right now. Try asking a specific question!"
  }

  // Definition / explain
  if (q.includes('what is') || q.includes('define') || q.includes('explain')) {
    const keyword = question.replace(/what is|define|explain/gi, '').trim()
    const idx = context.toLowerCase().indexOf(keyword.toLowerCase())
    if (idx !== -1) {
      const snippet = context.slice(Math.max(0, idx - 50), idx + 300).replace(/\n+/g, ' ').trim()
      return `From the lesson: "…${snippet}…"`
    }
    return `The lesson doesn't explicitly define "${keyword}". Try searching in the module content or ask your instructor.`
  }

  // Encouragement
  if (q.includes('help') || q.includes("don't understand") || q.includes('confused')) {
    return "No worries — learning takes time! Re-read the section slowly, try the quiz, and if you're still stuck post a question in the discussion thread below."
  }

  // Fallback — surface relevant context
  const words = q.split(/\s+/).filter(w => w.length > 3)
  for (const word of words) {
    const idx = context.toLowerCase().indexOf(word)
    if (idx !== -1) {
      const snippet = context.slice(Math.max(0, idx - 30), idx + 250).replace(/\n+/g, ' ').trim()
      return `I found something relevant in the lesson: "…${snippet}…"`
    }
  }

  return "I couldn't find a direct answer in this lesson's content. Try re-reading the material, or post in the discussion thread for instructor help!"
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { question, context } = await req.json() as { question: string; context: string }
  const answer = buildAnswer(question, context ?? '')

  return new Response(JSON.stringify({ answer }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
