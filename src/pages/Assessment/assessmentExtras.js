// Shared helpers for the assessment flow: background prefetch of the next step,
// localized instructions, and a persisted attempt history.
import { apiFetch } from "../../services/api";

// ── 1. Prefetch cache ─────────────────────────────────────────────────────────
// Module-level cache of in-flight / resolved content fetches, keyed by
// step+language+level. A step kicks off the next step's fetch in the background;
// the next step consumes it on mount instead of showing a spinner.
const _cache = new Map();
const key = (step, lang, level) => `${step}|${lang || ""}|${level || ""}`;

export function contentUrl(step, lang, level) {
  return `/assessment/content?step_type=${step}&language=${lang || "en"}${level ? `&level=${level}` : ""}`;
}

// Begin fetching a step's content in the background (idempotent).
export function prefetchStep(step, lang, level) {
  const k = key(step, lang, level);
  if (_cache.has(k)) return _cache.get(k);
  const p = apiFetch(contentUrl(step, lang, level)).catch((e) => {
    _cache.delete(k); // allow a real retry by the step itself
    throw e;
  });
  _cache.set(k, p);
  return p;
}

// Consume a prefetched promise if one exists (returns null otherwise).
export function takePrefetched(step, lang, level) {
  const k = key(step, lang, level);
  const p = _cache.get(k);
  if (p) _cache.delete(k);
  return p || null;
}

export function clearPrefetch() {
  _cache.clear();
}

// ── 2. Localized assessment instructions ───────────────────────────────────────
// Per-language UI strings for the assessment chrome. Lower levels get the
// learner's interface language (English) plus the target; from B2 up the target
// language carries the instruction. Falls back to English for any missing key.
const STRINGS = {
  en: {
    readingTitle: "Reading Comprehension", readingHint: "Read the passage and answer the questions.",
    listeningTitle: "Listening Comprehension", listeningHint: "Listen to the conversation and answer the questions.",
    writingTitle: "Writing", writingHint: "Write your response to the prompt below.",
    speakingTitle: "Speaking", speakingHint: "Answer the examiner out loud.",
    next: "Next Question", back: "Back", results: "See Results", question: "Question",
  },
  es: {
    readingTitle: "Comprensión de lectura", readingHint: "Lee el texto y responde las preguntas.",
    listeningTitle: "Comprensión auditiva", listeningHint: "Escucha la conversación y responde las preguntas.",
    writingTitle: "Expresión escrita", writingHint: "Escribe tu respuesta a la consigna.",
    speakingTitle: "Expresión oral", speakingHint: "Responde al examinador en voz alta.",
    next: "Siguiente", back: "Atrás", results: "Ver resultados", question: "Pregunta",
  },
  fr: {
    readingTitle: "Compréhension écrite", readingHint: "Lisez le texte et répondez aux questions.",
    listeningTitle: "Compréhension orale", listeningHint: "Écoutez la conversation et répondez aux questions.",
    writingTitle: "Expression écrite", writingHint: "Rédigez votre réponse à la consigne.",
    speakingTitle: "Expression orale", speakingHint: "Répondez à l'examinateur à voix haute.",
    next: "Question suivante", back: "Retour", results: "Voir les résultats", question: "Question",
  },
  de: {
    readingTitle: "Leseverstehen", readingHint: "Lies den Text und beantworte die Fragen.",
    listeningTitle: "Hörverstehen", listeningHint: "Höre das Gespräch und beantworte die Fragen.",
    writingTitle: "Schreiben", writingHint: "Schreibe deine Antwort auf die Aufgabe.",
    speakingTitle: "Sprechen", speakingHint: "Antworte dem Prüfer laut.",
    next: "Nächste Frage", back: "Zurück", results: "Ergebnisse ansehen", question: "Frage",
  },
  it: {
    readingTitle: "Comprensione scritta", readingHint: "Leggi il testo e rispondi alle domande.",
    listeningTitle: "Comprensione orale", listeningHint: "Ascolta la conversazione e rispondi alle domande.",
    writingTitle: "Produzione scritta", writingHint: "Scrivi la tua risposta alla consegna.",
    speakingTitle: "Produzione orale", speakingHint: "Rispondi all'esaminatore ad alta voce.",
    next: "Domanda successiva", back: "Indietro", results: "Vedi risultati", question: "Domanda",
  },
  pt: {
    readingTitle: "Compreensão de leitura", readingHint: "Leia o texto e responda às perguntas.",
    listeningTitle: "Compreensão auditiva", listeningHint: "Ouça a conversa e responda às perguntas.",
    writingTitle: "Produção escrita", writingHint: "Escreva sua resposta ao tema.",
    speakingTitle: "Produção oral", speakingHint: "Responda ao examinador em voz alta.",
    next: "Próxima pergunta", back: "Voltar", results: "Ver resultados", question: "Pergunta",
  },
};

const FULL_TARGET_LEVELS = new Set(["B2", "C1", "C2"]);

// Returns a string accessor for the assessment chrome. At lower levels the
// English label is shown with the target translation in parentheses; at B2+ the
// target-language label is primary.
export function makeT(language, level) {
  const lang = (language || "en").split("-")[0].toLowerCase();
  const tgt = STRINGS[lang];
  const en = STRINGS.en;
  const fullTarget = FULL_TARGET_LEVELS.has((level || "").toUpperCase());
  return (k) => {
    const e = en[k] || k;
    if (!tgt || lang === "en") return e;
    const t = tgt[k] || e;
    if (fullTarget) return t;          // immersive: target only
    return t === e ? e : `${e} (${t})`; // supportive: English (target)
  };
}

// ── 3. Attempt history (persisted) ─────────────────────────────────────────────
const HIST_KEY = "polylingo_assessment_history";

export function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HIST_KEY)) || []; }
  catch { return []; }
}

export function recordAttempt(attempt) {
  try {
    const hist = loadHistory();
    hist.push({ ...attempt, at: attempt.at || new Date().toISOString() });
    // keep last 50 attempts
    localStorage.setItem(HIST_KEY, JSON.stringify(hist.slice(-50)));
    return hist;
  } catch { return loadHistory(); }
}
