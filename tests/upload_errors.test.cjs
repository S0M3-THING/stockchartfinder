// Run the actual browser error handler with mocked browser/network boundaries.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../static/scripts.js'), 'utf8');

const cases = [
  ['File type not allowed. Only jpg, jpeg, png, heic accepted.', 'Invalid File Type'],
  ['max_content_length exceeded. File too large.', 'File Too Large'],
  ['5 per day limit exceeded', 'Daily Limit Reached'],
  ['reCAPTCHA verification failed', 'reCAPTCHA Verification Failed'],
  ['Unexpected server failure', 'Analysis Failed'],
];

for (const [message, title] of cases) {
  test(message, async () => {
    const notifications = [];
    let resets = 0;
    const context = vm.createContext({
      document: {
        addEventListener() {},
        getElementById() {
          return {
            files: [{ size: 10, type: 'image/png' }],
            classList: { add() {}, remove() {} },
            style: {},
          };
        },
      },
      grecaptcha: { getResponse: () => 'test-token', reset() { resets++; } },
      FormData: class { append() {} },
      fetch: async () => ({ ok: false, json: async () => ({ error: message }) }),
      setInterval: () => 1,
      clearInterval() {},
      console: { error() {} },
    });
    vm.runInContext(source, context);
    context.showNotification = (type, heading) => notifications.push({ type, title: heading });
    context.analyzeImage();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(notifications, [{ type: 'error', title }]);
    assert.equal(resets, 1);
  });
}
