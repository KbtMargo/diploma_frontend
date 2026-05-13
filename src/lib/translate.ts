const SOURCE = 'uk';
const CACHE_VER = 'sw_tr3';

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h.toString(36);
}

function cacheGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function cacheSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch {}
}

export async function translateToUk(text: string, fromLang: string): Promise<string> {
  if (!text?.trim() || fromLang === SOURCE) return text;
  const key = `${CACHE_VER}:${fromLang}_uk:${hash(text)}`;
  const cached = cacheGet(key);
  if (cached !== null) return cached;
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${SOURCE}`
    );
    const data = await res.json();
    const result: string = data.responseData?.translatedText ?? '';
    const ok =
      result &&
      data.responseStatus === 200 &&
      !data.quotaFinished &&
      !result.startsWith('MYMEMORY WARNING');
    if (ok) cacheSet(key, result);
    return ok ? result : text;
  } catch {
    return text;
  }
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text?.trim() || targetLang === SOURCE) return text;

  const key = `${CACHE_VER}:${targetLang}:${hash(text)}`;
  const cached = cacheGet(key);
  if (cached !== null) return cached;

  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${SOURCE}|${targetLang}`
    );
    const data = await res.json();
    const result: string = data.responseData?.translatedText ?? '';
    const ok =
      result &&
      data.responseStatus === 200 &&
      !data.quotaFinished &&
      !result.startsWith('MYMEMORY WARNING');
    if (ok) cacheSet(key, result);
    return ok ? result : text;
  } catch {
    return text;
  }
}
