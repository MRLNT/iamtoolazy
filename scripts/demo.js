// Quick look at the pipeline. Run: npm run demo
import { processPrompt, initTokenizer, estimatorMode } from '../packages/core/src/index.js';

await initTokenizer();

const SAMPLES = [
  'Hi! Could you please implement a login function with rate limiting in Node? I am building a small internal app. Avoid external auth providers and keep dependencies minimal. Show the code with short comments. Thanks in advance!',
  'Tolong bantu buatkan skema database untuk aplikasi kasir warung ya. Saya sedang membangun MVP sendirian. Jangan pakai ORM, maksimal 5 tabel. Tulis dalam format SQL. Makasih banyak!',
  'What is HTTP/3?',
];

console.log(`tokenizer: ${estimatorMode()}\n${'='.repeat(60)}`);

for (const raw of SAMPLES) {
  const r = processPrompt(raw);
  console.log('\nBEFORE:', JSON.stringify(raw));
  console.log('AFTER :', JSON.stringify(r.output));
  console.log('stages:', r.stages.map((s) => s.stage).join(' → ') || '(untouched)');
  console.log(
    `tokens: ${r.tokens.before} → ${r.tokens.after} input (Δ${r.tokens.inputDelta >= 0 ? '+' : ''}${r.tokens.inputDelta}), predicted output savings ${r.tokens.predictedOutputSavings}, predicted net ${r.tokens.predictedNet >= 0 ? '+' : ''}${r.tokens.predictedNet}`,
  );
  if (r.injection && !r.injection.inject) console.log('inject: skipped —', r.injection.reason);
  console.log('-'.repeat(60));
}
