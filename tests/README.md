# Focused regression tests

Run with Node.js 22 or newer (no installation or API credentials required):

```sh
node --test tests/*.test.cjs
```

The tests execute the checked-in sources in isolated VM contexts. All external
requests are stubbed; no live services are contacted.

- `tiktok-tts.test.cjs`: exercises the registered worker fetch listener, covering
  input rejection, query encoding, binary MP3 delivery, upstream failures,
  non-audio responses, and voice-list normalization. These boundaries can turn
  upstream outages or unexpected payloads into broken downloads.
- `dashboard.test.cjs`: executes the page's inline script through its actual
  button handlers, covering all four endpoint mappings, URL encoding, empty-input
  handling, loading/result isolation, and network/JSON failures. It uses a minimal
  DOM stub, not a browser or visual test.

Production files are unchanged. The separate `Tts-open-ai.js` currently fails
JavaScript syntax checking because its opening attribution is not commented;
these tests do not strip that text or claim to verify that worker.
