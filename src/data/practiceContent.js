// ─────────────────────────────────────────────────────────────────────────────
// PRACTICE CONTENT PER LANGUAGE
// BACKEND INTEGRATION: Replace each section with API calls:
//   GET /api/practice/flashcards?language=fr
//   GET /api/practice/grammar?language=fr
//   GET /api/practice/reading?language=fr
//   GET /api/practice/speaking/phrases?language=fr
//   GET /api/practice/listening?language=fr
// ─────────────────────────────────────────────────────────────────────────────

const CONTENT = {

  // ── ENGLISH ───────────────────────────────────────────────────────────────
  English: {
    ttsLang: 'en-US',
    flashcards: [
      { word: 'Perseverance',   translation: 'Continued effort despite difficulty', example: 'Her perseverance paid off in the end.' },
      { word: 'Eloquent',       translation: 'Fluent and persuasive in speaking',   example: 'He gave an eloquent speech.' },
      { word: 'Ambiguous',      translation: 'Open to more than one interpretation', example: 'The instructions were ambiguous.' },
      { word: 'Diligent',       translation: 'Having or showing care in work',       example: 'She is a diligent student.' },
      { word: 'Empathy',        translation: 'The ability to understand others\' feelings', example: 'Good leaders show empathy.' },
      { word: 'Pragmatic',      translation: 'Dealing with things sensibly',         example: 'We need a pragmatic solution.' },
      { word: 'Meticulous',     translation: 'Showing great attention to detail',    example: 'He was meticulous in his research.' },
      { word: 'Innovative',     translation: 'Introducing new ideas or methods',     example: 'The company is known for innovative design.' },
      { word: 'Resilient',      translation: 'Able to recover quickly from difficulties', example: 'Children are remarkably resilient.' },
      { word: 'Articulate',     translation: 'Able to express ideas clearly',        example: 'She is very articulate in meetings.' },
    ],
    grammar: [
      {
        title: 'Exercise 1: Present Perfect vs Simple Past',
        question: 'Choose the correct tense:',
        sentence: 'I ________ to Paris three times in my life.',
        options: ['A. went', 'B. have been', 'C. was', 'D. had gone'],
        correct: 1,
        explanation: '"Have been" is correct because we use present perfect for experiences without a specific past time.',
      },
      {
        title: 'Exercise 2: Conditional Sentences',
        question: 'Select the correct conditional form:',
        sentence: 'If it ________ tomorrow, we will cancel the trip.',
        options: ['A. rains', 'B. will rain', 'C. rained', 'D. would rain'],
        correct: 0,
        explanation: '"Rains" is correct. In first conditional, we use simple present in the if-clause.',
      },
      {
        title: 'Exercise 3: Passive Voice',
        question: 'Transform to passive voice:',
        sentence: 'The manager ________ the report by Friday.',
        options: ['A. will submit', 'B. submits', 'C. will be submitted', 'D. has submitted'],
        correct: 2,
        explanation: '"Will be submitted" is the correct passive form for a future action.',
      },
      {
        title: 'Exercise 4: Articles',
        question: 'Choose the correct article:',
        sentence: 'She plays ________ violin in the orchestra.',
        options: ['A. a', 'B. an', 'C. the', 'D. no article'],
        correct: 2,
        explanation: 'We use "the" with musical instruments when referring to playing them.',
      },
    ],
    reading: {
      title: 'The Power of Habit',
      passage: [
        'Habits are the foundation of our daily lives. Scientists estimate that about 40% of our daily actions are not conscious decisions but habits. Understanding how habits work can help us build better ones and break unwanted patterns.',
        'A habit is formed through a three-step loop: a cue, a routine, and a reward. The cue triggers the brain to go into automatic mode. The routine is the physical, mental, or emotional action. The reward helps the brain remember the loop for future use.',
        'Research shows that it takes an average of 66 days to form a new habit, not the commonly cited 21 days. The key to changing habits is not willpower alone but changing the environment and the cues that trigger unwanted routines.',
        'Successful people often use "habit stacking" — linking a new habit to an existing one. For example, "After I pour my morning coffee, I will read for ten minutes." This technique uses existing habits as cues for new ones.',
      ],
      vocab: [
        ['Foundation', 'The basis on which something is built'],
        ['Conscious', 'Being aware of and responding to one\'s surroundings'],
        ['Routine', 'A sequence of actions regularly followed'],
        ['Trigger', 'Something that causes a process to begin'],
        ['Willpower', 'Self-control and determination'],
      ],
      questions: [
        {
          q: '1. What percentage of daily actions are habits according to scientists?',
          options: ['A. 20%', 'B. 30%', 'C. 40%', 'D. 50%'],
          correct: 2,
        },
        {
          q: '2. How many days does research say it takes to form a new habit?',
          options: ['A. 21 days', 'B. 30 days', 'C. 66 days', 'D. 90 days'],
          correct: 2,
        },
        {
          q: '3. What is "habit stacking"?',
          options: [
            'A. Breaking multiple habits at once',
            'B. Linking a new habit to an existing one',
            'C. Doing habits in the morning',
            'D. Recording your habits in a journal',
          ],
          correct: 1,
        },
      ],
    },
    speakingPhrases: [
      { id: 1, text: '"Could you please repeat that more slowly?"',         durationSec: 4 },
      { id: 2, text: '"I would like to make a reservation for two."',       durationSec: 4 },
      { id: 3, text: '"Excuse me, where is the nearest train station?"',    durationSec: 4 },
      { id: 4, text: '"I\'m not sure I understand — could you clarify?"',   durationSec: 5 },
      { id: 5, text: '"What time does the museum open on weekends?"',        durationSec: 4 },
    ],
    listening: {
      question: 'What is the main purpose of the conversation?',
      hint: 'Listen carefully to what the speakers are arranging',
      transcript: [
        { speaker: 'Person A', line: "Hi Sarah! Are you free this Saturday? I was thinking we could go to that new art exhibition downtown." },
        { speaker: 'Person B', line: "Saturday morning works for me! What time were you thinking?" },
        { speaker: 'Person A', line: "The exhibition opens at 10. We could meet at the café on Oak Street at 9:30 for coffee first." },
        { speaker: 'Person B', line: "Perfect! I'll book us tickets online so we don't have to queue." },
      ],
      options: ['To cancel a weekend plan', 'To arrange a visit to an art exhibition', 'To book a restaurant', 'To discuss a work project'],
      correct: 1,
    },
  },

  // ── FRENCH ────────────────────────────────────────────────────────────────
  French: {
    ttsLang: 'fr-FR',
    flashcards: [
      { word: 'Bonjour',              translation: 'Hello / Good morning',           example: 'Bonjour, comment allez-vous?' },
      { word: 'Merci beaucoup',       translation: 'Thank you very much',            example: 'Merci beaucoup pour votre aide!' },
      { word: 'Au revoir',            translation: 'Goodbye',                        example: 'Au revoir, à demain!' },
      { word: "S'il vous plaît",      translation: 'Please',                         example: "Un café, s'il vous plaît." },
      { word: 'Excusez-moi',          translation: 'Excuse me',                      example: 'Excusez-moi, où est la gare?' },
      { word: 'Comment allez-vous?',  translation: 'How are you? (formal)',          example: 'Bonjour, comment allez-vous?' },
      { word: "Je m'appelle",         translation: 'My name is',                    example: "Je m'appelle Marie." },
      { word: 'Où est…?',            translation: 'Where is…?',                    example: 'Où est la bibliothèque?' },
      { word: 'Je voudrais',          translation: 'I would like',                   example: 'Je voudrais un verre d\'eau.' },
      { word: 'Parlez-vous anglais?', translation: 'Do you speak English?',          example: "Parlez-vous anglais? Je ne parle pas bien français." },
    ],
    grammar: [
      {
        title: 'Exercise 1: Verb Conjugation — aller',
        question: 'Complete the sentence with the correct form of "aller" (to go):',
        sentence: 'Nous ________ au marché tous les samedis.',
        options: ['A. vais', 'B. vas', 'C. allons', 'D. allez'],
        correct: 2,
        explanation: '"Nous allons" is the correct conjugation of "aller" for "nous".',
      },
      {
        title: 'Exercise 2: Adjective Agreement',
        question: 'Choose the correct adjective form:',
        sentence: "C'est une ________ maison. (beau)",
        options: ['A. beau', 'B. bel', 'C. belle', 'D. beaux'],
        correct: 2,
        explanation: '"Belle" is the feminine form of "beau", matching "maison" (feminine noun).',
      },
      {
        title: 'Exercise 3: Prepositions with Countries',
        question: 'Select the correct preposition:',
        sentence: "Je vais ________ France l'été prochain.",
        options: ['A. à', 'B. en', 'C. au', 'D. dans'],
        correct: 1,
        explanation: '"En" is used before feminine countries like France.',
      },
      {
        title: 'Exercise 4: Negation',
        question: 'Choose the correct negative construction:',
        sentence: 'Il parle espagnol. → Il ________ parle ________ espagnol.',
        options: ['A. ne ... pas', 'B. ne ... jamais', 'C. ne ... plus', 'D. ne ... rien'],
        correct: 0,
        explanation: '"ne ... pas" is the standard negation in French.',
      },
    ],
    reading: {
      title: 'La Culture du Café en France',
      passage: [
        'En France, le café est bien plus qu\'un simple endroit pour boire du café. C\'est une institution sociale, un lieu de rencontre et un repère culturel. Les cafés français sont des endroits où les gens vont lire le journal, rencontrer des amis, discuter de politique ou simplement regarder le monde passer.',
        'La tradition de la culture café remonte au XVIIe siècle, quand les premiers cafés ont ouvert à Paris. Ces établissements sont rapidement devenus des centres de vie intellectuelle et artistique. Des écrivains et philosophes célèbres comme Voltaire et Rousseau y étaient des habitués.',
        'Aujourd\'hui, le café reste une partie essentielle de la vie française. Des grands cafés de Paris aux petits bistrots des villes de province, ces établissements servent de salons de la société française.',
        'Commander dans un café français a ses propres rituels. Un simple "un café" vous donnera un petit expresso fort. Si vous préférez un café plus grand avec du lait, vous demandez "un café au lait" le matin.',
      ],
      vocab: [
        ['Institution', 'Une organisation ou coutume bien établie'],
        ['Repère', 'Un point de référence bien connu'],
        ['Habitués', 'Clients ou visiteurs réguliers'],
        ['Province', 'Les régions en dehors de la capitale'],
        ['Rituels', 'Procédures ou cérémonies établies'],
      ],
      questions: [
        {
          q: '1. Qu\'est-ce qui N\'EST PAS mentionné comme activité dans les cafés français?',
          options: ['A. Lire le journal', 'B. Discuter de politique', 'C. Regarder la télévision', 'D. Rencontrer des amis'],
          correct: 2,
        },
        {
          q: '2. Quand la culture café a-t-elle commencé en France?',
          options: ['A. XVe siècle', 'B. XVIIe siècle', 'C. XIXe siècle', 'D. XXe siècle'],
          correct: 1,
        },
        {
          q: '3. Que signifie "un café au lait"?',
          options: [
            'A. Un café servi froid',
            'B. Un café sans sucre',
            'C. Un café avec du lait',
            'D. Un double expresso',
          ],
          correct: 2,
        },
      ],
    },
    speakingPhrases: [
      { id: 1, text: '"Comment puis-je me rendre à la gare?"',    durationSec: 4 },
      { id: 2, text: '"Je voudrais une table pour deux personnes."', durationSec: 4 },
      { id: 3, text: '"Pourriez-vous répéter plus lentement?"',   durationSec: 4 },
      { id: 4, text: '"Où se trouve la pharmacie la plus proche?"', durationSec: 4 },
      { id: 5, text: '"J\'apprends le français depuis six mois."', durationSec: 4 },
    ],
    listening: {
      question: 'Où se déroule la conversation?',
      hint: 'Écoutez attentivement le dialogue',
      transcript: [
        { speaker: 'Personne A', line: "Bonjour! Je voudrais réserver une table pour deux personnes ce soir à 20 heures." },
        { speaker: 'Personne B', line: "Bien sûr! Vous préférez une table en terrasse ou à l'intérieur?" },
        { speaker: 'Personne A', line: "À l'intérieur, s'il vous plaît. Et si possible, loin de la cuisine." },
        { speaker: 'Personne B', line: "Très bien. Puis-je avoir votre nom pour la réservation?" },
      ],
      options: ['À l\'hôtel', 'Dans un restaurant', 'À la gare', 'Dans un magasin'],
      correct: 1,
    },
  },

  // ── SPANISH ───────────────────────────────────────────────────────────────
  Spanish: {
    ttsLang: 'es-ES',
    flashcards: [
      { word: 'Hola',              translation: 'Hello',                     example: '¡Hola! ¿Cómo estás?' },
      { word: 'Gracias',           translation: 'Thank you',                  example: '¡Muchas gracias por tu ayuda!' },
      { word: 'Por favor',         translation: 'Please',                     example: 'Un café, por favor.' },
      { word: 'Buenos días',       translation: 'Good morning',               example: '¡Buenos días! ¿Cómo amaneciste?' },
      { word: '¿Cómo te llamas?',  translation: 'What is your name?',         example: '¿Cómo te llamas? Me llamo Carlos.' },
      { word: 'Lo siento',         translation: 'I\'m sorry',                 example: 'Lo siento, no entendí.' },
      { word: '¿Dónde está…?',     translation: 'Where is…?',                 example: '¿Dónde está el baño?' },
      { word: 'Hablar',            translation: 'To speak / To talk',         example: 'Me gusta hablar español.' },
      { word: 'Quiero',            translation: 'I want',                     example: 'Quiero aprender español.' },
      { word: 'No entiendo',       translation: 'I don\'t understand',        example: 'No entiendo. ¿Puede repetir?' },
    ],
    grammar: [
      {
        title: 'Exercise 1: Ser vs Estar',
        question: 'Choose the correct verb:',
        sentence: 'La sopa ________ muy caliente ahora.',
        options: ['A. es', 'B. está', 'C. son', 'D. están'],
        correct: 1,
        explanation: '"Está" is correct. We use estar for temporary conditions like temperature.',
      },
      {
        title: 'Exercise 2: Preterite vs Imperfect',
        question: 'Select the correct past tense:',
        sentence: 'Cuando ________ niño, jugaba en el parque todos los días.',
        options: ['A. fui', 'B. era', 'C. estuve', 'D. estaba'],
        correct: 1,
        explanation: '"Era" is correct. We use imperfect for states or conditions in the past.',
      },
      {
        title: 'Exercise 3: Direct Object Pronouns',
        question: 'Replace the noun with the correct pronoun:',
        sentence: 'Yo compré el libro. → Yo ________ compré.',
        options: ['A. le', 'B. lo', 'C. la', 'D. les'],
        correct: 1,
        explanation: '"Lo" replaces masculine singular nouns like "el libro".',
      },
      {
        title: 'Exercise 4: Subjunctive',
        question: 'Choose the correct subjunctive form:',
        sentence: 'Espero que tú ________ mañana.',
        options: ['A. vengas', 'B. vienes', 'C. vendrás', 'D. veniste'],
        correct: 0,
        explanation: '"Vengas" is the subjunctive form. We use subjunctive after "espero que".',
      },
    ],
    reading: {
      title: 'La Siesta Española',
      passage: [
        'La siesta es una tradición muy conocida en España y en otros países hispanohablantes. Es una pausa breve durante el día, generalmente después del almuerzo, para descansar o dormir. Aunque no todos los españoles duermen la siesta, sigue siendo parte de la cultura mediterránea.',
        'Originalmente, la siesta era necesaria para los trabajadores del campo que debían protegerse del calor del mediodía. Con el tiempo, se convirtió en una costumbre social que incluía cerrar los comercios durante las horas centrales del día.',
        'Los estudios científicos han demostrado que una siesta corta de entre 10 y 30 minutos puede mejorar el estado de alerta, la memoria y el rendimiento. Sin embargo, dormir más de 30 minutos puede provocar somnolencia.',
        'Hoy en día, el ritmo de vida moderno ha reducido la práctica de la siesta. Muchos españoles ya no pueden permitirse esta pausa debido a los horarios de trabajo más estrictos. Sin embargo, en las zonas rurales y entre los mayores, la tradición continúa.',
      ],
      vocab: [
        ['Pausa', 'A short break or rest period'],
        ['Almuerzo', 'Lunch — the midday meal'],
        ['Costumbre', 'A custom or habit'],
        ['Rendimiento', 'Performance or output'],
        ['Somnolencia', 'Sleepiness or drowsiness'],
      ],
      questions: [
        {
          q: '1. ¿Para qué trabajadores era originalmente necesaria la siesta?',
          options: ['A. Trabajadores de oficina', 'B. Trabajadores del campo', 'C. Médicos', 'D. Profesores'],
          correct: 1,
        },
        {
          q: '2. ¿Cuánto tiempo debe durar una siesta beneficiosa según los estudios?',
          options: ['A. 5-10 minutos', 'B. 10-30 minutos', 'C. 30-60 minutos', 'D. Más de una hora'],
          correct: 1,
        },
        {
          q: '3. ¿Quiénes mantienen más la tradición de la siesta hoy en día?',
          options: ['A. Jóvenes urbanos', 'B. Trabajadores de oficina', 'C. Personas de zonas rurales y mayores', 'D. Estudiantes universitarios'],
          correct: 2,
        },
      ],
    },
    speakingPhrases: [
      { id: 1, text: '"¿Podría hablar más despacio, por favor?"',  durationSec: 4 },
      { id: 2, text: '"Quisiera reservar una mesa para dos."',     durationSec: 4 },
      { id: 3, text: '"¿Dónde está la estación de metro más cercana?"', durationSec: 5 },
      { id: 4, text: '"No entiendo. ¿Puede repetirlo?"',           durationSec: 4 },
      { id: 5, text: '"Estoy aprendiendo español desde hace un año."', durationSec: 4 },
    ],
    listening: {
      question: '¿Dónde tiene lugar la conversación?',
      hint: 'Escucha atentamente el diálogo',
      transcript: [
        { speaker: 'Persona A', line: "Buenos días. Quisiera comprar dos billetes para Madrid, por favor." },
        { speaker: 'Persona B', line: "¿Para qué día y a qué hora?" },
        { speaker: 'Persona A', line: "Para este sábado. El tren de las 9 de la mañana." },
        { speaker: 'Persona B', line: "Perfecto. ¿Prefiere asientos de ventana o pasillo?" },
      ],
      options: ['En un restaurante', 'En un hotel', 'En una taquilla de tren', 'En un aeropuerto'],
      correct: 2,
    },
  },

  // ── GERMAN ────────────────────────────────────────────────────────────────
  German: {
    ttsLang: 'de-DE',
    flashcards: [
      { word: 'Hallo',             translation: 'Hello',                    example: 'Hallo! Wie geht es dir?' },
      { word: 'Danke schön',       translation: 'Thank you very much',       example: 'Danke schön für deine Hilfe!' },
      { word: 'Bitte',             translation: 'Please / You\'re welcome',  example: 'Einen Kaffee, bitte.' },
      { word: 'Guten Morgen',      translation: 'Good morning',              example: 'Guten Morgen! Wie hast du geschlafen?' },
      { word: 'Wie heißen Sie?',   translation: 'What is your name? (formal)', example: 'Wie heißen Sie? Ich heiße Anna.' },
      { word: 'Entschuldigung',    translation: 'Excuse me / Sorry',         example: 'Entschuldigung, wo ist der Bahnhof?' },
      { word: 'Wo ist…?',          translation: 'Where is…?',                example: 'Wo ist die nächste Apotheke?' },
      { word: 'Ich verstehe nicht','translation': 'I don\'t understand',     example: 'Ich verstehe nicht. Können Sie das wiederholen?' },
      { word: 'Ich möchte',        translation: 'I would like',              example: 'Ich möchte einen Tisch reservieren.' },
      { word: 'Auf Wiedersehen',   translation: 'Goodbye',                   example: 'Auf Wiedersehen! Bis morgen!' },
    ],
    grammar: [
      {
        title: 'Exercise 1: Nominative Case Articles',
        question: 'Choose the correct article (nominative):',
        sentence: '________ Hund spielt im Garten. (dog - masculine)',
        options: ['A. Die', 'B. Das', 'C. Der', 'D. Den'],
        correct: 2,
        explanation: '"Der" is the nominative masculine article. "Hund" (dog) is masculine.',
      },
      {
        title: 'Exercise 2: Modal Verbs',
        question: 'Select the correct modal verb form:',
        sentence: 'Er ________ jeden Tag zur Schule gehen.',
        options: ['A. muss', 'B. musst', 'C. müssen', 'D. müsst'],
        correct: 0,
        explanation: '"Muss" is the third person singular of "müssen" (must/have to).',
      },
      {
        title: 'Exercise 3: Perfect Tense',
        question: 'Choose the correct auxiliary verb:',
        sentence: 'Sie ________ gestern ins Kino gegangen.',
        options: ['A. haben', 'B. hat', 'C. ist', 'D. sind'],
        correct: 2,
        explanation: '"Ist" is correct. Verbs of movement use "sein" (to be) as auxiliary in perfect tense.',
      },
      {
        title: 'Exercise 4: Accusative Case',
        question: 'Select the correct accusative article:',
        sentence: 'Ich kaufe ________ Apfel. (apple - masculine)',
        options: ['A. der', 'B. den', 'C. die', 'D. das'],
        correct: 1,
        explanation: '"Den" is the accusative masculine article. Direct objects use accusative case.',
      },
    ],
    reading: {
      title: 'Das Oktoberfest',
      passage: [
        'Das Oktoberfest ist das größte Volksfest der Welt und findet jährlich in München statt. Es beginnt normalerweise im September und endet in den ersten Oktober-Tagen. Millionen von Besuchern aus aller Welt kommen jedes Jahr nach Bayern.',
        'Das erste Oktoberfest fand 1810 statt, um die Hochzeit von Kronprinz Ludwig und Prinzessin Therese zu feiern. Ein Pferderennen war der Höhepunkt der Feierlichkeiten. Die Veranstaltung war so erfolgreich, dass sie im folgenden Jahr wiederholt wurde.',
        'Heute ist das Fest bekannt für Bierzelte, bayerische Musik, traditionelle Kleidung und lokale Speisen. Besucher tragen oft Dirndl oder Lederhosen und genießen Brezeln, Hendl und Weißwurst.',
        'Das Oktoberfest hat großen wirtschaftlichen Einfluss auf München. Die Stadt profitiert von Millionen von Touristen, die Hotels, Restaurants und Geschäfte beleben.',
      ],
      vocab: [
        ['Volksfest', 'A public festival or fair'],
        ['Kronprinz', 'Crown prince — heir to the throne'],
        ['Feierlichkeiten', 'Celebrations or festivities'],
        ['Wirtschaftlich', 'Economic or relating to the economy'],
        ['Profitieren', 'To benefit or profit from something'],
      ],
      questions: [
        {
          q: '1. Wann findet das Oktoberfest statt?',
          options: ['A. Im Juli', 'B. Im August', 'C. Ab September', 'D. Im November'],
          correct: 2,
        },
        {
          q: '2. Warum wurde das erste Oktoberfest 1810 abgehalten?',
          options: ['A. Um den Bier-Export zu feiern', 'B. Zur Feier einer königlichen Hochzeit', 'C. Als Erntedankfest', 'D. Für einen Militärsieg'],
          correct: 1,
        },
        {
          q: '3. Was ist KEIN traditionelles Merkmal des Oktoberfests?',
          options: ['A. Bierzelte', 'B. Lederhosen', 'C. Pferderennen', 'D. Brezeln'],
          correct: 2,
        },
      ],
    },
    speakingPhrases: [
      { id: 1, text: '"Könnten Sie das bitte wiederholen?"',       durationSec: 4 },
      { id: 2, text: '"Ich hätte gerne einen Tisch für zwei."',    durationSec: 4 },
      { id: 3, text: '"Wo ist der nächste Supermarkt?"',           durationSec: 4 },
      { id: 4, text: '"Ich lerne seit einem Jahr Deutsch."',       durationSec: 4 },
      { id: 5, text: '"Können Sie mir bitte helfen?"',             durationSec: 3 },
    ],
    listening: {
      question: 'What are the speakers discussing?',
      hint: 'Listen carefully to the conversation',
      transcript: [
        { speaker: 'Person A', line: "Entschuldigung, fährt dieser Bus zum Hauptbahnhof?" },
        { speaker: 'Person B', line: "Nein, dieser Bus fährt zum Flughafen. Sie müssen die Linie 12 nehmen." },
        { speaker: 'Person A', line: "Und wo hält die Linie 12?" },
        { speaker: 'Person B', line: "An der nächsten Haltestelle, etwa 200 Meter von hier." },
      ],
      options: ['Booking a hotel', 'Finding the right bus', 'Buying train tickets', 'Asking for a restaurant'],
      correct: 1,
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// getContent(preferredLanguage) — returns content for the user's language,
// falling back to English if the language is not yet in the content map.
// ─────────────────────────────────────────────────────────────────────────────
export function getContent(preferredLanguage) {
  return CONTENT[preferredLanguage] || CONTENT['English']
}

export default CONTENT
