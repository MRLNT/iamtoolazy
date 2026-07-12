import test from 'node:test';
import assert from 'node:assert/strict';
import { planImageDownscale } from '../src/media.js';

test('media: 4K screenshot is worth downscaling, target respects maxSide', () => {
  const plan = planImageDownscale([{ name: 'shot.png', width: 3840, height: 2160 }]);
  assert.equal(plan.shouldOffer, true);
  const [it] = plan.items;
  assert.equal(it.shrink, true);
  assert.ok(Math.max(it.targetWidth, it.targetHeight) <= 1092);
  assert.ok(it.saved > 0);
  assert.ok(plan.totalSaved >= 50);
  // aspect ratio survives the resize (within rounding)
  assert.ok(Math.abs(it.targetWidth / it.targetHeight - 3840 / 2160) < 0.01);
});

test('media: small image is left alone — no offer, no noise', () => {
  const plan = planImageDownscale([{ name: 'icon.png', width: 640, height: 480 }]);
  assert.equal(plan.shouldOffer, false);
  assert.equal(plan.items[0].shrink, false);
  assert.equal(plan.totalSaved, 0);
});

test('media: mixed batch — totals only count the shrinkable ones', () => {
  const plan = planImageDownscale([
    { name: 'big.jpg', width: 4000, height: 3000 },
    { name: 'small.png', width: 200, height: 200 },
  ]);
  assert.equal(plan.shouldOffer, true);
  assert.equal(plan.items[1].shrink, false);
  assert.equal(plan.totalBefore, plan.items[0].before + plan.items[1].before);
  assert.equal(plan.totalAfter, plan.items[0].after + plan.items[1].before);
  assert.equal(plan.totalSaved, plan.items[0].saved);
});

test('media: minSaved gate — tiny savings never trigger the overlay', () => {
  // barely over the cap: real but negligible saving
  const plan = planImageDownscale([{ width: 1200, height: 900 }], { minSaved: 5000 });
  assert.equal(plan.shouldOffer, false);
});

test('media: openai normalizes internally — no fake savings, no offer', () => {
  // OpenAI's own pipeline rescales into a 2048/768 box before tiling, so
  // a client-side downscale saves ~zero tokens there. Honest numbers means
  // we stay quiet instead of selling savings that do not exist.
  const plan = planImageDownscale([{ width: 4000, height: 3000 }], { provider: 'openai' });
  assert.equal(plan.items[0].saved, 0);
  assert.equal(plan.shouldOffer, false);
});
