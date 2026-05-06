import { useState } from 'react'
import { useAssessment } from './assessmentContext'

const LANGS = [
  {code:'en',name:'English',    flag:'🇺🇸',learners:'2.5M learners'},
  {code:'es',name:'Spanish',    flag:'🇪🇸',learners:'1.8M learners'},
  {code:'fr',name:'French',     flag:'🇫🇷',learners:'1.2M learners'},
  {code:'de',name:'German',     flag:'🇩🇪',learners:'850K learners'},
  {code:'it',name:'Italian',    flag:'🇮🇹',learners:'650K learners'},
  {code:'pt',name:'Portuguese', flag:'🇵🇹',learners:'500K learners'},
  {code:'ja',name:'Japanese',   flag:'🇯🇵',learners:'400K learners'},
  {code:'ko',name:'Korean',     flag:'🇰🇷',learners:'350K learners'},
  {code:'zh',name:'Chinese',    flag:'🇨🇳',learners:'300K learners'},
  {code:'ar',name:'Arabic',     flag:'🇸🇦',learners:'250K learners'},
  {code:'ru',name:'Russian',    flag:'🇷🇺',learners:'200K learners'},
  {code:'tr',name:'Turkish',    flag:'🇹🇷',learners:'150K learners'},
]

export default function LanguageStep() {
  const { data, update, goNext } = useAssessment()
  const [sel, setSel] = useState(data.language)
  function confirm() {
    if (!sel) { alert('Please select a language first!'); return }
    update({ language: sel }); goNext('language')
  }
  return (
    <div className="test-container fade-in" style={{margin:'2rem auto'}}>
      <div className="test-header">
        <h2>Choose Your Learning Language</h2>
        <p>Select the language you want to master. We'll assess your current level and create a personalized learning plan.</p>
      </div>
      <div className="language-grid">
        {LANGS.map(l => (
          <div key={l.code} className={`language-card${sel===l.code?' selected':''}`} onClick={() => setSel(l.code)}>
            <div className="language-flag">{l.flag}</div>
            <div className="language-name">{l.name}</div>
            <div className="language-learners">{l.learners}</div>
          </div>
        ))}
      </div>
      <div style={{textAlign:'center',marginTop:'2rem'}}>
        <button className="btn btn-primary" style={{padding:'1rem 3rem',fontSize:'1.1rem'}} onClick={confirm}>
          Start Assessment <i className="fas fa-arrow-right"/>
        </button>
      </div>
    </div>
  )
}
