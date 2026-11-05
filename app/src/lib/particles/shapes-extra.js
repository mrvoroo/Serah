// @ts-nocheck
// سجل الأشكال الإضافية: رموز الأنبياء في الرحلة وأشكال صفحة النبي المتحولة بالضغط.
// كل شكل: (k) => [[وزن، مولّد، flow؟], ...] حيث k = kit(r) من ./kit.js
import { SHAPES_A } from './shapes-a.js';
import { SHAPES_B } from './shapes-b.js';
import { SHAPES_C } from './shapes-c.js';

export const EXTRA_SHAPES = { ...SHAPES_A, ...SHAPES_B, ...SHAPES_C };
