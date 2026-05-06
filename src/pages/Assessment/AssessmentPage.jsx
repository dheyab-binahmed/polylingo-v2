import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import AssessmentContext from './assessmentContext'

const STEPS = [
  { path: 'language',      label: 'Language'      },
  { path: 'pronunciation', label: 'Pronunciation' },
  { path: 'speaking',      label: 'Speaking'      },
  { path: 'grammar',       label: 'Grammar'       },
  { path: 'reading',       label: 'Reading'       },
  { path: 'results',       label: 'Results'       },
]

export default function AssessmentPage() {
  const location = useLocation()
  const navigate  = useNavigate()
  const [data, setData] = useState({ language: null, pronunciationScore: 0, fluencyScore: 0, grammarScore: 0, grammarTotal: 5, readingScore: 0, readingTotal: 3 })

  function update(partial) { setData(d => ({ ...d, ...partial })) }
  function goNext(cur) {
    const i = STEPS.findIndex(s => s.path === cur)
    if (i < STEPS.length - 1) navigate(`/assessment/${STEPS[i + 1].path}`)
  }
  function goPrev(cur) {
    const i = STEPS.findIndex(s => s.path === cur)
    if (i > 0) navigate(`/assessment/${STEPS[i - 1].path}`)
  }

  const cur = location.pathname.split('/').pop()
  const curIdx = STEPS.findIndex(s => s.path === cur)
  const progress = curIdx >= 0 ? (curIdx / (STEPS.length - 1)) * 100 : 0

  return (
    <AssessmentContext.Provider value={{ data, update, goNext, goPrev }}>
      <div id="testing-page">
        <div className="onboarding-progress">
          <div className="progress-steps">
            {STEPS.map((step, i) => (
              <div key={step.path} className={`progress-step${i === curIdx ? ' active' : i < curIdx ? ' completed' : ''}`}>
                <div className="step-circle">{i < curIdx ? <i className="fas fa-check" /> : i + 1}</div>
                <span className="step-label">{step.label}</span>
              </div>
            ))}
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <Outlet />
      </div>
    </AssessmentContext.Provider>
  )
}
