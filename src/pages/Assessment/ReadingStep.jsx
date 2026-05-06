import { useState } from 'react'
import { useAssessment } from './assessmentContext'
import { getAssessmentContent } from '../../data/assessmentContent'

export default function ReadingStep() {
  const { data, update, goNext, goPrev } = useAssessment()

  // Load reading passages for the selected language
  const content = getAssessmentContent(data.language)
  const QS = content.reading

  const [idx,   setIdx]   = useState(0)
  const [sel,   setSel]   = useState(null)
  const [score, setScore] = useState(0)

  const q      = QS[idx]
  const isLast = idx === QS.length - 1

  function next() {
    const ns = score + (sel === q.c ? 1 : 0)
    if (!isLast) {
      setScore(ns); setIdx(i => i + 1); setSel(null)
    } else {
      update({ readingScore: ns, readingTotal: QS.length }); goNext('reading')
    }
  }

  // Reset quiz state when navigating back so score doesn't carry over
  function handleBack() {
    setIdx(0); setSel(null); setScore(0)
    goPrev('reading')
  }

  return (
    <div className="test-container fade-in" style={{ margin: '2rem auto' }}>
      <div className="test-header">
        <h2>Reading Comprehension</h2>
        <p>Read the following passage in {content.fullName} and answer the question.</p>
      </div>
      <div className="test-content">
        <div style={{ background: 'var(--light)', padding: '2rem', borderRadius: 'var(--border-radius)', marginBottom: '2rem', lineHeight: 1.8 }}>
          <p id="readingText">{q.text}</p>
        </div>
        <div className="test-question" id="readingQuestion">{q.q}</div>
        <div className="test-options" id="readingOptions">
          {q.opts.map((opt, i) => (
            <div key={i} className={`test-option${sel === i ? ' selected' : ''}`} onClick={() => setSel(i)}>
              <div className="option-letter">{String.fromCharCode(65 + i)}</div>
              <div>{opt}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="test-navigation">
        <div className="test-progress-text" id="readingProgress">Question {idx + 1} of {QS.length}</div>
        <div>
          <button className="btn btn-outline" onClick={handleBack} style={{ marginRight: '1rem' }}>
            <i className="fas fa-arrow-left" /> Back
          </button>
          <button className="btn btn-primary" onClick={next} disabled={sel === null}>
            {isLast ? 'See Results' : 'Next Question'} <i className="fas fa-arrow-right" />
          </button>
        </div>
      </div>
    </div>
  )
}
