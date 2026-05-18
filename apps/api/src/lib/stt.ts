/**
 * Speech to Text via Groq Whisper API.
 *
 * Takes base64 encoded audio from the browser,
 * sends it to Groq Whisper, returns the transcript string.
 *
 * Same API key as the LLM — no extra setup needed.
 */

import { logger } from "./logger";
//logger import ho raha hai for debugging aur erros show krne ke liyya
const GROQ_API_KEY = process.env["GROQ_API_KEY"];


//a function that will convert audio to text
export async function transcribeAudio(

  audioBase64: string, //browser se aane wala audio base64 format me hoga
  mimeType: string, //audio format
  language: string //user ke seleted language 
): Promise<string> { 
    
// Function akhir me string return karega.
// Yani transcript text.
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set");
  }

  // Base64 encoded audio ko normal binary string me convert kar raha hai.
  const binaryStr = atob(audioBase64);
  const bytes = new Uint8Array(binaryStr.length); //audio data ko byte array me convert kar raha hai, jo fetch API ke liye zaroori hai.
  for (let i = 0; i < binaryStr.length; i++) { //binary string ke har character ko uske char code me convert kar raha hai, jo byte value hoti hai.
    bytes[i] = binaryStr.charCodeAt(i); //yeh loop audio data ko byte array me fill kar raha hai.
  }

  // Build multipart form — Groq Whisper expects a file upload
  const blob = new Blob([bytes], { type: mimeType }); //File upload karne ke liye use hota hai.
  const form = new FormData();

  // File extension must match the mime type
  const ext = mimeType.includes("webm") ? "webm" : "wav"; //yahan par audio format ke hisaab se file extension set kar raha hai, kyunki Groq Whisper API ko yeh pata hona chahiye ki file kis format me hai.
  form.append("file", blob, `audio.${ext}`); //Audio file upload form me add kar raha hai.
  form.append("model", "whisper-large-v3"); //Groq ko bata raha hai konsa AI model use karna hai.

  // Hint the language to improve accuracy
  // Groq Whisper uses ISO 639-1 codes: "es", "fr", "de" etc.
  const langCode = LANGUAGE_CODES[language] ?? "en";
//   Language name ko short code me convert kar raha hai.

// Example:

// arabic → ar
// spanish → es

// Agar language na mile to default English.
  form.append("language", langCode);

  form.append("response_format", "json"); //Groq se response JSON format me chahiye, jisme transcript text hoga.

  const startTime = Date.now(); //transcription process start hone ka time record kar raha hai, taaki hum log duration calculate kar sakein aur debugging ke liye use kar sakein.

  const res = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        // Do NOT set Content-Type here — fetch sets it automatically
        // with the correct boundary for multipart/form-data
      },
      body: form,
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    logger.error("Whisper API error", { status: res.status, err });
    throw new Error(`Whisper error ${res.status}: ${err}`);
  }

  const data = await res.json() as { text: string };

  logger.debug("STT complete", {
    language,
    durationMs: Date.now() - startTime,
    transcript: data.text.slice(0, 50),
  });

  return data.text.trim();
}

// Groq Whisper language codes
const LANGUAGE_CODES: Record<string, string> = {
  spanish:    "es",
  french:     "fr",
  german:     "de",
  italian:    "it",
  japanese:   "ja",
  mandarin:   "zh",
  portuguese: "pt",
  arabic:     "ar",
};