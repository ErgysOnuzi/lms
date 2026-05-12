import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { QuizData } from '@/types/database'

interface QuizRendererProps {
  lessonId: string
  quizData: QuizData
  studentId: string
  onPassed: () => void
}

export function QuizRenderer({ lessonId, quizData, studentId, onPassed }: QuizRendererProps) {
  const [selected, setSelected] = useState<(number | null)[]>(
    new Array(quizData.questions.length).fill(null)
  )
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  const saveAttempt = useMutation({
    mutationFn: async ({ score, max, passed }: { score: number; max: number; passed: boolean }) => {
      await supabase.from('quiz_attempts').upsert({
        lesson_id: lessonId,
        student_id: studentId,
        score,
        max_score: max,
        passed,
        answers: selected,
        attempted_at: new Date().toISOString(),
      }, { onConflict: 'lesson_id,student_id' })
    },
    onSuccess: (_, { passed }) => { if (passed) setTimeout(onPassed, 1500) },
  })

  function handleSubmit() {
    const correct = quizData.questions.reduce((acc, q, i) => acc + (selected[i] === q.correct_index ? 1 : 0), 0)
    const pct = Math.round((correct / quizData.questions.length) * 100)
    setScore(pct)
    setSubmitted(true)
    saveAttempt.mutate({ score: correct, max: quizData.questions.length, passed: pct >= quizData.passing_score })
  }

  const passed = score >= quizData.passing_score
  const allAnswered = selected.every(s => s !== null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-5 py-4">
        <div>
          <h2 className="font-semibold text-indigo-900">Quiz</h2>
          <p className="text-sm text-indigo-600">{quizData.questions.length} questions · Pass at {quizData.passing_score}%</p>
        </div>
        {submitted && (
          <div className={cn('flex items-center gap-2 rounded-lg px-4 py-2 font-semibold',
            passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          )}>
            {passed ? <Trophy size={18} /> : <XCircle size={18} />}
            {score}%
          </div>
        )}
      </div>

      {quizData.questions.map((q, qi) => {
        const userAnswer = selected[qi]
        return (
          <div key={q.id} className="space-y-3">
            <p className="font-medium text-slate-900">
              <span className="mr-2 text-indigo-600">{qi + 1}.</span>{q.question}
            </p>

            <div className="grid gap-2">
              {q.options.map((option, oi) => {
                const isSelected = userAnswer === oi
                const isCorrect = submitted && oi === q.correct_index
                const isWrong   = submitted && isSelected && oi !== q.correct_index

                return (
                  <button
                    key={oi}
                    disabled={submitted}
                    onClick={() => setSelected(prev => prev.map((v, i) => i === qi ? oi : v))}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                      !submitted && isSelected && 'border-indigo-500 bg-indigo-50 text-indigo-700',
                      !submitted && !isSelected && 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50',
                      isCorrect && 'border-emerald-500 bg-emerald-50 text-emerald-700',
                      isWrong   && 'border-red-500 bg-red-50 text-red-700',
                    )}
                  >
                    {submitted && isCorrect && <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />}
                    {submitted && isWrong   && <XCircle     size={16} className="shrink-0 text-red-600" />}
                    {(!submitted || (!isCorrect && !isWrong)) && (
                      <span className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                        isSelected ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-300 text-slate-500'
                      )}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                    )}
                    {option}
                  </button>
                )
              })}
            </div>

            {submitted && q.explanation && (
              <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
                <strong>Explanation:</strong> {q.explanation}
              </p>
            )}
          </div>
        )
      })}

      {!submitted && (
        <Button onClick={handleSubmit} disabled={!allAnswered} loading={saveAttempt.isPending} className="w-full">
          Submit Quiz
        </Button>
      )}

      {submitted && (
        <div className={cn('rounded-xl p-5 text-center', passed ? 'bg-emerald-50' : 'bg-red-50')}>
          {passed ? (
            <><Trophy size={32} className="mx-auto mb-2 text-emerald-600" />
            <p className="font-semibold text-emerald-700">Passed! Score: {score}%</p>
            <p className="text-sm text-emerald-600">Moving to next lesson…</p></>
          ) : (
            <><XCircle size={32} className="mx-auto mb-2 text-red-500" />
            <p className="font-semibold text-red-700">Score: {score}% — need {quizData.passing_score}% to pass</p>
            <Button variant="outline" className="mt-3" onClick={() => { setSubmitted(false); setSelected(new Array(quizData.questions.length).fill(null)) }}>
              Try Again
            </Button></>
          )}
        </div>
      )}
    </div>
  )
}
