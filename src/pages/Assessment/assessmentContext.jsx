/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'

const AssessmentContext = createContext(null)

export const useAssessment = () => {
  const ctx = useContext(AssessmentContext)
  if (!ctx) {
    throw new Error('useAssessment must be used within AssessmentProvider')
  }
  return ctx
}

export default AssessmentContext
