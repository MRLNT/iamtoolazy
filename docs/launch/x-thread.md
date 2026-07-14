# X thread draft

1/ I built a free token saver for Claude/ChatGPT/Gemini — then benchmarked
it and found my own directives cost +52.8% input tokens on short prompts.

I'm publishing that number first. Here's why 🧵🐨

2/ Viral token savers claim 65–75%. Independent re-benchmarks keep
finding single digits on real work, eaten by unreported input overhead.

So my benchmark prints the input-overhead column FIRST. For every
condition. Including mine.

3/ What actually measured well: the thread distiller. −30% of re-sent
history per turn, break-even after ~3.4 turns — and real long threads
(where your usage limits die) save far more.

4/ The engine skips when it can't win. Every skip prints a reason in the
ledger. 6 of 80 benchmark prompts got skipped exactly as designed.

5/ Free forever, zero-network by construction. No keys, no accounts, no
telemetry. We built a BYOK feature, field-tested it, and deleted it.

6/ Try it in 10 seconds, in your browser, nothing leaves the page:
https://mrlnt.github.io/iamtoolazy/playground/

Raw JSONL, method draft, and the numbers that hurt:
https://github.com/MRLNT/iamtoolazy
