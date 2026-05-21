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
    fullName: "English",
    grammar: [
      {
        q: "Which sentence is grammatically correct?",
        opts: [
          "She don't like coffee.",
          "She doesn't likes coffee.",
          "She doesn't like coffee.",
          "She not like coffee.",
        ],
        c: 2,
      },
      {
        q: "Choose the correct past tense: 'Yesterday, I ___ to the store.'",
        opts: ["go", "goed", "went", "gone"],
        c: 2,
      },
      {
        q: "Select the correct plural: 'There are three ___ in the room.'",
        opts: ["childs", "children", "child", "childrens"],
        c: 1,
      },
      {
        q: "Which sentence uses articles correctly?",
        opts: [
          "I saw an movie yesterday.",
          "I saw a movie yesterday.",
          "I saw movie yesterday.",
          "I see the movie yesterday.",
        ],
        c: 1,
      },
      {
        q: "Choose the correct comparative form:",
        opts: [
          "This book is interesting than that.",
          "This book is more interesting than that.",
          "This book is interestinger.",
          "This book is most interesting than that.",
        ],
        c: 1,
      },
    ],
    reading: [
      {
        text: "The concept of artificial intelligence has evolved significantly over the past few decades. Initially focused on simple problem-solving tasks, AI now encompasses machine learning, natural language processing, and computer vision. These advancements have revolutionized industries from healthcare to transportation, creating new opportunities while also raising important ethical questions about privacy and employment.",
        q: "What is the main topic of this passage?",
        opts: [
          "The history of computers",
          "The evolution and impact of artificial intelligence",
          "Ethical questions in technology",
          "Healthcare applications of technology",
        ],
        c: 1,
      },
      {
        text: "Renewable energy sources like solar and wind power are becoming increasingly important as the world seeks to reduce its dependence on fossil fuels. These clean energy alternatives not only help combat climate change but also create new job opportunities in the green economy.",
        q: "What is NOT mentioned as a benefit of renewable energy?",
        opts: [
          "Reducing dependence on fossil fuels",
          "Creating new job opportunities",
          "Being cheaper than fossil fuels",
          "Helping combat climate change",
        ],
        c: 2,
      },
      {
        text: "Effective communication is essential in both personal and professional settings. It involves not only speaking clearly but also active listening, understanding non-verbal cues, and adapting your message to your audience.",
        q: "What does effective communication involve?",
        opts: [
          "Only speaking clearly",
          "Speaking, listening, understanding cues, and adapting",
          "Writing skills only",
          "Using complex vocabulary",
        ],
        c: 1,
      },
    ],
    pronunciation: {
      A1: [
        "My name is Sarah. I am from America. I like to read books and play tennis on the weekend. I have two cats at home. They are very cute and friendly. My cats like to play with toys and sleep on my bed. I love spending time with my family and friends. We often go to the park together.",
        "Hello everyone. My name is Michael. I am a student. I live with my family near the park. We go to the park every Sunday to play games and have fun. My favorite game is soccer. I also like to ride my bicycle on the path. The park is a beautiful place with many trees and flowers. We enjoy playing there.",
        "Good morning. I am Emma. I work at a hospital as a nurse. Every day I help people feel better. I love my job very much. My family is very proud of me. I work with other nurses and doctors. We help sick people get well. I am happy when people smile and feel good again. This is rewarding work.",
        "Hi, my name is David. I am from England. I like to cook food in the kitchen. My favorite food is pizza and pasta. I also enjoy swimming at the beach with my friends. I like to cook chicken and vegetables. My mother taught me how to cook. I cook dinner three times a week. Cooking is fun.",
        "Hello, I am Anna. I am twenty-five years old. I live in a big city. I work in an office. I like to travel to new places and take photos of beautiful things. I have visited five countries. Every year I go on vacation with my friends. I like to see new cultures and new people. Travel is wonderful.",
      ],
      A2: [
        "My name is James and I work as a teacher in a primary school. Every morning I go to school at eight o'clock. I teach English and mathematics to children. I really enjoy my job because the children are very intelligent and funny. After work I like to relax at home with my family. I also like to read books and watch movies in the evening.",
        "Hello, I am Jennifer. I live in a small town near the mountains. I have always liked outdoor activities like hiking and camping. Last year I traveled to three different countries. I learned so much about different cultures and met many new friends during my travels. I take many photos when I travel. These photos remind me of my wonderful experiences.",
        "Good day. My name is Robert. I am a chef and I love cooking in restaurants. Every evening I prepare special dishes for customers. I work with fresh ingredients from the local market. Many people tell me that my cooking is delicious and they come back often. I learned to cook from my grandmother. Cooking makes me very happy.",
        "Hi there. I am Lucy. I study engineering at the university. My classes are interesting but sometimes very difficult. I spend many hours studying in the library. On weekends I play basketball with my friends or visit my family. I want to graduate and work as an engineer. Engineering is my passion and my dream.",
        "Hello everyone. My name is Mark. I work in technology and I spend most of my day on the computer. I like solving problems and learning new things. I have worked at this company for three years and I feel very happy here with my colleagues. My team is friendly and helpful. We have coffee together every day.",
      ],
      B1: [
        "Good morning, I am Thomas. I am interested in learning about different cultures and exploring new countries around the world. Last summer I traveled to Japan and had an amazing experience visiting temples, gardens, and local markets. The people were very friendly and the food was incredible. I learned some basic Japanese words and phrases. I am planning to return there next year to visit new cities.",
        "Hello, my name is Sophie. I work in marketing for a technology company. My job involves creating campaigns, analyzing data, and speaking with clients regularly. The work can be challenging but very rewarding. I enjoy collaborating with my team because everyone has different perspectives and ideas. We often meet to discuss new strategies and ways to improve our products and services for customers.",
        "Hi everyone. I am William. I have a passion for photography and I love capturing moments that tell stories. I have traveled to many beautiful places to photograph nature, people, and architecture. My photographs have been displayed in several galleries. Photography has taught me to see the world differently and appreciate the small details around me every single day.",
        "My name is Isabella. I am a nurse at a busy hospital where I help patients every day. My work is demanding but very meaningful because I know I am making a difference in people's lives. I work long hours but I find great satisfaction in providing care and support to patients during their recovery. My colleagues are like family to me and we support each other through challenging situations.",
        "Hello, I am Carlos. I study business at university while also working part-time at a local restaurant. Balancing both responsibilities requires good time management and organization skills. My university courses are teaching me important lessons about economics, marketing, and leadership. My job at the restaurant teaches me customer service skills that are valuable for my future career in business management.",
      ],
      B2: [
        "My name is Alexandra and I work as a project manager for an international construction company. Although the project was challenging and required careful planning, our dedicated team managed to complete it ahead of the scheduled deadline. The success depended on excellent communication between all departments and clear understanding of our goals. I learned valuable lessons about team coordination and problem-solving. I also appreciated how cultural diversity in our team brought different perspectives and innovative solutions to complex challenges we encountered.",
        "Hello, I am Friedrich. The diversity of the local market in my city showcases the region's rich cultural heritage and traditions. I regularly visit the market to explore handcrafted products, traditional foods, and unique items from local artisans. Supporting local businesses helps preserve traditional skills and keeps cultural practices alive for future generations. The market is not just a place for commerce but also a gathering point where people from different backgrounds connect and share their customs.",
        "Greetings, my name is Isabelle. Contemporary technology has fundamentally transformed the way we communicate, work, and live in modern society. Video conferencing allows us to connect with colleagues across the globe instantly. Cloud computing enables flexible work arrangements that improve work-life balance. However, increased digital connectivity also raises concerns about privacy and data security. We must carefully consider both the benefits and challenges that technology presents to our daily lives and society.",
        "My name is Giovanni and I work as a research scientist in a laboratory. Participants in our research project were encouraged to critically analyze the presented data and propose innovative solutions to scientific problems. We conducted experiments over several months and documented detailed findings. The collaborative environment allowed us to challenge each other's assumptions and develop more robust conclusions. This rigorous approach helped us produce research that contributes meaningfully to our field.",
        "Hello, I am Marie-Claire. The government's policy on renewable energy reflects a commitment to environmental sustainability and reducing carbon emissions. Solar panels, wind turbines, and hydroelectric systems are increasingly powering our communities. Investing in green technology creates employment opportunities while protecting our planet. Although the transition requires significant financial investment, the long-term benefits to public health and environmental preservation justify these efforts. We must continue supporting policies that prioritize renewable energy development.",
      ],
      C1: [
        "My name is Dr. Aleksandr and I specialize in environmental economics. The juxtaposition of traditional methodologies with contemporary approaches elucidates fundamental paradigm shifts within our discipline. Classical economic models often failed to account for environmental externalities and long-term sustainability implications. Modern approaches incorporate ecological considerations into economic frameworks, necessitating interdisciplinary collaboration between economists, ecologists, and policy specialists. This intellectual evolution reflects our growing understanding that environmental protection and economic prosperity must be intrinsically linked for sustainable development.",
        "Greetings, I am Professor Elena. Notwithstanding the multifaceted complexities inherent to linguistic research, scholars persevered with commendable tenacity in analyzing speech patterns across diverse populations. Our longitudinal study examined phonetic variations, morphosyntactic structures, and pragmatic functions of language in different socioeconomic contexts. The researchers employed sophisticated statistical methodologies and qualitative analysis techniques. The findings suggest that language serves not merely as a communication tool but as a marker of social identity and cultural affiliation.",
        "I am Dr. Friedrich Schneider. The proliferation of misinformation in digital ecosystems necessitates comprehensive digital literacy initiatives across all demographic segments of society. Educational institutions must integrate critical thinking and source evaluation into curricula. Media organizations need to establish rigorous fact-checking protocols and transparency measures. Furthermore, technological companies should develop mechanisms to identify and minimize algorithmic amplification of false information. Addressing this multifaceted challenge requires coordinated efforts from educators, journalists, technologists, and policymakers.",
        "My name is Dr. Sophie Beaumont. This nuanced interpretation of the philosophical doctrine reveals previously overlooked connotations and implications that challenge conventional understanding. By employing hermeneutical analysis, we can discern subtle meanings embedded within historical texts. The methodology requires close reading, contextual awareness, and consideration of authorial intent and historical circumstances. Such careful examination often reveals that complex philosophical works contain multiple interpretive possibilities simultaneously, offering richness and depth that surface readings often obscure.",
        "I am Professor Marco Rossi. The synthesis of interdisciplinary perspectives has engendered unprecedented insights into the phenomenon of consciousness. Neuroscience, philosophy, psychology, and cognitive science converge to create more comprehensive theoretical frameworks. Recent neuroimaging studies combined with philosophical inquiry have challenged previously held assumptions about subjective experience. This integration of diverse methodological approaches and epistemological traditions represents an exciting frontier in human knowledge. We anticipate future breakthroughs will emerge from continued collaborative work across traditional disciplinary boundaries.",
      ],
      C2: [
        "Distinguished colleagues, I am Dr. Theodor Michaelson. The epistemological ramifications of this theoretical framework necessitate a comprehensive reconsideration of established paradigms that have undergirded our discipline. The framework's implications extend beyond mere theoretical refinement to fundamentally reconstitute our ontological commitments and methodological presuppositions. Traditional approaches, predicated upon positivistic assumptions about empirical verifiability, prove inadequate for phenomena exhibiting emergent properties transcending reductionist analysis. Consequently, we must embrace epistemological pluralism that acknowledges multiple valid ways of knowing while maintaining rigorous standards of intellectual discourse.",
        "Esteemed colleagues, I am Professor Victoria Ashford-Sterling. The philological intricacies embedded within this linguistic corpus exemplify the semantic polyphony inherent to natural language and its defiantly resistant opacity to univocal interpretation. Diachronic analyses reveal palimpsestic layering of etymological strata, each bearing traces of cultural encounters and intellectual migrations across temporal and geographic boundaries. The hermeneutical challenge confronting us demands sophisticated attention to morphosyntactic peculiarities, lexical semantic fields, and pragmatic contextualizations that collectively constitute linguistic meaningfulness. Furthermore, such engagement necessitates epistemological humility acknowledging language's irreducible polysemy.",
        "Honored members of the academy, I am Dr. Hans-Jürgen Kellerman. The hermeneutical deconstruction of this foundational text reveals subtextual complexities and ideological subterfuges that undermine conventional interpretative frameworks, thereby necessitating radical reconceptualization of textual phenomenology. Derrida's deconstructive methodology exposes how signification operates through différance—simultaneously establishing meaning through presence and deferring it through absence. This paradoxical aporia illuminates language's fundamental instability and the impossibility of achieving determinate, self-identical meaning. Consequently, interpretive practice must embrace productive indeterminacy rather than seeking illusory semantic closure.",
        "Venerable scholars, I am Professor Leonardo Da Vincenzo. The dialectical tension between deterministic philosophical positions predicated upon causal closure and indeterministic metaphysics celebrating libertarian agency engenders profound metaphysical quandaries concerning human freedom, moral responsibility, and cosmological contingency. Contemporary philosophy of science, informed by quantum indeterminacy and chaos theory, has demonstrated that deterministic mechanisms constitute idealizations rather than descriptions of ultimate reality. This scientific reconceptualization demands corresponding philosophical adjustment regarding our understanding of causation, prediction, and human volition. Reconciling scientific findings with philosophical commitments remains a formidable challenge.",
        "Most esteemed colleagues, I am Dr. Cornelius Blackwood-Sutherland. The apotheosis of technological sophistication paradoxically engenders existential anxieties regarding the ontological status of human agency within increasingly algorithmic sociotechnical assemblages. As computational systems demonstrating sophisticated pattern recognition and predictive capabilities proliferate throughout domains previously constituting uniquely human cognitive prerogatives, fundamental questions emerge concerning authentic autonomy, technological determinism, and transhumanist trajectories. We confront a genuine aporia: technological augmentation simultaneously expands and potentially undermines human flourishing. Negotiating this paradox demands philosophical clarity regarding essential human capacities and values we intend preservation across epochs of accelerating technological transformation.",
      ],
    },
    speakingTopic:
      "Tell me about a memorable travel experience or a place you would love to visit.",
    writingPrompt:
      "Write a short paragraph (50–100 words) describing your morning routine. Use at least 3 different verbs in the present tense.",
    writingVocab: [
      "subsequently",
      "additionally",
      "furthermore",
      "however",
      "therefore",
    ],
    recommendations: (lang) => [
      {
        icon: "fa-microphone",
        title: "Pronunciation Practice",
        desc: `Focus on English vowel sounds and intonation patterns`,
        color: "#8b5cf6",
      },
      {
        icon: "fa-comments",
        title: "Daily Conversation",
        desc: "Practice with the AI tutor for 15 minutes daily",
        color: "#10b981",
      },
      {
        icon: "fa-pen",
        title: "Grammar Exercises",
        desc: "Complete English verb tense and sentence structure drills",
        color: "#f59e0b",
      },
    ],
  },

  // ── FRENCH ────────────────────────────────────────────────────────────────
  fr: {
    fullName: "French",
    grammar: [
      {
        q: "Choisissez la forme correcte du verbe 'être' : 'Ils ___ étudiants.'",
        opts: ["est", "suis", "sont", "êtes"],
        c: 2,
      },
      {
        q: "Choisissez la bonne forme négative : 'Je ___ parle ___ espagnol.'",
        opts: ["ne ... pas", "ne ... jamais", "pas ... ne", "ne ... rien"],
        c: 0,
      },
      {
        q: "Quel article est correct ? '___ chat est sur ___ table.'",
        opts: ["Un / une", "Le / la", "La / le", "Un / le"],
        c: 1,
      },
      {
        q: "Choisissez le bon accord de l'adjectif : 'C'est une ___ maison.' (beau)",
        opts: ["beau", "bel", "belle", "beaux"],
        c: 2,
      },
      {
        q: "Quelle est la forme correcte du passé composé ? 'Hier, elle ___ au cinéma.'",
        opts: ["a allée", "est allée", "était allée", "avait allée"],
        c: 1,
      },
    ],
    reading: [
      {
        text: "Le français est une langue romane parlée par environ 300 millions de personnes dans le monde. C'est la langue officielle de 29 pays et l'une des six langues officielles des Nations Unies. Le français est réputé pour sa richesse littéraire, de Molière à Victor Hugo en passant par Albert Camus.",
        q: "Combien de personnes parlent français dans le monde ?",
        opts: ["100 millions", "200 millions", "300 millions", "400 millions"],
        c: 2,
      },
      {
        text: "La cuisine française est reconnue dans le monde entier pour sa sophistication et sa diversité. Des fromages aux vins, en passant par les pâtisseries et les plats gastronomiques, la gastronomie française a été inscrite au patrimoine culturel immatériel de l'UNESCO en 2010.",
        q: "Qu'est-ce qui a été inscrit au patrimoine de l'UNESCO ?",
        opts: [
          "Les vins français",
          "Les fromages français",
          "La gastronomie française",
          "Les pâtisseries françaises",
        ],
        c: 2,
      },
      {
        text: "Paris, la capitale de la France, est l'une des villes les plus visitées au monde. Avec ses musées mondialement connus comme le Louvre, ses monuments emblématiques comme la Tour Eiffel, et ses quartiers historiques, Paris attire chaque année des millions de touristes.",
        q: "Que mentionne le texte comme l'un des musées de Paris ?",
        opts: [
          "Le Musée d'Orsay",
          "Le Centre Pompidou",
          "Le Louvre",
          "Le Musée Picasso",
        ],
        c: 2,
      },
    ],
    pronunciation: {
      A1: [
        "Bonjour, je m'appelle Pierre. J'habite en France avec ma famille. J'aime beaucoup jouer au football avec mes amis le weekend. J'ai aussi un chien noir qui s'appelle Max. Il est très intelligent et affectueux. J'aime marcher avec lui dans le parc. Max aime les balles et les jeux.",
        "Salut, mon nom est Amelie. Je suis étudiante à l'université. J'aime étudier les langues, surtout l'anglais et l'espagnol. Je viens d'une petite ville en Provence. Mes parents travaillent dans le commerce. Nous sommes une famille très unie et heureuse. J'aime beaucoup mes parents.",
        "Bonjour à tous. Je m'appelle Dominique et je suis musicien. Je joue du piano depuis que je suis enfant. J'aime aussi chanter et écouter différents types de musique. Chaque jour je pratique mes instruments pendant deux heures. La musique me rend très heureux et apaise mon esprit. Je joue aussi de la guitare.",
        "Hello, je suis Thomas. Je travaille comme vendeur dans un magasin de vêtements. Mon travail est intéressant car je rencontre beaucoup de gens différents. J'aime aider les clients à trouver les vêtements qu'ils cherchent. Je suis content de mon travail et mes collègues sont sympathiques et gentils. Les clients me disent merci souvent.",
        "Bonjour, je m'appelle Celine. Je viens de Paris mais maintenant j'habite à Lyon. J'aime beaucoup voyager et explorer de nouveaux endroits. J'ai visité plusieurs pays d'Europe et j'aimerais visiter l'Asie bientôt. Les voyages m'enrichissent et me permettent de rencontrer des gens intéressants. J'aime prendre des photos.",
      ],
      A2: [
        "Bonjour, je m'appelle Jacques et je travaille comme professeur dans une école primaire. Chaque matin, j'enseigne la lecture et les mathématiques à des enfants. J'aime beaucoup mon travail parce que les enfants sont curieux et amusants. Après l'école, je rentre à la maison où j'aime me détendre et lire des livres. Ma famille est très importante pour moi. Le soir je cuisine le dîner.",
        "Salut, je m'appelle Francoise. Je suis infirmière à l'hôpital et mon travail est très important. Chaque jour, j'aide les patients à se sentir mieux et je les soigne avec compassion. Mon travail peut être difficile mais je suis satisfaite de pouvoir aider les gens. Mes collègues sont comme ma famille et nous nous entraidons toujours. Nous travaillons ensemble.",
        "Bonjour à vous. Mon nom est Sylvain. Je suis agriculteur et je travaille dans les champs toute l'année. J'ai une ferme avec des animaux et des cultures variées. Je me lève très tôt le matin pour commencer mon travail. J'aime vivre à la campagne et travailler avec la terre. C'est un travail difficile mais gratifiant. J'aime mon travail.",
        "Hello, je m'appelle Nicole. J'aime voyager et j'ai récemment visité trois pays européens différents. J'ai appris beaucoup sur les différentes cultures et les traditions locales. J'ai rencontré des gens très intéressants et j'ai mangé des plats délicieux. Voyager m'inspire et élargit ma perspicacité sur le monde. Je veux voyager en Asie.",
        "Bonjour, mon nom est Laurent. Je suis ingénieur dans une entreprise de technologie. Mon travail consiste à concevoir et à résoudre des problèmes techniques complexes. J'aime mon travail parce qu'il est stimulant et créatif. Je travaille avec une équipe talentueuse et innovante. Mon entreprise nous encourage à apprendre et à nous développer professionnellement. Nous avons des réunions.",
      ],
      B1: [
        "Bonjour, je m'appelle Philippe et je travaille dans le secteur du tourisme. Je suis très intéressé par la découverte de différentes cultures et l'exploration de nouveaux endroits. L'année dernière, j'ai voyagé en Italie et j'ai eu une expérience magnifique. J'ai visité des monuments historiques, des musées extraordinaires et dégusté la cuisine locale. J'ai appris quelques phrases en italien. Je prévois d'y retourner l'année prochaine.",
        "Salut, je m'appelle Veronique. Je suis responsable marketing dans une entreprise de technologie. Mon travail implique la création de campagnes publicitaires, l'analyse des données et la communication avec les clients. Le travail peut être difficile mais très gratifiant. J'aime collaborer avec mon équipe car chacun apporte des idées différentes. Nous nous réunissons régulièrement pour discuter de stratégies nouvelles.",
        "Bonjour, je m'appelle Michel et j'ai une passion pour la photographie. J'aime photographier la nature, les gens et l'architecture dans différents lieux. Mes photographies ont été exposées dans plusieurs galeries. La photographie m'a enseigné à voir le monde différemment et à apprécier les petits détails. Je suis heureux de pouvoir partager mon amour pour la photographie avec les autres.",
        "Salut, je m'appelle Catherine et je suis infirmière dans un hôpital très occupé. Mon travail est important car j'aide les patients chaque jour. Je travaille longues heures mais je trouve une grande satisfaction en offrant des soins. Mes collègues sont comme une famille pour moi. Nous nous soutenons mutuellement dans les situations difficiles.",
        "Bonjour à tous. Je m'appelle Bernard et je suis étudiant en commerce. Je travaille aussi à temps partiel dans un restaurant local. Équilibrer les deux responsabilités requiert une bonne gestion du temps. Mes cours universitaires m'enseignent des leçons précieuses sur l'économie et le leadership. Mon travail m'enseigne des compétences en service à la clientèle très utiles.",
      ],
      B2: [
        "Bonjour, je m'appelle Alexandra et je travaille comme gestionnaire de projet pour une entreprise de construction internationale. Bien que le projet ait été très difficile, notre équipe dévouée a réussi à le terminer avant la date prévue. Le succès dépendait d'une excellente communication entre tous les départements et d'une compréhension claire de nos objectifs. J'ai appris des leçons précieuses sur la coordination d'équipe. La diversité culturelle de notre équipe a apporté des perspectives innovantes.",
        "Salut, je m'appelle Etienne. La diversité du marché local dans ma ville reflète l'héritage culturel riche de la région. Je visite régulièrement le marché pour explorer les produits artisanaux et les aliments traditionnels. Soutenir les entreprises locales aide à préserver les compétences traditionnelles. Le marché n'est pas seulement un lieu de commerce mais aussi un point de rencontre où les gens échangent leurs traditions.",
        "Bonjour, je m'appelle Madeleine. La technologie contemporaine a transformé fondamentalement notre manière de communiquer, de travailler et de vivre. Les réunions vidéo nous permettent de nous connecter avec des collègues partout dans le monde instantanément. Cependant, la connectivité numérique accrue soulève des inquiétudes concernant la confidentialité des données. Nous devons considérer attentivement les bénéfices et les défis que la technologie présente.",
        "Salut, je m'appelle Renaud et je suis scientifique dans un laboratoire de recherche. Les participants à notre projet de recherche ont été encouragés à analyser les données critiquement. Nous avons mené des expériences pendant plusieurs mois et documenté nos résultats détaillés. L'environnement collaboratif nous a permis de développer des conclusions plus robustes. Cette approche rigoureuse nous a aidé à produire une recherche significative.",
        "Bonjour, je m'appelle Claudine. La politique gouvernementale sur les énergies renouvelables reflète un engagement envers la durabilité environnementale. Les panneaux solaires et les éoliennes alimentent de plus en plus nos communautés. Investir dans la technologie verte crée des emplois tout en protégeant notre planète. Bien que la transition nécessite des investissements importants, les bénéfices justifient ces efforts à long terme.",
      ],
      C1: [
        "Bonjour, je m'appelle Dr. Christophe Fontaine et je me spécialise en économie environnementale. La juxtaposition des méthodologies traditionnelles avec les approches contemporaines élucide les changements paradigmatiques fondamentaux. Les modèles économiques classiques ne tenaient pas compte des externalités environnementales et des implications de durabilité à long terme. Les approches modernes intègrent les considérations écologiques dans les cadres économiques. Cette évolution intellectuelle reflète notre compréhension croissante que la protection environnementale et la prospérité économique doivent être intrinsèquement liées.",
        "Salut, je m'appelle Professeur Beatrice Delacroix. Malgré les complexités multifacettes inhérentes à la recherche linguistique, les chercheurs ont persévéré avec une ténacité admirable. Notre étude longitudinale a examiné les variations phonétiques, les structures morphosyntaxiques et les fonctions pragmatiques du langage. Les chercheurs ont employé des méthodologies statistiques sophistiquées. Les conclusions suggèrent que le langage sert non seulement comme outil de communication mais aussi comme marqueur d'identité sociale.",
        "Bonjour, je m'appelle Dr. Monique Leclerc. La prolifération de la désinformation dans les écosystèmes numériques nécessite des initiatives complètes de littératie numérique. Les institutions éducatives doivent intégrer la pensée critique et l'évaluation des sources dans les curricula. Les organisations médiatiques ont besoin d'établir des protocoles rigoureux de vérification des faits. De plus, les entreprises technologiques doivent développer des mécanismes pour identifier et réduire l'amplification algorithmique des fausses informations.",
        "Salut, je m'appelle Professeur Genevieve Moreau. Cette interprétation nuancée de la doctrine philosophique révèle des connotations précédemment négligées qui remettent en question la compréhension conventionnelle. En employant l'analyse herméneutique, nous pouvons discerner des significations subtiles intégrées dans les textes historiques. La méthodologie requiert une lecture attentive et une conscience contextuelle. L'examen attentif révèle souvent que les œuvres philosophiques complexes contiennent plusieurs possibilités interprétatives simultanément.",
        "Bonjour, je m'appelle Professeur Henri Dubois. La synthèse des perspectives interdisciplinaires a engendré des intuitions sans précédent sur le phénomène de la conscience. La neuroscience, la philosophie et la science cognitive convergent pour créer des cadres théoriques plus complets. Les études récentes d'imagerie cérébrale associées à l'enquête philosophique ont remis en question les hypothèses précédemment établies. Cette intégration de perspectives méthodologiques diverses représente une frontière passionnante dans la connaissance humaine.",
      ],
      C2: [
        "Distingués collègues, je m'appelle Dr. Theodor Michaux. Les ramifications épistémologiques de ce cadre théorique nécessitent une reconsidération exhaustive des paradigmes établis qui ont soutenu notre discipline. Les implications s'étendent au-delà du raffinement théorique pour reconstituer fondamentalement nos engagements ontologiques et nos présupposés méthodologiques. Les approches traditionnelles, fondées sur des hypothèses positivistes, s'avèrent inadéquates pour les phénomènes présentant des propriétés émergentes. Conséquemment, nous devons embrasser le pluralisme épistémologique.",
        "Estimés collègues, je m'appelle Professeur Victoria Ashford-Sterling. Les subtilités philologiques inhérentes à ce corpus linguistique exemplifient la polyphonie sémantique inhérente au langage naturel et son opacité résolument résistante à l'interprétation univoque. Les analyses diachroniques révèlent un superposition de strates étymologiques, portant chacune des traces de rencontres culturelles. Le défi herméneutique confrontant notre discipline exige une attention sophistiquée aux particularités morphosyntaxiques. En outre, cet engagement nécessite une humilité épistémologique reconnaissant la polysémie irréductible du langage.",
        "Honorés membres de l'académie, je m'appelle Dr. Jean-François Kellerman. La déconstruction herméneutique de ce texte fondamental révèle des complexités souterraines et des subterfuges idéologiques qui sapent les cadres interprétatifs conventionnels. La méthodologie déconstructive de Derrida expose comment la signification opère à travers la différance, établissant simultanément du sens à travers la présence tout en le différant par l'absence. Cette aporie paradoxale illumine l'instabilité fondamentale du langage. Conséquemment, la pratique interprétative doit embrasser l'indétermination productive.",
        "Vénérables savants, je m'appelle Professeur Leonardo Vincenzo. La tension dialectique entre les positions déterministes fondées sur la fermeture causale et la métaphysique indéterministe célébrant l'agentivité libertarienne engendre de profondes énigmes métaphysiques. La philosophie contemporaine des sciences, informée par l'indétermination quantique, a démontré que les mécanismes déterministes constituent des idéalisations. Cette reconceptualisation scientifique exige un ajustement philosophique correspondant. Réconcilier les conclusions scientifiques avec les engagements philosophiques demeure un défi formidable.",
        "Très estimés collègues, je m'appelle Dr. Cornelius Blackwood-Sutherland. L'apothéose de la sophistication technologique engendre paradoxalement des anxiétés existentielles concernant le statut ontologique de l'agentivité humaine. À mesure que les systèmes computationnels démontrant des capacités sophistiquées de reconnaissance de modèles prolifèrent, des questions fondamentales émergent concernant l'autonomie authentique, le déterminisme technologique et les trajectoires transhumanistes. Nous affrontons une véritable aporie: l'augmentation technologique augmente et potentiellement sape simultanément l'épanouissement humain.",
      ],
    },
    speakingTopic:
      "Parlez-moi d'un souvenir de voyage ou d'un endroit que vous aimeriez visiter.",
    writingPrompt:
      "Écrivez un court paragraphe (50–100 mots) décrivant votre routine matinale. Utilisez au moins 3 verbes différents au présent.",
    writingVocab: [
      "ensuite",
      "également",
      "cependant",
      "donc",
      "par conséquent",
    ],
    recommendations: () => [
      {
        icon: "fa-microphone",
        title: "Pratique de la prononciation",
        desc: "Concentrez-vous sur les sons nasaux et les liaisons en français",
        color: "#8b5cf6",
      },
      {
        icon: "fa-comments",
        title: "Conversation quotidienne",
        desc: "Pratiquez avec le tuteur IA pendant 15 minutes par jour",
        color: "#10b981",
      },
      {
        icon: "fa-pen",
        title: "Exercices de grammaire",
        desc: "Maîtrisez les conjugaisons et les accords en français",
        color: "#f59e0b",
      },
    ],
  },

  // ── SPANISH ───────────────────────────────────────────────────────────────
  es: {
    fullName: "Spanish",
    grammar: [
      {
        q: "Elige la forma correcta del verbo 'ser/estar': 'El café ___ caliente.'",
        opts: ["es", "está", "son", "están"],
        c: 1,
      },
      {
        q: "Selecciona el pronombre correcto: 'Yo ___ estudiante.'",
        opts: ["soy", "estoy", "ser", "eres"],
        c: 0,
      },
      {
        q: "¿Cuál es el artículo correcto? '___ libro está sobre ___ mesa.'",
        opts: ["Un / una", "El / la", "La / el", "Un / el"],
        c: 1,
      },
      {
        q: "Elige la forma del pretérito indefinido: 'Ayer yo ___ al mercado.'",
        opts: ["voy", "fui", "iba", "vaya"],
        c: 1,
      },
      {
        q: "Selecciona la forma correcta del subjuntivo: 'Espero que tú ___ mañana.'",
        opts: ["vengas", "vienes", "vendrás", "veniste"],
        c: 0,
      },
    ],
    reading: [
      {
        text: "El español es la segunda lengua materna más hablada del mundo, con más de 500 millones de hablantes nativos. Es el idioma oficial de 21 países y uno de los seis idiomas oficiales de las Naciones Unidas. Su influencia cultural abarca la literatura, la música y el cine.",
        q: "¿Cuántos hablantes nativos tiene el español?",
        opts: [
          "Más de 100 millones",
          "Más de 300 millones",
          "Más de 500 millones",
          "Más de 700 millones",
        ],
        c: 2,
      },
      {
        text: "La paella es uno de los platos más representativos de la cocina española, especialmente de la región de Valencia. Originalmente era un plato humilde de los agricultores valencianos, preparado con arroz, verduras y proteínas disponibles localmente.",
        q: "¿De qué región de España es originaria la paella?",
        opts: ["Cataluña", "Andalucía", "Valencia", "Madrid"],
        c: 2,
      },
      {
        text: "El Festival de San Fermín, celebrado en Pamplona cada julio, es famoso mundialmente por el encierro de toros. Miles de personas corren delante de los toros por las calles del casco histórico de la ciudad, una tradición que data del siglo XIV.",
        q: "¿En qué mes se celebra el Festival de San Fermín?",
        opts: ["Junio", "Julio", "Agosto", "Septiembre"],
        c: 1,
      },
    ],
    pronunciation: {
      A1: [
        "Buenos días, me llamo Antonio. Yo vivo en España con mi familia. Me encanta jugar al fútbol con mis amigos los fines de semana. También tengo un perro negro que se llama Max. Es muy inteligente y cariñoso. Me gusta pasear con él en el parque. Max come dos veces al día.",
        "Hola, mi nombre es Rosa. Soy estudiante en la universidad. Me encanta estudiar idiomas, especialmente inglés y francés. Vengo de un pequeño pueblo en Andalucía. Mis padres trabajan en comercio. Somos una familia muy unida y feliz. Me encanta pasar tiempo con mi familia.",
        "Buenos días a todos. Me llamo Diego y soy músico. Toco la guitarra desde que era niño. También me gusta cantar y escuchar diferentes tipos de música. Cada día practico mis instrumentos durante dos horas. La música me hace muy feliz. También toco el piano.",
        "Hola, soy Fernando. Trabajo como vendedor en una tienda de ropa. Mi trabajo es interesante porque conozco a mucha gente diferente. Me encanta ayudar a los clientes a encontrar la ropa que buscan. Estoy contento con mi trabajo y mis colegas son muy simpáticos. Los clientes me dicen gracias.",
        "Buenos días, me llamo Elena. Vengo de Madrid pero ahora vivo en Barcelona. Me encanta viajar y explorar nuevos lugares. He visitado varios países de Europa y me gustaría visitar Asia pronto. Los viajes me enriquecen mucho. Me encanta tomar fotos cuando viajo.",
      ],
      A2: [
        "Buenos días, me llamo Pablo y trabajo como profesor en una escuela primaria. Cada mañana enseño lectura y matemáticas a los niños. Me encanta mi trabajo porque los niños son curiosos y divertidos. Después de la escuela regreso a casa donde me gusta relajarme y leer libros. Mi familia es muy importante para mí. Por la noche cocino la cena.",
        "Hola, me llamo Teresa. Soy enfermera en el hospital y mi trabajo es muy importante. Cada día ayudo a los pacientes a sentirse mejor y los cuido con compasión. Mi trabajo puede ser difícil pero estoy satisfecha de poder ayudar a las personas. Mis colegas son como mi familia. Trabajamos juntos todos los días.",
        "Buenos días a todos. Mi nombre es Javier. Soy agricultor y trabajo en los campos todo el año. Tengo una granja con animales y diferentes culturas. Me levanto muy temprano cada mañana para comenzar mi trabajo. Me encanta vivir en el campo. Es un trabajo difícil pero gratificante. Amo mi trabajo.",
        "Hola, me llamo Marta. Me encanta viajar y recientemente visité tres países europeos diferentes. Aprendí mucho sobre las diferentes culturas y tradiciones locales. Conocí a personas muy interesantes y comí platos deliciosos. Viajar me inspira mucho. Quiero visitar Asia.",
        "Buenos días, mi nombre es Manuel. Soy ingeniero en una empresa de tecnología. Mi trabajo consiste en diseñar y resolver problemas técnicos complejos. Me encanta mi trabajo porque es desafiante y creativo. Trabajo con un equipo talentoso e innovador. Mi empresa nos anima a aprender y desarrollarnos. Tenemos reuniones.",
      ],
      B1: [
        "Buenos días, me llamo Felipe y trabajo en el sector del turismo. Estoy muy interesado en descubrir diferentes culturas y explorar nuevos lugares. El año pasado viajé a Italia y tuve una experiencia magnífica. Visité monumentos históricos, museos extraordinarios y degusté la cocina local. Aprendí algunas frases en italiano. Planeo regresar el año que viene.",
        "Hola, me llamo Verónica. Soy responsable de marketing en una empresa de tecnología. Mi trabajo implica crear campañas publicitarias, analizar datos y comunicarme con clientes. El trabajo puede ser difícil pero muy gratificante. Me encanta colaborar con mi equipo porque cada persona aporta ideas diferentes. Nos reunimos regularmente para discutir estrategias nuevas.",
        "Buenos días, me llamo Miguel y tengo una pasión por la fotografía. Me encanta fotografiar la naturaleza, las personas y la arquitectura en diferentes lugares. Mis fotografías han sido expuestas en varias galerías. La fotografía me ha enseñado a ver el mundo diferente. Soy feliz de poder compartir mi amor por la fotografía con otros.",
        "Hola, me llamo Catalina y soy enfermera en un hospital muy ocupado. Mi trabajo es importante porque ayudo a los pacientes cada día. Trabajo muchas horas pero encuentro gran satisfacción en ofrecer cuidados. Mis colegas son como mi familia. Nos apoyamos mutuamente en situaciones difíciles.",
        "Buenos días a todos. Me llamo Bernardo y soy estudiante de comercio. También trabajo a tiempo parcial en un restaurante local. Equilibrar las dos responsabilidades requiere buena gestión del tiempo. Mis cursos universitarios me enseñan lecciones valiosas sobre economía y liderazgo. Mi trabajo me enseña competencias útiles en servicio al cliente.",
      ],
      B2: [
        "Buenos días, me llamo Alexandra y trabajo como gerente de proyecto para una empresa de construcción internacional. Aunque el proyecto fue muy difícil, nuestro equipo dedicado logró terminarlo antes de la fecha prevista. El éxito dependía de excelente comunicación entre todos los departamentos y comprensión clara de nuestros objetivos. Aprendí lecciones valiosas sobre coordinación de equipo. La diversidad cultural de nuestro equipo aportó perspectivas innovadoras.",
        "Hola, me llamo Esteban. La diversidad del mercado local en mi ciudad refleja el patrimonio cultural rico de la región. Visito regularmente el mercado para explorar productos artesanales y alimentos tradicionales. Apoyar a negocios locales ayuda a preservar las competencias tradicionales. El mercado no es solo un lugar de comercio sino también un punto de encuentro.",
        "Buenos días, me llamo Magdalena. La tecnología contemporánea ha transformado fundamentalmente nuestra manera de comunicarnos, trabajar y vivir. Las reuniones de vídeo nos permiten conectarnos con colegas alrededor del mundo instantáneamente. Sin embargo, la conectividad digital aumentada plantea preocupaciones sobre privacidad de datos. Debemos considerar cuidadosamente los beneficios y desafíos que la tecnología presenta.",
        "Hola, me llamo Renato y soy científico en un laboratorio de investigación. Los participantes de nuestro proyecto de investigación fueron alentados a analizar datos críticamente. Realizamos experimentos durante varios meses y documentamos resultados detallados. El ambiente colaborativo nos permitió desarrollar conclusiones más robustas. Este enfoque riguroso nos ayudó a producir investigación significativa.",
        "Buenos días, me llamo Claudia. La política gubernamental sobre energías renovables refleja un compromiso con la sostenibilidad ambiental. Los paneles solares y los aerogeneradores alimentan cada vez más nuestras comunidades. Invertir en tecnología verde crea empleos mientras protege nuestro planeta. Aunque la transición requiere inversiones importantes, los beneficios justifican estos esfuerzos a largo plazo.",
      ],
      C1: [
        "Buenos días, me llamo Dr. Cristóbal Fontaine y me especializo en economía ambiental. La yuxtaposición de metodologías tradicionales con enfoques contemporáneos dilucida cambios paradigmáticos fundamentales. Los modelos económicos clásicos no tenían en cuenta las externalidades ambientales e implicaciones de sostenibilidad a largo plazo. Los enfoques modernos integran consideraciones ecológicas en marcos económicos. Esta evolución intelectual refleja nuestra comprensión creciente de que la protección ambiental y prosperidad económica deben estar intrínsecamente vinculadas.",
        "Hola, me llamo Profesora Beatriz Delacroix. A pesar de las complejidades multifacéticas inherentes a la investigación lingüística, los investigadores perseveraron con una tenacidad admirable. Nuestro estudio longitudinal examinó variaciones fonéticas, estructuras morfosintácticas y funciones pragmáticas del lenguaje. Los investigadores emplearon metodologías estadísticas sofisticadas. Las conclusiones sugieren que el lenguaje sirve no solo como herramienta de comunicación sino como marcador de identidad social.",
        "Buenos días, me llamo Dra. Mónica Leclerc. La proliferación de desinformación en ecosistemas digitales requiere iniciativas integrales de alfabetización digital. Las instituciones educativas deben integrar pensamiento crítico y evaluación de fuentes en currículos. Las organizaciones mediáticas necesitan establecer protocolos rigurosos de verificación de hechos. Además, las empresas tecnológicas deben desarrollar mecanismos para identificar y reducir amplificación algorítmica de información falsa.",
        "Hola, me llamo Profesora Genoveva Moreau. Esta interpretación matizada de la doctrina filosófica revela connotaciones previamente pasadas por alto que cuestionan la comprensión convencional. Al emplear análisis hermenéutico, podemos discernir significados sutiles integrados en textos históricos. La metodología requiere lectura atenta y conciencia contextual. El examen cuidadoso frecuentemente revela que obras filosóficas complejas contienen múltiples posibilidades interpretativas simultáneamente.",
        "Buenos días, me llamo Profesor Enrique Dubois. La síntesis de perspectivas interdisciplinarias ha generado insights sin precedentes sobre el fenómeno de la conciencia. La neurociencia, la filosofía y la ciencia cognitiva convergen para crear marcos teóricos más completos. Estudios recientes de imagen cerebral asociados con indagación filosófica han cuestionado hipótesis previamente establecidas. Esta integración de perspectivas metodológicas diversas representa una frontera emocionante en conocimiento humano.",
      ],
      C2: [
        "Distinguidos colegas, me llamo Dr. Teodoro Michaux. Las ramificaciones epistemológicas de este marco teórico requieren reconsideración exhaustiva de paradigmas establecidos que han sostenido nuestra disciplina. Las implicaciones se extienden más allá del refinamiento teórico para reconstituir fundamentalmente nuestros compromisos ontológicos y presupuestos metodológicos. Los enfoques tradicionales, fundados en hipótesis positivistas, resultan inadecuados para fenómenos presentando propiedades emergentes. Consiguientemente, debemos abrazar pluralismo epistemológico.",
        "Estimados colegas, me llamo Profesora Victoria Ashford-Sterling. Las sutilezas filológicas inherentes a este corpus lingüístico ejemplifican la polifonía semántica inherente al lenguaje natural y su opacidad resueltamente resistente a interpretación unívoca. Los análisis diacrónicos revelan superposición de estratos etimológicos, cada cual portando trazas de encuentros culturales. El desafío hermenéutico confrontando nuestra disciplina exige atención sofisticada a particularidades morfosintácticas. Además, este compromiso necesita humildad epistemológica reconociendo polisemia irreducible del lenguaje.",
        "Honorados miembros de la academia, me llamo Dr. Juan-Francisco Kellerman. La deconstrucción hermenéutica de este texto fundamental revela complejidades subtextuales y subterfugios ideológicos que socavan marcos interpretativos convencionales. La metodología deconstructiva de Derrida expone cómo la significación opera mediante la diferancia, estableciendo simultáneamente significado mediante presencia mientras lo difiere mediante ausencia. Esta aporía paradójica ilumina inestabilidad fundamental del lenguaje. Consiguientemente, práctica interpretativa debe abrazar indeterminación productiva.",
        "Venerables sabios, me llamo Profesor Leonardo Vincenzo. La tensión dialéctica entre posiciones deterministas fundadas en cierre causal y metafísica indeterminista celebrando agentividad libertaria engendra profundos enigmas metafísicos. La filosofía contemporánea de ciencias, informada por indeterminación cuántica, ha demostrado que mecanismos deterministas constituyen idealizaciones. Esta reconceptualización científica exige ajuste filosófico correspondiente. Reconciliar conclusiones científicas con compromisos filosóficos permanece desafío formidable.",
        "Muy estimados colegas, me llamo Dr. Cornelio Blackwood-Sutherland. La apoteosis de sofisticación tecnológica engendra paradójicamente ansiedades existenciales concernientes al estatus ontológico de agentividad humana dentro ensamblajes sociotécnicos. Conforme sistemas computacionales demostrando capacidades sofisticadas de reconocimiento de patrones proliferan atravesando dominios previamente constituyendo prerrogativas cognitivas únicamente humanas, preguntas fundamentales emergen concernientes autenticidad auténtica, determinismo tecnológico y trayectorias transhumanistas. Confrontamos aporia genuina: aumentación tecnológica simultáneamente expande y potencialmente socava florecimiento humano.",
      ],
    },
    speakingTopic:
      "Cuéntame sobre un recuerdo de viaje especial o un lugar que te gustaría visitar.",
    writingPrompt:
      "Escribe un párrafo corto (50–100 palabras) describiendo tu rutina matutina. Usa al menos 3 verbos diferentes en presente.",
    writingVocab: [
      "además",
      "sin embargo",
      "por lo tanto",
      "finalmente",
      "asimismo",
    ],
    recommendations: () => [
      {
        icon: "fa-microphone",
        title: "Práctica de pronunciación",
        desc: 'Enfócate en los sonidos de la "r" y la "ll" en español',
        color: "#8b5cf6",
      },
      {
        icon: "fa-comments",
        title: "Conversación diaria",
        desc: "Practica con el tutor de IA durante 15 minutos al día",
        color: "#10b981",
      },
      {
        icon: "fa-pen",
        title: "Ejercicios de gramática",
        desc: "Domina el subjuntivo y los tiempos del pasado en español",
        color: "#f59e0b",
      },
    ],
  },

  // ── GERMAN ────────────────────────────────────────────────────────────────
  de: {
    fullName: "German",
    grammar: [
      {
        q: "Wähle den richtigen Artikel (Nominativ): '___ Hund spielt im Garten.' (maskulin)",
        opts: ["Die", "Das", "Der", "Den"],
        c: 2,
      },
      {
        q: "Wähle die richtige Verbform: 'Er ___ jeden Tag zur Schule gehen.' (müssen)",
        opts: ["muss", "musst", "müssen", "müsst"],
        c: 0,
      },
      {
        q: "Welche Verneinung ist korrekt? 'Ich spreche ___ Chinesisch.'",
        opts: ["kein", "keine", "nicht", "nein"],
        c: 2,
      },
      {
        q: "Wähle den richtigen Akkusativ: 'Ich kaufe ___ Apfel.' (maskulin)",
        opts: ["der", "den", "die", "das"],
        c: 1,
      },
      {
        q: "Wähle das richtige Hilfsverb im Perfekt: 'Sie ___ gestern ins Kino gegangen.'",
        opts: ["haben", "hat", "ist", "sind"],
        c: 2,
      },
    ],
    reading: [
      {
        text: "Deutsch wird von etwa 100 Millionen Menschen als Muttersprache gesprochen und ist die meistgesprochene Muttersprache in der Europäischen Union. Deutsch ist Amtssprache in Deutschland, Österreich, der Schweiz, Liechtenstein und weiteren Ländern. Es ist eine der wichtigsten Wissenschaftssprachen der Welt.",
        q: "In wie vielen der genannten Länder ist Deutsch Amtssprache?",
        opts: ["2", "3", "4", "5"],
        c: 2,
      },
      {
        text: "Das Oktoberfest ist das größte Volksfest der Welt und findet jährlich in München statt. Es beginnt normalerweise im September und endet in den ersten Oktober-Tagen. Millionen von Besuchern aus aller Welt kommen jedes Jahr nach Bayern, um bayerische Musik, Trachten und Bier zu genießen.",
        q: "Wann beginnt das Oktoberfest normalerweise?",
        opts: ["Im Juli", "Im August", "Im September", "Im Oktober"],
        c: 2,
      },
      {
        text: "Die Berliner Mauer war eine Grenzanlage, die West-Berlin von der DDR umschloss. Sie wurde am 13. August 1961 errichtet und trennte Familien und Freunde für fast drei Jahrzehnte. Am 9. November 1989 fiel die Mauer — ein historisches Ereignis, das die Wiedervereinigung Deutschlands einleitete.",
        q: "Wann fiel die Berliner Mauer?",
        opts: [
          "13. August 1961",
          "9. November 1989",
          "3. Oktober 1990",
          "1. Januar 1991",
        ],
        c: 1,
      },
    ],
    pronunciation: {
      A1: [
        "Guten Morgen, ich heiße Peter. Ich wohne in Deutschland mit meiner Familie. Ich spiele gerne Fußball mit meinen Freunden am Wochenende. Ich habe auch einen schwarzen Hund, der Max heißt. Er ist sehr intelligent und liebevoll. Ich gehe gerne mit ihm im Park spazieren. Max isst zweimal am Tag.",
        "Hallo, mein Name ist Annika. Ich bin Studentin an der Universität. Ich liebe es, Sprachen zu studieren, besonders Englisch und Spanisch. Ich komme aus einer kleinen Stadt in Bayern. Meine Eltern arbeiten im Handel. Wir sind eine sehr glückliche Familie. Ich liebe meine Eltern.",
        "Guten Morgen an alle. Ich heiße Dieter und bin Musiker. Ich spiele Klavier seit meiner Kindheit. Ich singe auch gerne und höre verschiedene Arten von Musik. Jeden Tag übe ich meine Instrumente für zwei Stunden. Musik macht mich sehr glücklich. Ich spiele auch Gitarre.",
        "Hallo, ich bin Frank. Ich arbeite als Verkäufer in einem Bekleidungsgeschäft. Meine Arbeit ist interessant, weil ich viele verschiedene Menschen treffe. Ich helfe Kunden gerne, die Kleidung zu finden, die sie suchen. Ich bin mit meiner Arbeit zufrieden und meine Kollegen sind sympathisch. Die Kunden sagen mir danke.",
        "Guten Morgen, ich heiße Claudia. Ich komme aus Berlin, aber jetzt wohne ich in München. Ich liebe es zu reisen und neue Orte zu erkunden. Ich habe mehrere Länder in Europa besucht und möchte bald Asien besuchen. Das Reisen bereichert mich sehr. Ich liebe Fotografie.",
      ],
      A2: [
        "Guten Morgen, ich heiße Jakob und ich arbeite als Lehrer in einer Grundschule. Jeden Morgen unterrichte ich Lesen und Mathematik an Kinder. Ich liebe meinen Job, weil die Kinder neugierig und lustig sind. Nach der Schule gehe ich nach Hause und entspanne mich gerne mit Bücherlesen. Meine Familie ist sehr wichtig für mich. Am Abend koche ich Abendessen.",
        "Hallo, ich heiße Johanna. Ich bin Krankenschwester im Krankenhaus und meine Arbeit ist sehr wichtig. Jeden Tag helfe ich den Patienten sich besser zu fühlen. Meine Arbeit kann schwierig sein, aber ich bin zufrieden, Menschen zu helfen. Meine Kollegen sind wie meine Familie. Wir arbeiten zusammen.",
        "Guten Morgen an alle. Mein Name ist Helmut. Ich bin Bauer und arbeite das ganze Jahr über auf den Feldern. Ich habe einen Bauernhof mit verschiedenen Tieren und Kulturen. Ich stehe sehr früh auf, um meine Arbeit zu beginnen. Ich liebe das Leben auf dem Land. Es ist schwierige aber erfüllende Arbeit. Ich liebe meine Arbeit.",
        "Hallo, ich heiße Margarete. Ich liebe es zu reisen und habe kürzlich drei verschiedene europäische Länder besucht. Ich lernte viel über verschiedene Kulturen und lokale Traditionen. Ich traf sehr interessante Menschen und aß köstliche Gerichte. Das Reisen inspiriert mich sehr. Ich möchte Asien besuchen.",
        "Guten Morgen, mein Name ist Norbert. Ich bin Ingenieur in einem Technologieunternehmen. Meine Arbeit besteht darin, technische Probleme zu entwerfen und zu lösen. Ich liebe meine Arbeit, weil sie herausfordernd und kreativ ist. Ich arbeite mit einem talentierten und innovativen Team. Mein Unternehmen ermutigt uns zu lernen und mich weiterzuentwickeln. Wir haben Meetings.",
      ],
      B1: [
        "Guten Morgen, ich heiße Philipp und ich arbeite im Tourismussektorin. Ich bin sehr daran interessiert, verschiedene Kulturen zu entdecken und neue Orte zu erkunden. Letztes Jahr reiste ich nach Italien und hatte eine wunderbare Erfahrung. Ich besuchte historische Denkmäler, außergewöhnliche Museen und kostete lokale Gerichte. Ich lernte einige italienische Sätze. Ich plane, nächstes Jahr zurückzukehren.",
        "Hallo, ich heiße Veronica. Ich bin Marketingleiterin in einem Technologieunternehmen. Meine Arbeit umfasst die Erstellung von Werbekampagnen, Datenanalyse und Kommunikation mit Kunden. Die Arbeit kann schwierig sein, aber sehr lohnend. Ich liebe es, mit meinem Team zu arbeiten, da jeder verschiedene Ideen hat. Wir treffen uns regelmäßig, um neue Strategien zu diskutieren.",
        "Guten Morgen, ich heiße Michael und ich habe eine Leidenschaft für Fotografie. Ich liebe es, Natur, Menschen und Architektur an verschiedenen Orten zu fotografieren. Meine Fotografien wurden in mehreren Galerien ausgestellt. Die Fotografie hat mir gelehrt, die Welt unterschiedlich zu sehen. Ich bin glücklich, meine Liebe zur Fotografie mit anderen teilen zu können.",
        "Hallo, ich heiße Katharina und ich bin Krankenschwester in einem sehr beschäftigten Krankenhaus. Meine Arbeit ist wichtig, weil ich Patienten jeden Tag helfe. Ich arbeite lange Stunden, aber ich finde große Zufriedenheit in der Versorgung. Meine Kollegen sind wie meine Familie. Wir unterstützen uns gegenseitig in schwierigen Situationen.",
        "Guten Morgen an alle. Ich heiße Bernhard und ich studiere Betriebswirtschaft. Ich arbeite auch halbtags in einem lokalen Restaurant. Das Gleichgewicht zwischen zwei Verantwortungen erfordert gute Zeitverwaltung. Meine Universitätskurse lehren mir wertvolle Lektionen über Wirtschaft und Führung. Meine Arbeit lehrt mich nützliche Kundendienst-Fähigkeiten.",
      ],
      B2: [
        "Guten Morgen, ich heiße Alexandra und ich arbeite als Projektleiterin für ein internationales Bauunternehmen. Obwohl das Projekt sehr schwierig war, gelang es unserem engagierten Team, es rechtzeitig abzuschließen. Der Erfolg hing von ausgezeichneter Kommunikation zwischen allen Abteilungen ab. Ich lernte wertvolle Lektionen über Teamkoordination. Die kulturelle Vielfalt unseres Teams brachte innovative Perspektiven.",
        "Hallo, ich heiße Stephan. Die Vielfalt des lokalen Marktes in meiner Stadt spiegelt das reiche Kulturerbe der Region wider. Ich besuche regelmäßig den Markt, um handwerkliche Produkte und traditionelle Lebensmittel zu erkunden. Die Unterstützung lokaler Unternehmen hilft, traditionelle Fertigkeiten zu bewahren. Der Markt ist nicht nur ein Handelplatz sondern auch ein Treffpunkt.",
        "Guten Morgen, ich heiße Magdalena. Die zeitgenössische Technologie hat die Art, wie wir kommunizieren, arbeiten und leben, grundlegend verändert. Videokonferenzen ermöglichen es uns, uns sofort mit Kollegen weltweit zu verbinden. Cloud Computing ermöglicht flexible Arbeitsverhältnisse. Erhöhte digitale Konnektivität wirft jedoch Fragen zum Datenschutz auf. Wir müssen Nutzen und Herausforderungen der Technologie sorgfältig betrachten.",
        "Hallo, ich heiße Reinhold und ich bin Wissenschaftler in einem Forschungslabor. Teilnehmer unseres Forschungsprojekts wurden ermutigt, die Daten kritisch zu analysieren. Wir führten Experimente über mehrere Monate durch. Die kollaborative Umgebung ermöglichte robustere Schlussfolgerungen. Dieser rigorose Ansatz half uns, bedeutungsvolle Forschung zu produzieren.",
        "Guten Morgen, ich heiße Claudine. Die Regierungspolitik zu erneuerbaren Energien spiegelt ein Bekenntnis zur Umweltnachhaltigkeit wider. Solarpanels und Windkraftanlagen versorgen zunehmend unsere Gemeinden. Investitionen in grüne Technologie schaffen Arbeitsplätze und schützen unseren Planeten. Obwohl die Umstellung erhebliche Investitionen erfordert, rechtfertigen die langfristigen Vorteile diese Bemühungen.",
      ],
      C1: [
        "Guten Morgen, ich bin Dr. Christoph Fontaine und ich spezialisiere mich auf Umweltökonomie. Die Nebeneinanderstellung traditioneller und zeitgenössischer Methoden klärt grundlegende Paradigmenwechsel innerhalb unserer Disziplin. Klassische ökonomische Modelle konnten Umweltexternalitäten nicht berücksichtigen. Moderne Ansätze integrieren ökologische Überlegungen in ökonomische Rahmen. Diese intellektuelle Entwicklung spiegelt unser wachsendes Verständnis, dass Umweltschutz und wirtschaftliche Wohlfahrt intrinsisch verknüpft sein müssen.",
        "Hallo, ich bin Professorin Beatrice Delacroix. Trotz der vielfältigen Komplexitäten inhärenter linguistischer Forschung beharrten Gelehrte mit bewunderungswürdiger Hartnäckigkeit. Unsere Langzeitstudie untersuchte phonetische Variationen, morphosyntaktische Strukturen und pragmatische Funktionen der Sprache. Die Forscher verwendeten ausgefeilte statistische Methoden. Die Ergebnisse deuten darauf hin, dass Sprache nicht nur Kommunikationsmittel sondern auch Marker sozialer Identität dient.",
        "Guten Morgen, ich bin Dr. Monika Leclerc. Die Ausbreitung von Desinformation in digitalen Ökosystemen erfordert umfassende Initiativen zur digitalen Alphabetisierung. Bildungsinstitutionen müssen kritisches Denken in Lehrpläne integrieren. Medienorganisationen benötigen strenge Faktenüberprüfungsprotokolle. Darüber hinaus sollten Technologieunternehmen Mechanismen entwickeln, um Algorithmusabhängigkeit falscher Informationen zu identifizieren und zu minimieren.",
        "Hallo, ich bin Professorin Geneviève Moreau. Diese differenzierte Interpretation der philosophischen Doktrin enthüllt zuvor übersehene Konnotationen, die das konventionelle Verständnis herausfordern. Durch hermeneutische Analyse können wir subtile in historischen Texten eingebettete Bedeutungen erkennen. Die Methodik erfordert sorgfältige Lektüre und kontextuelle Sensibilität. Solche genaue Untersuchung enthüllt oft, dass komplexe philosophische Werke mehrere Interpretationsmöglichkeiten gleichzeitig enthalten.",
        "Guten Morgen, ich bin Professor Heinrich Dubois. Die Synthese interdisziplinärer Perspektiven hat beispiellose Erkenntnisse über das Phänomen des Bewusstseins gebracht. Neurowissenschaft, Philosophie, Psychologie und Kognitionswissenschaft zusammenzufassen, schafft umfassendere theoretische Rahmen. Jüngste Neuroimaging-Studien kombiniert mit philosophischer Forschung haben früher geltende Annahmen überprüft. Diese Integration vielfältiger methodologischer Ansätze stellt ein aufregendes Grenzgebiet dar.",
      ],
      C2: [
        "Ausgezeichnete Kollegen, ich bin Dr. Theodor Michaelsen. Die erkenntnistheoretischen Auswirkungen dieses theoretischen Rahmens bedingen eine umfassende Umgestaltung etablierter Paradigmen, die unsere Disziplin untergraben. Die Auswirkungen gehen über theoretische Verfeinerung hinaus um grundlegend unsere ontologischen Verpflichtungen und methodologischen Voraussetzungen zu rekonstitutieren. Herkömmliche Ansätze, auf positivistischen Annahmen beruhend, erweisen sich für Phänomene mit emergenten Eigenschaften inadäquat. Folglich müssen wir erkenntnistheoretischen Pluralismus umfassen.",
        "Geschätzte Kollegen, ich bin Professorin Victoria Ashford-Sterling. Die philologischen Feinheiten, die diesem Sprachenkorpus innewohnen, exemplifizieren die semantische Polyphonie inhärent natürlicher Sprache und ihre trotzigresistente Undurchschaubarkeit gegenüber univoker Interpretation. Diachrone Analysen enthüllen palimpsestuartige Schichtungen etymologischer Schichten, jede Spuren kultureller Begegnungen tragend. Die hermeneutische Herausforderung konfrontiert uns mit Notwendigkeit, morphosyntaktische Besonderheiten sorgfältig zu beachten. Darüber hinaus erfordert solches Engagement erkenntnistheoretische Demut.",
        "Angesehene Akademiemitglieder, ich bin Dr. Hans-Jürgen Kellerman. Die hermeneutische Dekonstruktion dieses Grundlagentextes enthüllt Subtextkomplexitäten und ideologische Hintergehungen, die konventionelle Interpretationsschemata untergraben. Derridas dekonstruktive Methodik exponiert wie Signifikation durch Différance operiert, Bedeutung durch Präsenz gleichzeitig etablierend während sie durch Abwesenheit unterscheidet. Diese paradoxe Aporie beleuchtet Sprache fundamentale Instabilität. Konsequenterweise muss interpretatives Verfahren produktive Unbestimmtheit umfassen.",
        "Ehrwürdige Gelehrte, ich bin Professor Leonardo Vincenzo. Die dialektische Spannung zwischen deterministischen Positionen basierend auf Ursachenschluss und indeterministischer Metaphysik libertäre Agentivität zelebrierend erzeugt tiefe metaphysische Rätsel bezüglich menschlicher Freiheit, moralischer Verantwortung und kosmologischer Kontingenz. Zeitgenössische Philosophie der Wissenschaft, informiert durch Quantenindeterminiertheit, demonstrierte dass deterministische Mechanismen Idealisierungen konstituieren. Diese wissenschaftliche Umkonzeptualisierung fordert korrespondierend philosophische Anpassung bezüglich unseres Verständnisses der Kausalität.",
        "Äußerst geschätzte Kollegen, ich bin Dr. Cornelius Blackwood-Sutherland. Der Apogäum technologischer Sophistikation entzeugt paradoxerweise existenzielle Angstzustände bezüglich des ontologischen Status menschlicher Agentivität innerhalb zunehmend algorithmischer soziotechnischer Gefüge. Während rechnerische Systeme demonstrierend Mustererkennung und prädiktive Leistungen durch Domänen zunächst menschlicher kognitiver Prärogative proliferieren, fundamentale Fragen emergieren hinsichtlich authentischer Autonomie, technologischer Determinismus und transhumanistischer Trajektorien. Wir konfrontieren echte Aporie: technologische Augmentation expandiert und potentiell untergräbt gleichzeitig menschliches Gedeihen.",
      ],
    },
    speakingTopic:
      "Erzählen Sie mir von einer unvergesslichen Reiseerinnerung oder einem Ort, den Sie gerne besuchen würden.",
    writingPrompt:
      "Schreiben Sie einen kurzen Absatz (50–100 Wörter), der Ihre Morgenroutine beschreibt. Verwenden Sie mindestens 3 verschiedene Verben im Präsens.",
    writingVocab: ["außerdem", "jedoch", "daher", "schließlich", "dennoch"],
    recommendations: () => [
      {
        icon: "fa-microphone",
        title: "Ausspracheübungen",
        desc: "Konzentrieren Sie sich auf die deutschen Umlaute ä, ö, ü und das ß",
        color: "#8b5cf6",
      },
      {
        icon: "fa-comments",
        title: "Tägliches Gespräch",
        desc: "Üben Sie täglich 15 Minuten mit dem KI-Tutor",
        color: "#10b981",
      },
      {
        icon: "fa-pen",
        title: "Grammatikübungen",
        desc: "Meistern Sie den deutschen Kasus und die Verbkonjugation",
        color: "#f59e0b",
      },
    ],
  },

  // ── ITALIAN ───────────────────────────────────────────────────────────────
  it: {
    fullName: "Italian",
    grammar: [
      {
        q: "Scegli l'articolo corretto: '___ libro è sul tavolo.'",
        opts: ["La", "Il", "Lo", "Un"],
        c: 1,
      },
      {
        q: "Scegli la forma corretta: 'Loro ___ studenti.'",
        opts: ["è", "sei", "sono", "siamo"],
        c: 2,
      },
      {
        q: "Scegli la negazione corretta: 'Io ___ capisco.'",
        opts: ["no", "non", "niente", "mai"],
        c: 1,
      },
      {
        q: "Scegli il passato prossimo corretto: 'Ieri io ___ al supermercato.'",
        opts: ["vado", "sono andato", "ando", "andavo"],
        c: 1,
      },
      {
        q: "Quale aggettivo concorda correttamente? 'È una ragazza ___.' (bravo)",
        opts: ["bravo", "brava", "bravi", "brave"],
        c: 1,
      },
    ],
    reading: [
      {
        text: "L'italiano è parlato da circa 85 milioni di persone nel mondo. È la lingua ufficiale dell'Italia, della Svizzera, di San Marino e della Città del Vaticano. L'italiano è noto per la sua musicalità ed è la lingua della musica lirica, dell'arte e della moda.",
        q: "In quanti paesi l'italiano è lingua ufficiale tra quelli menzionati?",
        opts: ["2", "3", "4", "5"],
        c: 2,
      },
      {
        text: "La pizza napoletana è originaria di Napoli e nel 2017 è stata riconosciuta dall'UNESCO come patrimonio culturale immateriale dell'umanità. La pizza originale era semplice: pasta, pomodoro e mozzarella di bufala.",
        q: "Quando la pizza napoletana è stata riconosciuta dall'UNESCO?",
        opts: ["2010", "2015", "2017", "2020"],
        c: 2,
      },
      {
        text: "Il Colosseo di Roma è uno degli anfiteatri più grandi mai costruiti. Completato nell'80 d.C., poteva ospitare tra 50.000 e 80.000 spettatori. Oggi è il simbolo di Roma e uno dei monumenti più visitati d'Italia.",
        q: "Quando fu completato il Colosseo?",
        opts: ["50 d.C.", "80 d.C.", "100 d.C.", "200 d.C."],
        c: 1,
      },
    ],
    pronunciation: {
      A1: [
        "Buongiorno, mi chiamo Pietro. Abito in Italia con la mia famiglia. Mi piace giocare a calcio con i miei amici nei fine settimane. Ho anche un cane nero che si chiama Max. È molto intelligente e affettuoso. Mi piace passeggiare con lui nel parco. Max è il mio migliore amico.",
        "Ciao, il mio nome è Rosa. Sono una studentessa all'università. Mi ama studiare le lingue, specialmente l'inglese e il francese. Vengo da un piccolo paese in Sicilia. I miei genitori lavorano nel commercio. Siamo una famiglia molto unita e felice. Amo molto i miei genitori.",
        "Buongiorno a tutti. Mi chiamo Diego e sono un musicista. Suono la chitarra da quando ero bambino. Mi piace anche cantare e ascoltare diversi tipi di musica. Ogni giorno pratico i miei strumenti per due ore. La musica mi rende molto felice. Suono anche il pianoforte.",
        "Ciao, sono Fernando. Lavoro come commesso in un negozio di abbigliamento. Il mio lavoro è interessante perché conosco molte persone diverse. Mi piace aiutare i clienti a trovare i vestiti che cercano. Sono contento del mio lavoro e i miei colleghi sono simpatici. I clienti mi ringraziano.",
        "Buongiorno, mi chiamo Elena. Vengo da Roma ma ora abito a Milano. Mi ama molto viaggiare ed esplorare nuovi posti. Ho visitato diversi paesi in Europa e vorrei visitare l'Asia presto. I viaggi mi arricchiscono molto. Amo fotografare quando viaggio.",
      ],
      A2: [
        "Buongiorno, mi chiamo Paolo e lavoro come insegnante in una scuola primaria. Ogni mattina insegno la lettura e la matematica ai bambini. Mi ama molto il mio lavoro perché i bambini sono curiosi e divertenti. Dopo la scuola torno a casa dove mi piace rilassarmi e leggere libri. La mia famiglia è molto importante per me. La sera preparo la cena.",
        "Ciao, mi chiamo Teresa. Sono un'infermiera in ospedale e il mio lavoro è molto importante. Ogni giorno aiuto i pazienti a stare meglio e li curo con compassione. Il mio lavoro può essere difficile ma sono soddisfatta di poter aiutare le persone. I miei colleghi sono come la mia famiglia. Lavoriamo insieme ogni giorno.",
        "Buongiorno a tutti. Il mio nome è Javier. Sono un agricoltore e lavoro nei campi tutto l'anno. Ho un'azienda agricola con animali e diverse coltivazioni. Mi alzo molto presto ogni mattina per iniziare il mio lavoro. Mi ama vivere in campagna. È un lavoro difficile ma gratificante. Amo il mio lavoro.",
        "Ciao, mi chiamo Marta. Mi ama molto viaggiare e recentemente ho visitato tre paesi europei diversi. Ho imparato molto sulle diverse culture e tradizioni locali. Ho conosciuto persone molto interessanti e mangiato piatti deliziosi. I viaggi mi ispirano molto. Voglio visitare l'Asia.",
        "Buongiorno, il mio nome è Manfredo. Sono un ingegnere in un'azienda di tecnologia. Il mio lavoro consiste nel progettare e risolvere problemi tecnici complessi. Mi ama il mio lavoro perché è stimolante e creativo. Lavoro con un team talentoso e innovativo. La mia azienda ci incoraggia a imparare e svilupparci. Abbiamo riunioni.",
      ],
      B1: [
        "Buongiorno, mi chiamo Filippo e lavoro nel settore del turismo. Sono molto interessato a scoprire diverse culture ed esplorare nuovi posti. L'anno scorso ho visitato l'Italia e ho avuto un'esperienza meravigliosa. Ho visitato monumenti storici, musei straordinari e degustato la cucina locale. Ho imparato alcune frasi in italiano. Programo di ritornarvi l'anno prossimo.",
        "Ciao, mi chiamo Veronica. Sono responsabile del marketing in un'azienda di tecnologia. Il mio lavoro implica la creazione di campagne pubblicitarie, l'analisi dei dati e la comunicazione con i clienti. Il lavoro può essere difficile ma molto gratificante. Mi ama collaborare con il mio team perché ogni persona apporta idee diverse. Ci riuniamo regolarmente per discutere nuove strategie.",
        "Buongiorno, mi chiamo Michele e ho una passione per la fotografia. Mi ama fotografare la natura, le persone e l'architettura in diversi posti. Le mie fotografie sono state esposte in diverse gallerie. La fotografia mi ha insegnato a vedere il mondo diversamente. Sono felice di poter condividere il mio amore per la fotografia con altri.",
        "Ciao, mi chiamo Caterina e sono un'infermiera in un ospedale molto occupato. Il mio lavoro è importante perché aiuto i pazienti ogni giorno. Lavoro molte ore ma trovo grande soddisfazione nell'offrire cure. I miei colleghi sono come la mia famiglia. Ci supportiamo a vicenda nelle situazioni difficili.",
        "Buongiorno a tutti. Mi chiamo Bernardo e sono uno studente di commerce. Lavoro anche a tempo parziale in un ristorante locale. Equilibrare due responsabilità richiede una buona gestione del tempo. I miei corsi universitari mi insegnano lezioni preziose su economia e leadership. Il mio lavoro mi insegna competenze utili nel servizio ai clienti.",
      ],
      B2: [
        "Buongiorno, mi chiamo Alexandra e lavoro come gestrice di progetto per un'azienda di costruzioni internazionale. Sebbene il progetto fosse molto difficile, il nostro team dedicato è riuscito a completarlo prima della data prevista. Il successo dipendeva da un'eccellente comunicazione tra tutti i dipartimenti. Ho imparato lezioni preziose sulla coordinazione del team. La diversità culturale del nostro team ha apportato prospettive innovative.",
        "Ciao, mi chiamo Esteban. La diversità del mercato locale nella mia città riflette il patrimonio culturale ricco della regione. Visito regolarmente il mercato per esplorare prodotti artigianali e cibi tradizionali. Supportare le imprese locali aiuta a preservare le competenze tradizionali. Il mercato non è solo un luogo di commercio ma anche un punto di incontro.",
        "Buongiorno, mi chiamo Maddalena. La tecnologia contemporanea ha trasformato fondamentalmente il nostro modo di comunicare, lavorare e vivere. Le riunioni video ci permettono di connetterci con colleghi in tutto il mondo istantaneamente. Tuttavia, la connettività digitale aumentata solleva preoccupazioni riguardo alla privacy dei dati. Dobbiamo considerare attentamente i vantaggi e le sfide che la tecnologia presenta.",
        "Ciao, mi chiamo Renato e sono uno scienziato in un laboratorio di ricerca. I partecipanti al nostro progetto di ricerca sono stati incoraggiati ad analizzare criticamente i dati. Abbiamo condotto esperimenti per diversi mesi e documentato risultati dettagliati. L'ambiente collaborativo ci ha permesso di sviluppare conclusioni più robuste. Questo approccio rigoroso ci ha aiutato a produrre ricerca significativa.",
        "Buongiorno, mi chiamo Claudia. La politica governativa sulle energie rinnovabili riflette un impegno verso la sostenibilità ambientale. I panelli solari e gli aerogeneratori alimentano sempre più le nostre comunità. Investire nella tecnologia verde crea posti di lavoro mentre protegge il nostro pianeta. Sebbene la transizione richieda investimenti significativi, i benefici giustificano questi sforzi a lungo termine.",
      ],
      C1: [
        "Buongiorno, mi chiamo Dr. Cristofano Fontaine e mi specializo in economia ambientale. La contrapposizione di metodologie tradizionali e contemporanee elucida cambiamenti paradigmatici fondamentali. I modelli economici classici non potevano spiegare le esternalità ambientali e le implicazioni di sostenibilità a lungo termine. Gli approcci moderni integrano considerazioni ecologiche nei quadri economici. Questa evoluzione intellettuale riflette la nostra comprensione crescente che la protezione ambientale e la prosperità economica debbono essere intrinsecamente collegate.",
        "Ciao, mi chiamo Professoressa Beatrice Delacroix. Nonostante le complessità molteplici intrinseche alla ricerca linguistica, i ricercatori hanno perseverato con tenacia ammirevole. Il nostro studio longitudinale ha esaminato variazioni foniche, strutture morfosintattiche e funzioni pragmatiche del linguaggio. I ricercatori hanno impiegato metodologie statistiche sofisticate. Le conclusioni suggeriscono che il linguaggio funziona non solo come strumento di comunicazione ma anche come marcatore di identità sociale.",
        "Buongiorno, mi chiamo Dr. Monica Leclerc. La proliferazione della disinformazione negli ecosistemi digitali richiede iniziative complete di alfabetizzazione digitale. Le istituzioni educative devono integrare il pensiero critico e la valutazione delle fonti nei curricula. Le organizzazioni mediatiche hanno bisogno di stabilire protocolli rigorosi di verifica dei fatti. Inoltre, le aziende tecnologiche devono sviluppare meccanismi per identificare e ridurre l'amplificazione algoritmica della disinformazione.",
        "Ciao, mi chiamo Professoressa Genoveva Moreau. Questa interpretazione sfumata della dottrina filosofica rivela connotazioni precedentemente trascurate che mettono in discussione la comprensione convenzionale. Impiegando l'analisi ermeneutica, possiamo discernire significati sottili integrati nei testi storici. La metodologia richiede lettura attenta e consapevolezza contestuale. L'esame attento rivela spesso che opere filosofiche complesse contengono multiple possibilità interpretative simultaneamente.",
        "Buongiorno, mi chiamo Professore Enrico Dubois. La sintesi di prospettive interdisciplinari ha generato intuizioni senza precedenti sul fenomeno della coscienza. Le neuroscienze, la filosofia, la psicologia e la scienza cognitiva convergono per creare quadri teorici più completi. Studi recenti di imaging cerebrale combinati con ricerca filosofica hanno messo in discussione ipotesi precedentemente stabilite. Questa integrazione di prospettive metodologiche diverse rappresenta una frontiera affascinante nella conoscenza umana.",
      ],
      C2: [
        "Distinti colleghi, mi chiamo Dr. Teodoro Michaux. Le ramificazioni epistemologiche di questo quadro teorico richiedono una riconsiderazione esaustiva dei paradigmi consolidati che hanno sorretto la nostra disciplina. Le implicazioni si estendono oltre il raffinamento teorico per ricostituire fondamentalmente i nostri impegni ontologici e i presupposti metodologici. Gli approcci tradizionali, fondati su assunzioni positiviste, si rivelano inadeguati per fenomeni che presentano proprietà emergenti. Di conseguenza, dobbiamo abbracciare il pluralismo epistemologico.",
        "Stimati colleghi, mi chiamo Professoressa Victoria Ashford-Sterling. Le sottigliezze filologiche intrinseche a questo corpus linguistico esemplificano la polifonia semantica inerente al linguaggio naturale e la sua opacità decisamente resistente all'interpretazione univoca. Le analisi diacroniche rivelano stratificazione palinsestuale di strati etimologici, ciascuno recando tracce di incontri culturali. La sfida ermeneutica che affronta la nostra disciplina esige attenzione sofisticata alle particolarità morfosintattiche. Inoltre, questo impegno richiede umiltà epistemologica riconoscendo la polisemia irriducibile del linguaggio.",
        "Onorevoli membri dell'accademia, mi chiamo Dr. Giovanni-Francesco Kellerman. La decostruzione ermeneutica di questo testo fondamentale rivela complessità testuali e sotterfugi ideologici che minano i quadri interpretativi convenzionali. La metodologia deconstructiva di Derrida espone come la significazione operi attraverso la differanza, stabilendo simultaneamente significato tramite presenza mentre lo differisce attraverso l'assenza. Questa aporia paradossale illumina l'instabilità fondamentale del linguaggio. Di conseguenza, la pratica interpretativa deve abbracciare l'indeterminazione produttiva.",
        "Venerabili saggi, mi chiamo Professore Leonardo Vincenzo. La tensione dialettica tra posizioni filosofiche deterministiche fondate sulla chiusura causale e la metafisica indeterministica celebrante l'agentività libertaria genera enigmi metafisici profondi riguardanti la libertà umana, la responsabilità morale e la contingenza cosmologica. La filosofia contemporanea della scienza, informata dall'indeterminazione quantica, ha dimostrato che i meccanismi deterministici costituiscono idealizzazioni piuttosto che descrizioni della realtà ultima. Riconciliare le conclusioni scientifiche con i compromessi filosofici rimane una sfida formidabile.",
        "Collega sommamente stimati, mi chiamo Dr. Cornelio Blackwood-Sutherland. L'apoteosi della sofisticazione tecnologica genera paradossalmente ansie esistenziali riguardanti lo status ontologico dell'agentività umana entro aggregati sociotecnici sempre più algoritmici. Mentre i sistemi computazionali esibenti sofisticate capacità di riconoscimento di modelli e previsione proliferano attraverso domini precedentemente costituenti prerogative cognitive unicamente umane, questioni fondamentali emergono riguardanti l'autenticità autonoma, il determinismo tecnologico e le traiettorie transumane. Affrontiamo un'autentica aporia: l'augmentazione tecnologica simultaneamente espande e potenzialmente mina il filorimento umano.",
      ],
    },
    speakingTopic:
      "Parlami di un ricordo di viaggio speciale o di un posto che vorresti visitare.",
    writingPrompt:
      "Scrivi un breve paragrafo (50–100 parole) che descrive la tua routine mattutina. Usa almeno 3 verbi diversi al presente.",
    writingVocab: ["inoltre", "tuttavia", "quindi", "infine", "pertanto"],
    recommendations: () => [
      {
        icon: "fa-microphone",
        title: "Pratica di pronuncia",
        desc: "Concentrati sulla musicalità e l'intonazione italiana",
        color: "#8b5cf6",
      },
      {
        icon: "fa-comments",
        title: "Conversazione quotidiana",
        desc: "Pratica con il tutor AI per 15 minuti al giorno",
        color: "#10b981",
      },
      {
        icon: "fa-pen",
        title: "Esercizi di grammatica",
        desc: "Padroneggia i tempi verbali e i generi in italiano",
        color: "#f59e0b",
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// getAssessmentContent(langCode) — returns content for the given ISO code.
// Falls back to English for unsupported languages.
// ─────────────────────────────────────────────────────────────────────────────
export function getAssessmentContent(langCode) {
  return ASSESSMENT[langCode] || ASSESSMENT["en"];
}

// Maps short code → full name (used in ResultsStep to update user.preferredLanguage)
export function codeToFullName(langCode) {
  return (ASSESSMENT[langCode] || ASSESSMENT["en"]).fullName;
}

export default ASSESSMENT;
