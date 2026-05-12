import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'

interface Message { role: 'user' | 'assistant'; content: string }

export function AIAssistant({ lessonContent }: { lessonContent: string }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { question: text, context: lessonContent.slice(0, 2000) },
      })
      if (error) throw error
      const answer = (data as { answer: string }).answer
      setMessages(prev => [...prev, { role: 'assistant', content: answer }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Try again in a moment.",
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200',
          open ? 'bg-slate-700 hover:bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-700',
        )}
      >
        {open ? <ChevronDown size={17} /> : <Sparkles size={17} />}
        {!open && <span className="hidden sm:block">Study Buddy</span>}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-40 flex flex-col w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">

          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3">
            <div className="flex items-center gap-2 text-white">
              <Sparkles size={18} />
              <span className="font-semibold text-sm">AI Study Buddy</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium">Beta</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-indigo-200 hover:bg-white/20 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-72 bg-slate-50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                  <Sparkles size={22} className="text-indigo-600" />
                </div>
                <p className="text-sm font-medium text-slate-700">Ask me about this lesson</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {['Summarise this', 'I\'m confused', 'Give an example'].map(s => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus() }}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-white text-slate-800 rounded-bl-sm shadow-sm border border-slate-100',
                )}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm border border-slate-100">
                  <div className="flex gap-1.5 items-center">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 border-t border-slate-100 bg-white p-3">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask a question…"
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
