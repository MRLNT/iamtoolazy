// Thread distiller.
//
// Web chat's real token sink is the ever-growing history that gets re-sent
// every turn. An extension cannot edit that history — but it can generate
// one prompt that asks the model to distill the whole thread into a compact
// brief, which the user pastes into a fresh thread. One-time cost, then
// every following turn is cheap again.

export const DISTILL_PROMPT = {
  en: (maxTokens = 400) =>
    `Distill this entire conversation into a compact brief (max ~${maxTokens} tokens) I can paste into a new thread to continue seamlessly. Include only: goal, key decisions with one-line reasons, current state, open items, and any code/identifiers/URLs that must survive verbatim. No narrative recap, no politeness.`,
  id: (maxTokens = 400) =>
    `Rangkum seluruh percakapan ini jadi brief padat (maks ~${maxTokens} token) yang bisa saya tempel di thread baru untuk lanjut mulus. Isi hanya: tujuan, keputusan penting dengan alasan satu baris, kondisi terkini, hal yang masih terbuka, dan kode/identifier/URL yang harus persis. Tanpa cerita ulang, tanpa basa-basi.`,
};
