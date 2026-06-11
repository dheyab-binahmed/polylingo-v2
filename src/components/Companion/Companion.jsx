import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Companion.css";

/* ═══════════════════════════════════════════════════════════════
   COMPANION — a small animated animal assigned randomly at login.
   • Lives ONLY on the Dashboard and Community pages.
   • Untouchable: it watches the cursor and darts away before you
     can reach it. Chase it — it keeps running (and reacts with
     its own personality: fire, tears, hearts, panic...).
   • All movement is transform-based (GPU) so it never lags.
═══════════════════════════════════════════════════════════════ */

const ANIMALS = [
  {
    id: "niko",
    name: "Niko",
    species: "fox",
    label: "Niko the playful fox",
    body: "#f59a4b",
    inner: "#d97b2e",
    flee: { mood: "happy", effect: "sparkles" },
    idleReactions: ["spin", "happy"],
    phrases: {
      flee: ["Can't catch a fox!", "Zoomies!!", "Too slow! 🦊"],
      idle: ["*chases tail*", "Foxes know 100 sounds. I know 101.", "*sniffs the dashboard*"],
    },
  },
  {
    id: "mochi",
    name: "Mochi",
    species: "cat",
    label: "Mochi the grumpy cat",
    body: "#8d8da8",
    inner: "#f3a5b4",
    flee: { mood: "angry", effect: "fire" },
    idleReactions: ["anger", "sleepy"],
    phrases: {
      flee: ["DON'T. TOUCH. THE CAT.", "Hisss!! 😾", "I will remember this."],
      idle: ["*judges silently*", "Feed me or leave.", "This page is mine now."],
    },
  },
  {
    id: "pip",
    name: "Pip",
    species: "bunny",
    label: "Pip the shy bunny",
    body: "#f6f1e7",
    inner: "#f3a5b4",
    flee: { mood: "scared", effect: "sweat" },
    idleReactions: ["scared", "jump"],
    phrases: {
      flee: ["EEEP!!", "Nope nope nope!", "*panicked hopping*"],
      idle: ["Is it safe?", "*nibbles carrot quietly*", "Just... hiding here."],
    },
  },
  {
    id: "bao",
    name: "Bao",
    species: "panda",
    label: "Bao the gloomy panda",
    body: "#2e2e3a",
    inner: "#9b9bb0",
    flee: { mood: "sad", effect: "rain" },
    idleReactions: ["sleepy", "sad"],
    phrases: {
      flee: ["Why are we running...", "*sad panda noises*", "I just wanted a nap..."],
      idle: ["Bamboo... someday.", "*sighs in panda*", "Five more minutes."],
    },
  },
  {
    id: "waddles",
    name: "Waddles",
    species: "penguin",
    label: "Waddles the cheerful penguin",
    body: "#33394f",
    inner: "#f0a35e",
    flee: { mood: "happy", effect: "sparkles" },
    idleReactions: ["jump", "happy"],
    phrases: {
      flee: ["Wheee! Chase mode!", "*aggressive waddling*", "You'll never catch the waddle!"],
      idle: ["Is the floor ice? No? Disappointing.", "*waddles importantly*", "Fish would be nice."],
    },
  },
  {
    id: "coco",
    name: "Coco",
    species: "chick",
    label: "Coco the sweet chick",
    body: "#ffd166",
    inner: "#f0883e",
    flee: { mood: "love", effect: "hearts" },
    idleReactions: ["love", "happy"],
    phrases: {
      flee: ["Hehe, follow me! 💛", "*happy cheeping*", "Catch me? Never!"],
      idle: ["Cheep cheep!", "One day I'll fly. Today I bounce.", "*pecks at pixels*"],
    },
  },
];

/* idle reactions → face / effect / motion */
const REACTIONS = {
  anger:  { mood: "angry",  effect: "anger" },
  happy:  { mood: "happy",  effect: "sparkles" },
  jump:   { mood: "happy",  effect: "sparkles", motion: "jump" },
  love:   { mood: "love",   effect: "hearts" },
  sad:    { mood: "sad",    effect: "rain" },
  scared: { mood: "scared", effect: "sweat" },
  sleepy: { mood: "sleepy", effect: "zzz" },
  spin:   { mood: "happy",  effect: "sparkles", motion: "spin" },
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* how close the cursor can get (px) before the animal bolts */
const FLEE_RADIUS = 130;
/* cursor must be in the bottom strip of the screen to scare it */
const FLEE_STRIP = 240;

/* ═════════ THE ANIMAL, drawn in SVG — face changes with mood ═════════ */
function AnimalAvatar({ c, mood }) {
  const sp = c.species;
  const headCy = sp === "bunny" ? 66 : 62;
  const eyeL = 56;
  const eyeR = 84;
  const eyeY = headCy;
  const beaked = sp === "penguin" || sp === "chick";
  const muzzled = sp === "fox" || sp === "cat";
  const mouthY = muzzled ? headCy + 17 : headCy + 18;
  const faceColor = sp === "panda" ? "#f6f4f0" : sp === "penguin" ? c.body : c.body;

  const renderEyes = () => {
    switch (mood) {
      case "happy":
        return (
          <>
            <path d={`M${eyeL - 6} ${eyeY + 1} Q ${eyeL} ${eyeY - 7} ${eyeL + 6} ${eyeY + 1}`} stroke="#1f2430" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d={`M${eyeR - 6} ${eyeY + 1} Q ${eyeR} ${eyeY - 7} ${eyeR + 6} ${eyeY + 1}`} stroke="#1f2430" strokeWidth="3" strokeLinecap="round" fill="none" />
          </>
        );
      case "love": {
        const heart = (x) => (
          <path
            key={x}
            d={`M${x} ${eyeY - 2} c -2.6 -3.4 -8 -0.8 -5.4 3.2 l 5.4 5 5.4 -5 c 2.6 -4 -2.8 -6.6 -5.4 -3.2 z`}
            fill="#ff5e7e"
          />
        );
        return <>{heart(eyeL)}{heart(eyeR)}</>;
      }
      case "angry":
        return (
          <>
            <line x1={eyeL - 8} y1={eyeY - 10} x2={eyeL + 6} y2={eyeY - 5} stroke="#1f2430" strokeWidth="3" strokeLinecap="round" />
            <line x1={eyeR + 8} y1={eyeY - 10} x2={eyeR - 6} y2={eyeY - 5} stroke="#1f2430" strokeWidth="3" strokeLinecap="round" />
            <circle cx={eyeL} cy={eyeY + 1} r="4" fill="#1f2430" />
            <circle cx={eyeR} cy={eyeY + 1} r="4" fill="#1f2430" />
          </>
        );
      case "sad":
        return (
          <>
            <line x1={eyeL - 7} y1={eyeY - 6} x2={eyeL + 5} y2={eyeY - 10} stroke="#1f2430" strokeWidth="3" strokeLinecap="round" />
            <line x1={eyeR + 7} y1={eyeY - 6} x2={eyeR - 5} y2={eyeY - 10} stroke="#1f2430" strokeWidth="3" strokeLinecap="round" />
            <circle cx={eyeL} cy={eyeY + 1} r="4.5" fill="#1f2430" />
            <circle cx={eyeR} cy={eyeY + 1} r="4.5" fill="#1f2430" />
            <circle cx={eyeL - 1.5} cy={eyeY - 0.5} r="1.5" fill="#fff" />
            <circle cx={eyeR - 1.5} cy={eyeY - 0.5} r="1.5" fill="#fff" />
          </>
        );
      case "scared":
        return (
          <>
            <circle cx={eyeL} cy={eyeY} r="7" fill="#fff" stroke="#1f2430" strokeWidth="1.5" />
            <circle cx={eyeR} cy={eyeY} r="7" fill="#fff" stroke="#1f2430" strokeWidth="1.5" />
            <circle cx={eyeL} cy={eyeY + 1} r="2.2" fill="#1f2430" />
            <circle cx={eyeR} cy={eyeY + 1} r="2.2" fill="#1f2430" />
          </>
        );
      case "sleepy":
        return (
          <>
            <line x1={eyeL - 6} y1={eyeY} x2={eyeL + 6} y2={eyeY} stroke="#1f2430" strokeWidth="3" strokeLinecap="round" />
            <line x1={eyeR - 6} y1={eyeY} x2={eyeR + 6} y2={eyeY} stroke="#1f2430" strokeWidth="3" strokeLinecap="round" />
          </>
        );
      default:
        return (
          <g className="companion-blink">
            <circle cx={eyeL} cy={eyeY} r="4.5" fill="#1f2430" />
            <circle cx={eyeR} cy={eyeY} r="4.5" fill="#1f2430" />
            <circle cx={eyeL - 1.5} cy={eyeY - 1.5} r="1.5" fill="#fff" />
            <circle cx={eyeR - 1.5} cy={eyeY - 1.5} r="1.5" fill="#fff" />
          </g>
        );
    }
  };

  const renderMouth = () => {
    if (beaked) return null; // beak replaces the mouth for birds
    const y = mouthY;
    switch (mood) {
      case "happy":
      case "love":
        return <path d={`M61 ${y - 4} Q 70 ${y + 9} 79 ${y - 4} Z`} fill="#7c2f3e" />;
      case "angry":
        return <path d={`M62 ${y + 2} Q 70 ${y - 6} 78 ${y + 2}`} stroke="#1f2430" strokeWidth="3" strokeLinecap="round" fill="none" />;
      case "sad":
        return <path d={`M63 ${y + 2} Q 70 ${y - 4} 77 ${y + 2}`} stroke="#1f2430" strokeWidth="3" strokeLinecap="round" fill="none" />;
      case "scared":
        return <ellipse cx="70" cy={y} rx="4.5" ry="6" fill="#7c2f3e" />;
      case "sleepy":
        return <circle cx="70" cy={y} r="3" fill="#7c2f3e" />;
      default:
        return <path d={`M63 ${y - 2} Q 70 ${y + 4} 77 ${y - 2}`} stroke="#1f2430" strokeWidth="3" strokeLinecap="round" fill="none" />;
    }
  };

  const blush = mood === "love" || mood === "happy";

  return (
    <svg className="companion-svg" viewBox="0 0 140 150" xmlns="http://www.w3.org/2000/svg">
      {/* ── tails (behind body) ── */}
      {sp === "fox" && (
        <g className="companion-tail">
          <path d="M92 118 Q 124 114 118 86 Q 136 108 114 130 Q 100 138 92 126 Z" fill={c.body} />
          <path d="M114 94 Q 128 110 112 126 Q 124 108 108 96 Z" fill="#fff" opacity="0.85" />
        </g>
      )}
      {sp === "cat" && (
        <path
          className="companion-tail"
          d="M94 126 Q 124 124 122 102 Q 122 92 112 92"
          stroke={c.body}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
      )}
      {sp === "bunny" && <circle cx="98" cy="124" r="9" fill="#fff" />}

      {/* ── body ── */}
      <ellipse cx="70" cy="116" rx="29" ry="27" fill={c.body} />
      <ellipse cx="70" cy="121" rx="17" ry="17" fill={sp === "chick" ? "#ffe39e" : "#fff"} opacity={sp === "cat" ? 0.75 : 0.95} />

      {/* wings / paws */}
      {sp === "penguin" ? (
        <>
          <ellipse className="companion-arm companion-arm--left" cx="42" cy="112" rx="8" ry="16" fill={c.body} transform="rotate(14 42 112)" />
          <ellipse className="companion-arm companion-arm--right" cx="98" cy="112" rx="8" ry="16" fill={c.body} transform="rotate(-14 98 112)" />
        </>
      ) : (
        <>
          <circle className="companion-arm companion-arm--left" cx="44" cy="124" r="8" fill={c.body} />
          <circle className="companion-arm companion-arm--right" cx="96" cy="124" r="8" fill={c.body} />
        </>
      )}

      {/* ── head ── */}
      <g className="companion-head">
        {/* ears */}
        {sp === "fox" && (
          <>
            <polygon points="46,34 34,6 64,22" fill={c.body} />
            <polygon points="48,30 41,12 58,21" fill={c.inner} />
            <polygon points="94,34 106,6 76,22" fill={c.body} />
            <polygon points="92,30 99,12 82,21" fill={c.inner} />
          </>
        )}
        {sp === "cat" && (
          <>
            <polygon points="42,38 36,6 66,24" fill={c.body} />
            <polygon points="45,32 41,14 59,24" fill={c.inner} />
            <polygon points="98,38 104,6 74,24" fill={c.body} />
            <polygon points="95,32 99,14 81,24" fill={c.inner} />
          </>
        )}
        {sp === "bunny" && (
          <>
            <g className="companion-ear companion-ear--left">
              <ellipse cx="54" cy="22" rx="9" ry="20" fill={c.body} transform="rotate(-10 54 22)" />
              <ellipse cx="54" cy="24" rx="4" ry="13" fill={c.inner} transform="rotate(-10 54 24)" />
            </g>
            <g className="companion-ear companion-ear--right">
              <ellipse cx="86" cy="22" rx="9" ry="20" fill={c.body} transform="rotate(10 86 22)" />
              <ellipse cx="86" cy="24" rx="4" ry="13" fill={c.inner} transform="rotate(10 86 24)" />
            </g>
          </>
        )}
        {sp === "panda" && (
          <>
            <circle cx="46" cy="38" r="11" fill={c.body} />
            <circle cx="94" cy="38" r="11" fill={c.body} />
          </>
        )}
        {sp === "chick" && (
          <g stroke={c.inner} strokeWidth="2.5" strokeLinecap="round" fill="none">
            <path d="M64 32 Q 62 24 56 22" />
            <path d="M70 30 Q 70 21 70 18" />
            <path d="M76 32 Q 78 24 84 22" />
          </g>
        )}

        {/* face */}
        <circle cx="70" cy={headCy} r={sp === "bunny" ? 28 : 30} fill={sp === "panda" ? "#f6f4f0" : faceColor} />
        {sp === "penguin" && <ellipse cx="70" cy={headCy + 4} rx="22" ry="18" fill="#fff" />}
        {muzzled && <ellipse cx="70" cy={headCy + 14} rx="13" ry="9" fill="#fff" />}

        {/* panda eye patches (soft, so the mood eyes stay readable) */}
        {sp === "panda" && (
          <>
            <ellipse cx={eyeL} cy={eyeY + 1} rx="9" ry="11" fill={c.inner} opacity="0.45" />
            <ellipse cx={eyeR} cy={eyeY + 1} rx="9" ry="11" fill={c.inner} opacity="0.45" />
          </>
        )}

        {/* noses / beaks */}
        {sp === "fox" && <path d={`M66 ${headCy + 9} L 74 ${headCy + 9} L 70 ${headCy + 14} Z`} fill="#3b2a20" />}
        {sp === "cat" && <path d={`M66 ${headCy + 9} L 74 ${headCy + 9} L 70 ${headCy + 14} Z`} fill={c.inner} />}
        {sp === "bunny" && <path d={`M67 ${headCy + 8} L 73 ${headCy + 8} L 70 ${headCy + 12} Z`} fill={c.inner} />}
        {sp === "panda" && <ellipse cx="70" cy={headCy + 12} rx="5" ry="3.5" fill="#2e2e3a" />}
        {sp === "penguin" && <polygon points={`62,${headCy + 6} 78,${headCy + 6} 70,${headCy + 16}`} fill={c.inner} />}
        {sp === "chick" && <polygon points={`64,${headCy + 7} 76,${headCy + 7} 70,${headCy + 15}`} fill={c.inner} />}

        {/* whiskers */}
        {muzzled && (
          <g stroke={c.inner} strokeWidth="1.5" strokeLinecap="round" opacity="0.9">
            <line x1="52" y1={headCy + 12} x2="40" y2={headCy + 10} />
            <line x1="52" y1={headCy + 16} x2="40" y2={headCy + 18} />
            <line x1="88" y1={headCy + 12} x2="100" y2={headCy + 10} />
            <line x1="88" y1={headCy + 16} x2="100" y2={headCy + 18} />
          </g>
        )}

        {renderEyes()}
        {renderMouth()}

        {blush && (
          <>
            <ellipse cx="48" cy={headCy + 12} rx="5.5" ry="3.5" fill="#ff8aa0" opacity="0.5" />
            <ellipse cx="92" cy={headCy + 12} rx="5.5" ry="3.5" fill="#ff8aa0" opacity="0.5" />
          </>
        )}
      </g>
    </svg>
  );
}

/* ═════════ Floating effects ═════════ */
function Effects({ effect }) {
  if (!effect) return null;
  switch (effect) {
    case "fire":
      return <div className="cfx cfx-fire"><i /><i /><i /></div>;
    case "anger":
      return (
        <div className="cfx cfx-anger">
          <svg viewBox="0 0 40 40" width="28" height="28">
            <g stroke="#e8453c" strokeWidth="5" strokeLinecap="round" fill="none">
              <path d="M20 4 L20 14" /><path d="M4 20 L14 20" />
              <path d="M36 20 L26 20" /><path d="M20 36 L20 26" />
            </g>
          </svg>
        </div>
      );
    case "hearts":
      return <div className="cfx cfx-hearts"><i /><i /><i /><i /></div>;
    case "rain":
      return (
        <div className="cfx cfx-rain">
          <span className="cfx-cloud" />
          <i /><i /><i />
        </div>
      );
    case "sweat":
      return <div className="cfx cfx-sweat" />;
    case "sparkles":
      return <div className="cfx cfx-sparkles"><i /><i /><i /><i /></div>;
    case "zzz":
      return <div className="cfx cfx-zzz"><span>z</span><span>z</span><span>z</span></div>;
    default:
      return null;
  }
}

/* pages where the companion is allowed to appear */
const isAllowedPage = (pathname) =>
  pathname === "/dashboard" ||
  pathname === "/community" ||
  pathname.startsWith("/community/");

export default function Companion() {
  const { user } = useAuth();
  const location = useLocation();

  /* Dev helper (stripped from production builds): preview a character
     on ANY page without logging in — in the browser console:
       localStorage.setItem('companion_dev', 'mochi')  // niko/mochi/pip/bao/waddles/coco
     then reload. Remove the key to turn it off. */
  const devChar = import.meta.env.DEV
    ? localStorage.getItem("companion_dev")
    : null;

  const owner =
    user?.id || user?._id || user?.email || (devChar ? "dev-preview" : null);
  const allowed = devChar ? true : isAllowedPage(location.pathname);

  const [charId, setCharId] = useState(null);
  const [mood, setMood] = useState("idle");
  const [effect, setEffect] = useState(null);
  const [motion, setMotion] = useState(null);
  const [bubble, setBubble] = useState(null);
  const [edge, setEdge] = useState(null); // 'left' | 'right' | null (bubble placement)
  const [phase, setPhase] = useState("in");

  const wrapRef = useRef(null);
  const xRef = useRef(null); // current x in px, applied via transform
  const busyRef = useRef(false);
  const lastFleeRef = useRef(0);
  const fleeResetRef = useRef(null);
  const bubbleTimerRef = useRef(null);
  const timersRef = useRef([]);
  const prevPathRef = useRef(location.pathname);
  const prevAllowedRef = useRef(allowed);

  const character = ANIMALS.find((c) => c.id === charId) || null;

  /* ── Assign a random animal on register / login ── */
  useEffect(() => {
    if (!owner) {
      setCharId(null);
      return;
    }
    if (devChar && ANIMALS.some((c) => c.id === devChar)) {
      setCharId(devChar);
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem("polylingo_companion") || "null");
      if (saved && saved.owner === owner && ANIMALS.some((c) => c.id === saved.charId)) {
        setCharId(saved.charId);
        return;
      }
    } catch (_) { /* corrupted — re-roll */ }
    const chosen = pick(ANIMALS).id;
    localStorage.setItem("polylingo_companion", JSON.stringify({ owner, charId: chosen }));
    setCharId(chosen);
  }, [owner, devChar]);

  /* ── Poof out / pop in when navigating between allowed pages ── */
  useEffect(() => {
    const prevAllowed = prevAllowedRef.current;
    const prevPath = prevPathRef.current;
    prevAllowedRef.current = allowed;
    prevPathRef.current = location.pathname;
    if (!allowed) return undefined;
    if (prevAllowed && prevPath !== location.pathname) {
      setPhase("out");
      const t = setTimeout(() => setPhase("in"), 420);
      timersRef.current.push(t);
      return () => clearTimeout(t);
    }
    setPhase("in");
    return undefined;
  }, [location.pathname, allowed]);

  /* ── Position: applied imperatively via transform (GPU, no relayout) ── */
  const applyX = (x, instant = false) => {
    const el = wrapRef.current;
    if (!el) return;
    xRef.current = x;
    if (instant) {
      el.style.transition = "none";
      el.style.transform = `translate3d(${x}px, 0, 0)`;
      // force the style to flush before re-enabling the transition
      void el.offsetWidth;
      el.style.transition = "";
    } else {
      el.style.transform = `translate3d(${x}px, 0, 0)`;
    }
    setEdge(x < 70 ? "left" : x > window.innerWidth - 170 ? "right" : null);
  };

  /* spawn position (and keep it on-screen when the window resizes) */
  useEffect(() => {
    if (!character || !allowed) return undefined;
    const w = wrapRef.current?.offsetWidth || 90;
    if (xRef.current == null) xRef.current = window.innerWidth - w - 28;
    applyX(clamp(xRef.current, 8, window.innerWidth - w - 8), true);

    const onResize = () => {
      const width = wrapRef.current?.offsetWidth || 90;
      applyX(clamp(xRef.current ?? 0, 8, window.innerWidth - width - 8), true);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charId, allowed]);

  /* ── EVASION: always run from the mouse — it can never be touched ── */
  useEffect(() => {
    if (!character || !allowed) return undefined;

    // cache the width so the chase loop never reads layout
    let cachedW = wrapRef.current?.offsetWidth || 84;
    const refreshW = () => {
      cachedW = wrapRef.current?.offsetWidth || 84;
    };
    window.addEventListener("resize", refreshW);

    let lastCheck = 0;
    const evade = (mx, my) => {
      const el = wrapRef.current;
      if (!el) return;

      // only the bottom strip of the screen scares it
      if (window.innerHeight - my > FLEE_STRIP) return;

      const w = cachedW;
      const center = (xRef.current ?? 0) + w / 2;
      const dx = mx - center;
      if (Math.abs(dx) > FLEE_RADIUS) return;

      const now = performance.now();
      if (now - lastFleeRef.current < 420) return;
      lastFleeRef.current = now;

      const minX = 8;
      const maxX = window.innerWidth - w - 8;
      const away = dx > 0 ? -1 : 1; // run opposite to the cursor
      const dash = 190 + Math.random() * 240;
      let target = (xRef.current ?? 0) + away * dash;
      let leap = false;

      // cornered? leap right over the cursor to the open side
      if (target < minX || target > maxX) {
        leap = true;
        target =
          away < 0
            ? clamp(mx + 150 + Math.random() * 200, minX, maxX)
            : clamp(mx - 150 - Math.random() * 200 - w, minX, maxX);
      }

      // face the direction it's running
      el.style.setProperty("--facing", target > (xRef.current ?? 0) ? -1 : 1);
      applyX(target);

      // personality reaction while fleeing
      busyRef.current = true;
      setMood(character.flee.mood);
      setEffect(character.flee.effect);
      setMotion(leap ? "leap" : "flee");
      if (!bubbleTimerRef.current && Math.random() < 0.4) {
        setBubble(pick(character.phrases.flee));
        bubbleTimerRef.current = setTimeout(() => {
          setBubble(null);
          bubbleTimerRef.current = null;
        }, 2200);
      }

      clearTimeout(fleeResetRef.current);
      fleeResetRef.current = setTimeout(() => {
        setMood("idle");
        setEffect(null);
        setMotion(null);
        busyRef.current = false;
        const elNow = wrapRef.current;
        if (elNow) elNow.style.setProperty("--facing", 1);
      }, 1000);
    };

    const onMove = (e) => {
      // light throttle: at most one proximity check every 50ms
      const now = performance.now();
      if (now - lastCheck < 50) return;
      lastCheck = now;
      evade(e.clientX, e.clientY);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", refreshW);
      clearTimeout(fleeResetRef.current);
      clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charId, allowed]);

  /* ── Random idle behaviors (quips, naps, little reactions) ── */
  useEffect(() => {
    if (!charId || !allowed) return undefined;
    let alive = true;
    let timer;
    const schedule = () => {
      if (!alive) return;
      timer = setTimeout(() => {
        if (!busyRef.current && character) {
          const roll = Math.random();
          if (roll < 0.5) {
            setBubble(pick(character.phrases.idle));
            const t = setTimeout(() => setBubble(null), 3200);
            timersRef.current.push(t);
          } else {
            const r = REACTIONS[pick(character.idleReactions)];
            if (r) {
              busyRef.current = true;
              setMood(r.mood);
              setEffect(r.effect);
              setMotion(r.motion || null);
              const t = setTimeout(() => {
                setMood("idle");
                setEffect(null);
                setMotion(null);
                busyRef.current = false;
              }, r.effect === "zzz" ? 4200 : 2400);
              timersRef.current.push(t);
            }
          }
        }
        schedule();
      }, 15000 + Math.random() * 18000);
    };
    schedule();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charId, allowed]);

  /* cleanup any stray timers on unmount */
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  if (!owner || !character || !allowed) return null;

  const wrapClasses = [
    "companion",
    `companion--${phase}`,
    motion ? `companion--${motion}` : "",
    edge ? `companion--edge-${edge}` : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      ref={wrapRef}
      className={wrapClasses}
      role="img"
      aria-label={`Your companion: ${character.label}`}
    >
      {bubble && <div className="companion-bubble">{bubble}</div>}
      <div className="companion-inner">
        <Effects effect={effect} />
        <AnimalAvatar c={character} mood={mood} />
        <div className="companion-shadow" aria-hidden="true" />
      </div>
    </div>
  );
}
