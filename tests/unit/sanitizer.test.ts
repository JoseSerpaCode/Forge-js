import { sanitizeEditorBlocks } from '../../src/lib/sanitizer.js';
import assert from 'assert';

const inputBlocks = [
  {
    type: 'paragraph',
    data: { text: 'Hello <b onmouseover="alert()">World</b> <a href="javascript:alert(1)">Click</a> <a href="/internal" target="_blank">Safe</a>' }
  },
  {
    type: 'raw',
    data: { html: '<script>alert("xss")</script>' }
  }
];

const output = sanitizeEditorBlocks(inputBlocks);

console.log("--- OUTPUT ---");
console.log(JSON.stringify(output, null, 2));
console.log("--------------");

assert.strictEqual(output.length, 1, 'Should filter out the raw block');
assert.strictEqual(output[0].type, 'paragraph', 'Remaining block should be paragraph');
assert.strictEqual(output[0].data.text, 'Hello <b>World</b> <a>Click</a> <a href="/internal" target="_blank" rel="noopener noreferrer">Safe</a>', 'Paragraph text should be sanitized correctly');

console.log("Test passed successfully!");
