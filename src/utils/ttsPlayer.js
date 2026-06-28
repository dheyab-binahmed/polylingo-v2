/**
 * ─────────────────────────────────────────────────────────────
 *  Shared TTS player — used by the Speaking Assessment and the
 *  Practice tutor so both behave identically.
 *
 *  Design goals (fixes the "more than one voice" + choppy audio bugs):
 *   1. ONE voice per reply. A reply is spoken either entirely by the
 *      neural backend voice OR entirely by a single pinned browser
 *      voice — the two engines are never interleaved within a reply.
 *   2. Pinned browser fallback voice. The browser voice is chosen once
 *      per language and cached, so the fallback never drifts between
 *      genders/accents (the old code let the browser pick its default
 *      on every sentence).
 *   3. Single audio channel. Neural audio plays through one <Audio>
 *      element; before any browser-speech we cancel speechSynthesis so
 *      two clips can never overlap.
 *   4. Promise-based completion (waitDone) instead of polling.
 *   5. cancel() aborts in-flight audio + queue so a new turn never
 *      plays over the previous one.
 * ─────────────────────────────────────────────────────────────
 */

// Cache of the chosen SpeechSynthesisVoice per language base (e.g. "en").
const _voiceCache = {};

function pickBrowserVoice(lang) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const base = (lang || "en").split("-")[0].toLowerCase();
  if (base in _voiceCache) return _voiceCache[base];
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return undefined; // not loaded yet — don't cache
  const target = (lang || "").toLowerCase();
  const v =
    voices.find((vv) => vv.lang && vv.lang.toLowerCase() === target) ||
    voices.find((vv) => vv.lang && vv.lang.toLowerCase().startsWith(base)) ||
    voices[0];
  _voiceCache[base] = v || null;
  return _voiceCache[base];
}

// Speak a single string with the pinned browser voice. Resolves when done.
function browserSpeak(text, lang) {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
    const doSpeak = () => {
      try {
        window.speechSynthesis.cancel(); // never overlap a previous utterance
        const u = new SpeechSynthesisUtterance(String(text || "").replace(/"/g, ""));
        u.lang = lang || "en-US";
        // Match the neural engine's pace (Edge default ≈ +8%) so the fallback
        // doesn't suddenly sound slower/faster than the rest of the reply.
        u.rate = 1.0;
        u.pitch = 1.0;
        u.volume = 1.0;
        const v = pickBrowserVoice(lang);
        if (v) u.voice = v;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      } catch {
        resolve();
      }
    };
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      doSpeak();
    } else {
      // Voices load asynchronously on first use — wait briefly then speak.
      let fired = false;
      const handler = () => {
        if (fired) return;
        fired = true;
        try { window.speechSynthesis.removeEventListener("voiceschanged", handler); } catch (_) {}
        doSpeak();
      };
      window.speechSynthesis.addEventListener("voiceschanged", handler);
      setTimeout(handler, 250);
    }
  });
}

/**
 * Create a TTS player.
 *
 * @param {object}   opts
 * @param {string}   opts.lang        TTS language tag (e.g. "en-US").
 * @param {function} opts.fetchAudio  (sentence) => Promise<{ audio|base64, content_type|contentType } | null>
 *                                     Returns neural audio for a sentence, or null/throws to fall back.
 * @param {function} [opts.onStart]   Called when playback begins (first sentence).
 * @param {function} [opts.onEnd]     Called when the queue fully drains (or on cancel).
 * @returns {{ enqueue: function, waitDone: function, cancel: function, get speaking(): boolean }}
 */
export function createTTSPlayer({ lang, fetchAudio, onStart, onEnd }) {
  let queue = [];          // array of Promises resolving to { sentence, base64, contentType }
  let draining = false;
  let cancelled = false;
  let engine = null;       // null → undecided, "neural" or "browser" once chosen
  let currentAudio = null; // the <Audio> element currently playing
  let doneResolvers = [];

  const playNeural = (base64, contentType) =>
    new Promise((resolve, reject) => {
      const el = new Audio(`data:${contentType || "audio/mpeg"};base64,${base64}`);
      currentAudio = el;
      el.onended = () => { if (currentAudio === el) currentAudio = null; resolve(); };
      el.onerror = () => { if (currentAudio === el) currentAudio = null; reject(new Error("audio error")); };
      el.play().catch((e) => { if (currentAudio === el) currentAudio = null; reject(e); });
    });

  const resolveDone = () => {
    const rs = doneResolvers;
    doneResolvers = [];
    rs.forEach((r) => r());
  };

  const drain = async () => {
    if (draining) return;
    draining = true;
    onStart?.();
    while (queue.length > 0 && !cancelled) {
      let item = null;
      try { item = await queue.shift(); } catch { item = null; }
      if (cancelled) break;
      const sentence = (item && item.sentence) || "";
      if (!sentence) continue;

      // Reply already committed to the browser voice → stay on it.
      if (engine === "browser") {
        await browserSpeak(sentence, lang);
        continue;
      }

      const base64 = item && item.base64;
      if (base64) {
        try {
          await playNeural(base64, item.contentType);
          engine = "neural"; // commit the whole reply to neural
          continue;
        } catch {
          // Neural playback failed for this sentence.
          if (engine === "neural") {
            // Already speaking neurally — skip this clip rather than switch
            // voices mid-reply (the text is already on screen).
            continue;
          }
          // First sentence failed → use the browser voice for the WHOLE reply.
          engine = "browser";
          await browserSpeak(sentence, lang);
          continue;
        }
      }

      // No neural audio returned (fetch failed / not configured).
      if (engine === "neural") continue; // keep neural-only, skip silent clip
      engine = "browser";
      await browserSpeak(sentence, lang);
    }
    draining = false;
    if (queue.length > 0 && !cancelled) { drain(); return; }
    onEnd?.();
    resolveDone();
  };

  return {
    /** Queue a sentence; synthesis starts immediately, playback stays in order. */
    enqueue(sentence) {
      const s = String(sentence || "").trim();
      if (!s || cancelled) return;
      const job = Promise.resolve()
        .then(() => fetchAudio(s))
        .then((r) => ({
          sentence: s,
          base64: (r && (r.audio ?? r.base64 ?? r.audioBase64)) || null,
          contentType: (r && (r.content_type || r.contentType)) || "audio/mpeg",
        }))
        .catch(() => ({ sentence: s, base64: null }));
      queue.push(job);
      drain();
    },

    /** Resolves once everything queued so far has finished playing. */
    waitDone() {
      if (!draining && queue.length === 0) return Promise.resolve();
      return new Promise((res) => doneResolvers.push(res));
    },

    /** Stop everything immediately (new turn / unmount). */
    cancel() {
      cancelled = true;
      queue = [];
      try { currentAudio?.pause(); } catch (_) {}
      currentAudio = null;
      try { window.speechSynthesis?.cancel(); } catch (_) {}
      resolveDone();
    },

    get speaking() {
      return draining;
    },
  };
}

export { browserSpeak, pickBrowserVoice };
