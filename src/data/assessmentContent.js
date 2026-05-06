// ─────────────────────────────────────────────────────────────────────────────
// Assessment content per language code (from LanguageStep: 'en','fr','es','de',...)
// BACKEND INTEGRATION: Replace each section with:
//   GET /api/assessment/grammar?language=fr
//   GET /api/assessment/reading?language=fr
//   GET /api/assessment/pronunciation/sentences?language=fr
// ─────────────────────────────────────────────────────────────────────────────

const ASSESSMENT = {

  // ── ENGLISH ───────────────────────────────────────────────────────────────
  en: {
    fullName: 'English',
    grammar: [
      { q: "Which sentence is grammatically correct?", opts: ["She don't like coffee.", "She doesn't likes coffee.", "She doesn't like coffee.", "She not like coffee."], c: 2 },
      { q: "Choose the correct past tense: 'Yesterday, I ___ to the store.'", opts: ["go", "goed", "went", "gone"], c: 2 },
      { q: "Select the correct plural: 'There are three ___ in the room.'", opts: ["childs", "children", "child", "childrens"], c: 1 },
      { q: "Which sentence uses articles correctly?", opts: ["I saw an movie yesterday.", "I saw a movie yesterday.", "I saw movie yesterday.", "I see the movie yesterday."], c: 1 },
      { q: "Choose the correct comparative form:", opts: ["This book is interesting than that.", "This book is more interesting than that.", "This book is interestinger.", "This book is most interesting than that."], c: 1 },
    ],
    reading: [
      { text: "The concept of artificial intelligence has evolved significantly over the past few decades. Initially focused on simple problem-solving tasks, AI now encompasses machine learning, natural language processing, and computer vision. These advancements have revolutionized industries from healthcare to transportation, creating new opportunities while also raising important ethical questions about privacy and employment.", q: "What is the main topic of this passage?", opts: ["The history of computers", "The evolution and impact of artificial intelligence", "Ethical questions in technology", "Healthcare applications of technology"], c: 1 },
      { text: "Renewable energy sources like solar and wind power are becoming increasingly important as the world seeks to reduce its dependence on fossil fuels. These clean energy alternatives not only help combat climate change but also create new job opportunities in the green economy.", q: "What is NOT mentioned as a benefit of renewable energy?", opts: ["Reducing dependence on fossil fuels", "Creating new job opportunities", "Being cheaper than fossil fuels", "Helping combat climate change"], c: 2 },
      { text: "Effective communication is essential in both personal and professional settings. It involves not only speaking clearly but also active listening, understanding non-verbal cues, and adapting your message to your audience.", q: "What does effective communication involve?", opts: ["Only speaking clearly", "Speaking, listening, understanding cues, and adapting", "Writing skills only", "Using complex vocabulary"], c: 1 },
    ],
    pronunciation: [
      "The quick brown fox jumps over the lazy dog.",
      "She sells seashells by the seashore.",
      "How much wood would a woodchuck chuck if a woodchuck could chuck wood?",
    ],
    speakingTopic: "Tell me about a memorable travel experience or a place you would love to visit.",
    writingPrompt: "Write a short paragraph (50–100 words) describing your morning routine. Use at least 3 different verbs in the present tense.",
    writingVocab: ["subsequently", "additionally", "furthermore", "however", "therefore"],
    recommendations: (lang) => [
      { icon: 'fa-microphone', title: 'Pronunciation Practice', desc: `Focus on English vowel sounds and intonation patterns`, color: '#8b5cf6' },
      { icon: 'fa-comments',   title: 'Daily Conversation',     desc: 'Practice with the AI tutor for 15 minutes daily',   color: '#10b981' },
      { icon: 'fa-pen',        title: 'Grammar Exercises',      desc: 'Complete English verb tense and sentence structure drills', color: '#f59e0b' },
    ],
  },

  // ── FRENCH ────────────────────────────────────────────────────────────────
  fr: {
    fullName: 'French',
    grammar: [
      { q: "Choisissez la forme correcte du verbe 'être' : 'Ils ___ étudiants.'", opts: ["est", "suis", "sont", "êtes"], c: 2 },
      { q: "Choisissez la bonne forme négative : 'Je ___ parle ___ espagnol.'", opts: ["ne ... pas", "ne ... jamais", "pas ... ne", "ne ... rien"], c: 0 },
      { q: "Quel article est correct ? '___ chat est sur ___ table.'", opts: ["Un / une", "Le / la", "La / le", "Un / le"], c: 1 },
      { q: "Choisissez le bon accord de l'adjectif : 'C'est une ___ maison.' (beau)", opts: ["beau", "bel", "belle", "beaux"], c: 2 },
      { q: "Quelle est la forme correcte du passé composé ? 'Hier, elle ___ au cinéma.'", opts: ["a allée", "est allée", "était allée", "avait allée"], c: 1 },
    ],
    reading: [
      { text: "Le français est une langue romane parlée par environ 300 millions de personnes dans le monde. C'est la langue officielle de 29 pays et l'une des six langues officielles des Nations Unies. Le français est réputé pour sa richesse littéraire, de Molière à Victor Hugo en passant par Albert Camus.", q: "Combien de personnes parlent français dans le monde ?", opts: ["100 millions", "200 millions", "300 millions", "400 millions"], c: 2 },
      { text: "La cuisine française est reconnue dans le monde entier pour sa sophistication et sa diversité. Des fromages aux vins, en passant par les pâtisseries et les plats gastronomiques, la gastronomie française a été inscrite au patrimoine culturel immatériel de l'UNESCO en 2010.", q: "Qu'est-ce qui a été inscrit au patrimoine de l'UNESCO ?", opts: ["Les vins français", "Les fromages français", "La gastronomie française", "Les pâtisseries françaises"], c: 2 },
      { text: "Paris, la capitale de la France, est l'une des villes les plus visitées au monde. Avec ses musées mondialement connus comme le Louvre, ses monuments emblématiques comme la Tour Eiffel, et ses quartiers historiques, Paris attire chaque année des millions de touristes.", q: "Que mentionne le texte comme l'un des musées de Paris ?", opts: ["Le Musée d'Orsay", "Le Centre Pompidou", "Le Louvre", "Le Musée Picasso"], c: 2 },
    ],
    pronunciation: [
      "Bonjour, comment allez-vous aujourd'hui ?",
      "Je voudrais un café au lait, s'il vous plaît.",
      "Les chaussettes de l'archiduchesse sont-elles sèches ?",
    ],
    speakingTopic: "Parlez-moi d'un souvenir de voyage ou d'un endroit que vous aimeriez visiter.",
    writingPrompt: "Écrivez un court paragraphe (50–100 mots) décrivant votre routine matinale. Utilisez au moins 3 verbes différents au présent.",
    writingVocab: ["ensuite", "également", "cependant", "donc", "par conséquent"],
    recommendations: () => [
      { icon: 'fa-microphone', title: 'Pratique de la prononciation', desc: 'Concentrez-vous sur les sons nasaux et les liaisons en français', color: '#8b5cf6' },
      { icon: 'fa-comments',   title: 'Conversation quotidienne',     desc: 'Pratiquez avec le tuteur IA pendant 15 minutes par jour',     color: '#10b981' },
      { icon: 'fa-pen',        title: 'Exercices de grammaire',       desc: 'Maîtrisez les conjugaisons et les accords en français',       color: '#f59e0b' },
    ],
  },

  // ── SPANISH ───────────────────────────────────────────────────────────────
  es: {
    fullName: 'Spanish',
    grammar: [
      { q: "Elige la forma correcta del verbo 'ser/estar': 'El café ___ caliente.'", opts: ["es", "está", "son", "están"], c: 1 },
      { q: "Selecciona el pronombre correcto: 'Yo ___ estudiante.'", opts: ["soy", "estoy", "ser", "eres"], c: 0 },
      { q: "¿Cuál es el artículo correcto? '___ libro está sobre ___ mesa.'", opts: ["Un / una", "El / la", "La / el", "Un / el"], c: 1 },
      { q: "Elige la forma del pretérito indefinido: 'Ayer yo ___ al mercado.'", opts: ["voy", "fui", "iba", "vaya"], c: 1 },
      { q: "Selecciona la forma correcta del subjuntivo: 'Espero que tú ___ mañana.'", opts: ["vengas", "vienes", "vendrás", "veniste"], c: 0 },
    ],
    reading: [
      { text: "El español es la segunda lengua materna más hablada del mundo, con más de 500 millones de hablantes nativos. Es el idioma oficial de 21 países y uno de los seis idiomas oficiales de las Naciones Unidas. Su influencia cultural abarca la literatura, la música y el cine.", q: "¿Cuántos hablantes nativos tiene el español?", opts: ["Más de 100 millones", "Más de 300 millones", "Más de 500 millones", "Más de 700 millones"], c: 2 },
      { text: "La paella es uno de los platos más representativos de la cocina española, especialmente de la región de Valencia. Originalmente era un plato humilde de los agricultores valencianos, preparado con arroz, verduras y proteínas disponibles localmente.", q: "¿De qué región de España es originaria la paella?", opts: ["Cataluña", "Andalucía", "Valencia", "Madrid"], c: 2 },
      { text: "El Festival de San Fermín, celebrado en Pamplona cada julio, es famoso mundialmente por el encierro de toros. Miles de personas corren delante de los toros por las calles del casco histórico de la ciudad, una tradición que data del siglo XIV.", q: "¿En qué mes se celebra el Festival de San Fermín?", opts: ["Junio", "Julio", "Agosto", "Septiembre"], c: 1 },
    ],
    pronunciation: [
      "Buenos días, ¿cómo está usted hoy?",
      "Me gustaría una mesa para dos personas, por favor.",
      "El perro de San Roque no tiene rabo porque Ramón Ramírez se lo ha robado.",
    ],
    speakingTopic: "Cuéntame sobre un recuerdo de viaje especial o un lugar que te gustaría visitar.",
    writingPrompt: "Escribe un párrafo corto (50–100 palabras) describiendo tu rutina matutina. Usa al menos 3 verbos diferentes en presente.",
    writingVocab: ["además", "sin embargo", "por lo tanto", "finalmente", "asimismo"],
    recommendations: () => [
      { icon: 'fa-microphone', title: 'Práctica de pronunciación', desc: 'Enfócate en los sonidos de la "r" y la "ll" en español',   color: '#8b5cf6' },
      { icon: 'fa-comments',   title: 'Conversación diaria',       desc: 'Practica con el tutor de IA durante 15 minutos al día',  color: '#10b981' },
      { icon: 'fa-pen',        title: 'Ejercicios de gramática',   desc: 'Domina el subjuntivo y los tiempos del pasado en español', color: '#f59e0b' },
    ],
  },

  // ── GERMAN ────────────────────────────────────────────────────────────────
  de: {
    fullName: 'German',
    grammar: [
      { q: "Wähle den richtigen Artikel (Nominativ): '___ Hund spielt im Garten.' (maskulin)", opts: ["Die", "Das", "Der", "Den"], c: 2 },
      { q: "Wähle die richtige Verbform: 'Er ___ jeden Tag zur Schule gehen.' (müssen)", opts: ["muss", "musst", "müssen", "müsst"], c: 0 },
      { q: "Welche Verneinung ist korrekt? 'Ich spreche ___ Chinesisch.'", opts: ["kein", "keine", "nicht", "nein"], c: 2 },
      { q: "Wähle den richtigen Akkusativ: 'Ich kaufe ___ Apfel.' (maskulin)", opts: ["der", "den", "die", "das"], c: 1 },
      { q: "Wähle das richtige Hilfsverb im Perfekt: 'Sie ___ gestern ins Kino gegangen.'", opts: ["haben", "hat", "ist", "sind"], c: 2 },
    ],
    reading: [
      { text: "Deutsch wird von etwa 100 Millionen Menschen als Muttersprache gesprochen und ist die meistgesprochene Muttersprache in der Europäischen Union. Deutsch ist Amtssprache in Deutschland, Österreich, der Schweiz, Liechtenstein und weiteren Ländern. Es ist eine der wichtigsten Wissenschaftssprachen der Welt.", q: "In wie vielen der genannten Länder ist Deutsch Amtssprache?", opts: ["2", "3", "4", "5"], c: 2 },
      { text: "Das Oktoberfest ist das größte Volksfest der Welt und findet jährlich in München statt. Es beginnt normalerweise im September und endet in den ersten Oktober-Tagen. Millionen von Besuchern aus aller Welt kommen jedes Jahr nach Bayern, um bayerische Musik, Trachten und Bier zu genießen.", q: "Wann beginnt das Oktoberfest normalerweise?", opts: ["Im Juli", "Im August", "Im September", "Im Oktober"], c: 2 },
      { text: "Die Berliner Mauer war eine Grenzanlage, die West-Berlin von der DDR umschloss. Sie wurde am 13. August 1961 errichtet und trennte Familien und Freunde für fast drei Jahrzehnte. Am 9. November 1989 fiel die Mauer — ein historisches Ereignis, das die Wiedervereinigung Deutschlands einleitete.", q: "Wann fiel die Berliner Mauer?", opts: ["13. August 1961", "9. November 1989", "3. Oktober 1990", "1. Januar 1991"], c: 1 },
    ],
    pronunciation: [
      "Guten Morgen, wie geht es Ihnen heute?",
      "Ich hätte gerne einen Tisch für zwei Personen, bitte.",
      "Fischers Fritze fischt frische Fische, frische Fische fischt Fischers Fritze.",
    ],
    speakingTopic: "Erzählen Sie mir von einer unvergesslichen Reiseerinnerung oder einem Ort, den Sie gerne besuchen würden.",
    writingPrompt: "Schreiben Sie einen kurzen Absatz (50–100 Wörter), der Ihre Morgenroutine beschreibt. Verwenden Sie mindestens 3 verschiedene Verben im Präsens.",
    writingVocab: ["außerdem", "jedoch", "daher", "schließlich", "dennoch"],
    recommendations: () => [
      { icon: 'fa-microphone', title: 'Ausspracheübungen',   desc: 'Konzentrieren Sie sich auf die deutschen Umlaute ä, ö, ü und das ß', color: '#8b5cf6' },
      { icon: 'fa-comments',   title: 'Tägliches Gespräch', desc: 'Üben Sie täglich 15 Minuten mit dem KI-Tutor',                      color: '#10b981' },
      { icon: 'fa-pen',        title: 'Grammatikübungen',   desc: 'Meistern Sie den deutschen Kasus und die Verbkonjugation',           color: '#f59e0b' },
    ],
  },

  // ── ITALIAN ───────────────────────────────────────────────────────────────
  it: {
    fullName: 'Italian',
    grammar: [
      { q: "Scegli l'articolo corretto: '___ libro è sul tavolo.'", opts: ["La", "Il", "Lo", "Un"], c: 1 },
      { q: "Scegli la forma corretta: 'Loro ___ studenti.'", opts: ["è", "sei", "sono", "siamo"], c: 2 },
      { q: "Scegli la negazione corretta: 'Io ___ capisco.'", opts: ["no", "non", "niente", "mai"], c: 1 },
      { q: "Scegli il passato prossimo corretto: 'Ieri io ___ al supermercato.'", opts: ["vado", "sono andato", "ando", "andavo"], c: 1 },
      { q: "Quale aggettivo concorda correttamente? 'È una ragazza ___.' (bravo)", opts: ["bravo", "brava", "bravi", "brave"], c: 1 },
    ],
    reading: [
      { text: "L'italiano è parlato da circa 85 milioni di persone nel mondo. È la lingua ufficiale dell'Italia, della Svizzera, di San Marino e della Città del Vaticano. L'italiano è noto per la sua musicalità ed è la lingua della musica lirica, dell'arte e della moda.", q: "In quanti paesi l'italiano è lingua ufficiale tra quelli menzionati?", opts: ["2", "3", "4", "5"], c: 2 },
      { text: "La pizza napoletana è originaria di Napoli e nel 2017 è stata riconosciuta dall'UNESCO come patrimonio culturale immateriale dell'umanità. La pizza originale era semplice: pasta, pomodoro e mozzarella di bufala.", q: "Quando la pizza napoletana è stata riconosciuta dall'UNESCO?", opts: ["2010", "2015", "2017", "2020"], c: 2 },
      { text: "Il Colosseo di Roma è uno degli anfiteatri più grandi mai costruiti. Completato nell'80 d.C., poteva ospitare tra 50.000 e 80.000 spettatori. Oggi è il simbolo di Roma e uno dei monumenti più visitati d'Italia.", q: "Quando fu completato il Colosseo?", opts: ["50 d.C.", "80 d.C.", "100 d.C.", "200 d.C."], c: 1 },
    ],
    pronunciation: [
      "Buongiorno, come sta oggi?",
      "Vorrei un tavolo per due persone, per favore.",
      "Sopra la panca la capra campa, sotto la panca la capra crepa.",
    ],
    speakingTopic: "Parlami di un ricordo di viaggio speciale o di un posto che vorresti visitare.",
    writingPrompt: "Scrivi un breve paragrafo (50–100 parole) che descrive la tua routine mattutina. Usa almeno 3 verbi diversi al presente.",
    writingVocab: ["inoltre", "tuttavia", "quindi", "infine", "pertanto"],
    recommendations: () => [
      { icon: 'fa-microphone', title: 'Pratica di pronuncia', desc: 'Concentrati sulla musicalità e l\'intonazione italiana',        color: '#8b5cf6' },
      { icon: 'fa-comments',   title: 'Conversazione quotidiana', desc: 'Pratica con il tutor AI per 15 minuti al giorno',           color: '#10b981' },
      { icon: 'fa-pen',        title: 'Esercizi di grammatica',   desc: 'Padroneggia i tempi verbali e i generi in italiano',        color: '#f59e0b' },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// getAssessmentContent(langCode) — returns content for the given ISO code.
// Falls back to English for unsupported languages.
// ─────────────────────────────────────────────────────────────────────────────
export function getAssessmentContent(langCode) {
  return ASSESSMENT[langCode] || ASSESSMENT['en']
}

// Maps short code → full name (used in ResultsStep to update user.preferredLanguage)
export function codeToFullName(langCode) {
  return (ASSESSMENT[langCode] || ASSESSMENT['en']).fullName
}

export default ASSESSMENT
