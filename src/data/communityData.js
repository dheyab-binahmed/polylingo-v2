// ─────────────────────────────────────────────────────────────────────────────
// COMMUNITY DATA — static seed data
// BACKEND INTEGRATION: Replace all exports with API calls:
//   GET /api/community/posts          → INITIAL_POSTS
//   GET /api/community/groups         → INITIAL_GROUPS
//   GET /api/community/partners       → INITIAL_PARTNERS
// ─────────────────────────────────────────────────────────────────────────────

export const INITIAL_POSTS = [
  {
    id: 1,
    author: "Maria Johnson", initials: "MJ", time: "2 hours ago",
    language: "Spanish", color: "#6366f1",
    likes: 42, comments: 8, shares: 3, liked: true,
    // BACKEND: comments array will come from GET /api/community/posts/:id/comments
    commentsList: [
      { id: 101, author: "Carlos R.", initials: "CR", text: "Amazing streak! I struggled with subjunctive too — try the RAE conjugation drills.", time: "1h ago" },
      { id: 102, author: "Ana G.", initials: "AG", text: "30 days! That's incredible motivation 🎉", time: "45m ago" },
    ],
    tags: ["speaking", "streak"],
    ownedByCurrentUser: false,
    content: "Just completed my 30-day speaking streak! 🎉 I practiced Spanish for at least 15 minutes every day. The most challenging part was the subjunctive mood, but I'm finally getting the hang of it. Any tips for practicing speaking when you don't have a partner?",
  },
  {
    id: 2, author: "Takashi Kimura", initials: "TK", time: "5 hours ago",
    language: "English", color: "#2563EB",
    likes: 18, comments: 12, shares: 1, liked: false,
    commentsList: [
      { id: 201, author: "Sarah L.", initials: "SL", text: "\"Make\" is for creating things. \"Do\" is for activities. So it's \"do my homework\" and \"make plans\"!", time: "4h ago" },
    ],
    tags: ["grammar", "question"],
    ownedByCurrentUser: false,
    content: "Can someone explain the difference between 'make' and 'do'? I always confuse these two.\n\nI wrote: 'I need to make my homework before I can do plans for the weekend.' Is this correct? 🤔",
  },
  {
    id: 3, author: "Sarah Lee", initials: "SL", time: "Yesterday",
    language: "French & Korean", color: "#7C3AED",
    likes: 31, comments: 5, shares: 7, liked: true,
    commentsList: [],
    tags: ["exchange", "looking-for-partner"],
    ownedByCurrentUser: false,
    content: "Looking for a language exchange partner! 👋\n\nI speak: English (native), French (intermediate)\nI want to learn: Korean\nPreferred: Video calls 2-3x per week, 30 min each\n\nSend me a message! 💬",
  },
];

export const INITIAL_GROUPS = [
  {
    id: 1, name: "Spanish Conversation Club", icon: "💬",
    description: "Weekly conversations for all Spanish learners. Practice speaking in a friendly environment.",
    members: 28, language: "Spanish", level: "all", color: "#6366f1",
    joined: true,
    messages: [
      { id: 1, sender: "Maria", initials: "MJ", text: "¡Hola a todos! ¿Cómo están hoy?", time: "10:30 AM", sent: false },
      { id: 2, sender: "Carlos", initials: "CR", text: "¡Hola! Muy bien, ¿alguien quiere practicar?", time: "10:32 AM", sent: false },
      { id: 3, sender: "You", initials: "ME", text: "¡Me encantaría! Tengo algunas preguntas.", time: "10:35 AM", sent: true },
    ],
    membersList: [
      { name: "Maria Johnson", initials: "MJ", status: "online" },
      { name: "Carlos Ruiz",   initials: "CR", status: "online" },
      { name: "You",           initials: "ME", status: "online" },
      { name: "Ana García",    initials: "AG", status: "away" },
    ],
    resources: [
      { id: "r1", name: "Spanish Verb Guide", type: "PDF",  icon: "📄", size: "245 KB" },
      { id: "r2", name: "Common Phrases",     type: "DOC",  icon: "📝", size: "128 KB" },
    ],
    events: [
      { id: "e1", title: "Weekly Conversation", date: "Tomorrow", time: "3:00 PM", participants: 8, joined: false },
    ],
  },
  {
    id: 2, name: "English Pronunciation Masters", icon: "🎙️",
    description: "Master English pronunciation with daily exercises and feedback from native speakers.",
    members: 21, language: "English", level: "intermediate", color: "#2563EB",
    joined: false,
    messages: [], membersList: [], resources: [], events: [],
  },
  {
    id: 3, name: "Japanese Kanji Study Group", icon: "📚",
    description: "Learn 10 new kanji every week with memory techniques and practice sheets.",
    members: 14, language: "Japanese", level: "beginner", color: "#7C3AED",
    joined: false,
    messages: [], membersList: [], resources: [], events: [],
  },
];

export const INITIAL_PARTNERS = [
  { id: 1, name: "Ahmad Raza",     initials: "AR", country: "Pakistan", online: true,  connected: false, color: "#059669", bio: "Software engineer learning Arabic. Love discussing tech and culture.",    languages: ["Urdu (Native)", "English (Fluent)", "Learning Arabic"] },
  { id: 2, name: "Liu Chen",       initials: "LC", country: "China",    online: true,  connected: false, color: "#2563EB", bio: "University student passionate about Spanish music and literature.",        languages: ["Mandarin (Native)", "English (Inter.)", "Learning Spanish"] },
  { id: 3, name: "Elena Dubois",   initials: "ED", country: "France",   online: false, connected: false, color: "#ec4899", bio: "French teacher looking for Japanese conversation exchange partners.",       languages: ["French (Native)", "English (Fluent)", "Learning Japanese"] },
  { id: 4, name: "Roberto Gomez",  initials: "RG", country: "Mexico",   online: true,  connected: false, color: "#7C3AED", bio: "Business professional expanding into Portuguese-speaking markets.",         languages: ["Spanish (Native)", "English (Adv.)", "Learning Portuguese"] },
];
