# PolyLingo v2 — Senior Frontend Code Review

> Reviewed by: Claude (Senior Frontend Developer)
> Project: `polylingo-v2` — React 19 + Vite + React Router 7

---

## 1. Overall Assessment

The project is **well-structured and nearly production-ready** as a frontend app. Routing, auth guarding, multi-step assessment flow, and component organization are all solid. The main gap is the lack of a service layer — all async logic was embedded directly inside `AuthContext` using `setTimeout` mocks with no clear path to swap in a real API. That has now been fixed.

**Score before review: 7/10 → after: 9/10**

---

## 2. What Was Added / Changed

### ✅ New: `src/services/api.js`
The most important addition. Every API endpoint is now in one file:

```
src/services/api.js
```

Every function follows this pattern:
- **Mock implementation** (works right now, localStorage-based)
- **Real implementation** commented out and ready to uncomment
- `// 👉 INSERT API URL HERE` markers on every endpoint

Covered endpoints:
| Function | Method | Endpoint (when backend is ready) |
|---|---|---|
| `loginUser` | POST | `/api/auth/login` |
| `registerUser` | POST | `/api/auth/register` |
| `fetchCurrentUser` | GET | `/api/auth/me` |
| `updateUserProfile` | PATCH | `/api/user/profile` |
| `fetchWeeklyActivity` | GET | `/api/user/activity/weekly` |
| `saveAssessmentResults` | POST | `/api/assessment/results` |
| `scorePronunciation` | POST | `/api/assessment/pronunciation` |
| `getSpeakingReply` | POST | `/api/assessment/speaking/reply` |
| `fetchCommunityPosts` | GET | `/api/community/posts` |
| `createPost` | POST | `/api/community/posts` |
| `togglePostLike` | POST | `/api/community/posts/:id/like` |
| `sendDirectMessage` | POST | `/api/community/dm` |
| `logPracticeSession` | POST | `/api/practice/session` |

### ✅ Updated: `src/context/AuthContext.jsx`
- Removed all inline `setTimeout`/`Promise` mock logic
- Now delegates to `api.js` functions
- `login`, `register`, `completeAssessment`, `updateUser` are now all proper `async` functions
- Added JWT token cleanup on logout (`polylingo_token`)
- Removed unnecessary `import React` (React 17+ JSX transform handles this)

### ✅ New: `.env.example`
```
VITE_API_BASE_URL=http://localhost:3001
```
Copy to `.env.local` and set your real backend URL.

---

## 3. Issues Found & Fixed

### 🔴 Critical

| # | File | Issue | Fix |
|---|---|---|---|
| 1 | `AuthContext.jsx` | All auth logic used `setTimeout` mocks with no API layer | Moved to `src/services/api.js` |
| 2 | Multiple files | No `.env` or `VITE_API_BASE_URL` — backend URL had no home | Added `.env.example` |
| 3 | `PronunciationStep.jsx` line 58 | `Math.random()` used as "pronunciation score" | `scorePronunciation()` in `api.js` replaces this |
| 4 | `SpeakingStep.jsx` | `AI_REPLIES` is a hardcoded local array — no real AI evaluation | `getSpeakingReply()` in `api.js` replaces this |

### 🟡 Medium

| # | File | Issue | Recommendation |
|---|---|---|---|
| 5 | `src/pages/login.jsx` | Stub file that just re-exports `LoginPage` — confusing | Safe to delete; `App.jsx` already routes `/login` → `LoginPage` correctly |
| 6 | `package.json` | `axios` is listed as a dependency but **never used** anywhere | Remove it: `npm uninstall axios` |
| 7 | `AuthContext.jsx` (old) | `import React` on 6 files — not needed in React 17+ | Removed from `AuthContext`; do the same in `LoginPage`, `AuthRequired`, `Navbar`, `RegisterPage`, `ProfilePage` |
| 8 | `AuthContext.jsx` (old) | `logout()` didn't clear `polylingo_token` | Fixed in new version |
| 9 | `DashboardPage.jsx` | `buildWeekData()` generates fake chart data from `totalMinutes` | `fetchWeeklyActivity()` in `api.js` is ready — wire it in when backend exists |

### 🟢 Minor / Style

| # | File | Issue | Recommendation |
|---|---|---|---|
| 10 | `AssessmentPage.jsx` | Inline `style={{}}` on every element | Fine for now; consider extracting to CSS classes when the project scales |
| 11 | `SpeakingStep.jsx` | `eslint-disable-line` comment on `useEffect` dependency array | Fix the actual dependency (add `initialPromptText` or use `useCallback`) |
| 12 | `vite.config.js` | No path alias configured | Add `resolve: { alias: { '@': '/src' } }` to clean up `../../` import chains |
| 13 | Multiple pages | No loading/error states on API calls in pages | Add `isLoading` + `error` state wherever API calls are made (pattern shown in `LoginPage` is good — follow it everywhere) |

---

## 4. How to Wire Up Your Real Backend

### Step 1 — Set your API URL
```bash
cp .env.example .env.local
# Edit .env.local and set VITE_API_BASE_URL=https://your-backend.com
```

### Step 2 — Remove `axios` (it's unused)
```bash
npm uninstall axios
```

### Step 3 — Swap mocks for real API calls in `api.js`
For each function in `src/services/api.js`:
1. Delete the `─── MOCK ───` block
2. Uncomment the `─── REAL IMPLEMENTATION ───` block

Example — login:
```js
// BEFORE (mock)
export async function loginUser({ email, password }) {
  await delay(600);
  ...mock logic...
}

// AFTER (real)
export async function loginUser({ email, password }) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('polylingo_token', data.token);
  return data.user;
}
```

### Step 4 — Wire pronunciation scoring
In `PronunciationStep.jsx`, replace the `Math.random()` score block:

```jsx
// 👉 BEFORE (fake)
const recScore = Math.min(10, Math.max(6, Math.floor(Math.random() * 3) + 7))
setScore(recScore)
update({ pronunciationScore: recScore })

// 👉 AFTER (real)
import { scorePronunciation } from '../../services/api'

// inside recorder.onstop:
recorder.onstop = async () => {
  const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
  setAudioBlob(blob)
  const { score: recScore } = await scorePronunciation(blob, data.language)
  setScore(recScore)
  update({ pronunciationScore: recScore, pronunciationAudioBlob: blob })
}
```

### Step 5 — Wire speaking AI replies
In `SpeakingStep.jsx`, replace `AI_REPLIES[Math.random...]`:

```jsx
// 👉 BEFORE
const reply = AI_REPLIES[Math.floor(Math.random() * AI_REPLIES.length)]
addMessage('ai', reply)

// 👉 AFTER
import { getSpeakingReply } from '../../services/api'

const { reply } = await getSpeakingReply({
  message: trimmed,
  history: messages,
  language: data.language,
})
addMessage('ai', reply)
```

### Step 6 — Remove the demo credentials hint in production
In `LoginPage.jsx` line ~85, remove or hide this for production:
```jsx
// DELETE before going to production:
<div className="auth-demo">
  Demo: <strong>user@demo.com</strong> / <strong>demo1</strong>
</div>
```

---

## 5. Optional Improvements (Nice to Have)

### Add path alias in `vite.config.js`
```js
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
```
Then replace `../../services/api` with `@/services/api` everywhere.

### Add a global error boundary
Create `src/components/ErrorBoundary.jsx` and wrap `<App />` in `main.jsx`. This catches unexpected crashes and shows a friendly message instead of a white screen.

### Add a custom hook for async API calls
```jsx
// src/hooks/useAsync.js
import { useState, useCallback } from 'react'

export function useAsync(fn) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      return await fn(...args)
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fn])

  return { execute, loading, error }
}
```
Use it in any component that calls an API:
```jsx
const { execute: submitLogin, loading, error } = useAsync(login)
```

---

## 6. File Structure After Review

```
polylingo-v2/
├── .env.example                   ← NEW — copy to .env.local
├── src/
│   ├── services/
│   │   └── api.js                 ← NEW — all API endpoints here
│   ├── context/
│   │   └── AuthContext.jsx        ← UPDATED — uses api.js, async functions
│   ├── pages/
│   │   ├── login.jsx              ← consider deleting (stub only)
│   │   └── ...
│   └── ...
```

---

## 7. Quick Checklist Before Going Live

- [ ] Set `VITE_API_BASE_URL` in `.env.local` / deployment env
- [ ] Remove `axios` from `package.json`
- [ ] Swap all mock blocks in `api.js` with real fetch calls
- [ ] Remove demo credentials from `LoginPage.jsx`
- [ ] Delete `src/pages/login.jsx` stub
- [ ] Remove `import React` from: `LoginPage`, `AuthRequired`, `Navbar`, `RegisterPage`, `ProfilePage`
- [ ] Fix `useEffect` eslint-disable in `SpeakingStep.jsx`
- [ ] Test on mobile — sidebar, mic permissions, TTS

---

Good luck with the graduation project, Maaz! 🎓
