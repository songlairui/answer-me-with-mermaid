# How does an HTTPS request work?

The browser and server first agree on keys with a TLS handshake, then exchange the
actual HTTP request and response over that encrypted channel.

```mermaid
sequenceDiagram
  participant B as Browser
  participant S as Server
  B->>S: ClientHello (versions, ciphers, key share)
  S->>B: ServerHello + certificate + key share
  B->>B: Verify certificate chain
  Note over B,S: Both derive the same session keys
  B->>S: Finished (encrypted)
  S->>B: Finished (encrypted)
  B->>S: GET /index.html
  S->>B: 200 OK + body
```

Notes: this is TLS 1.3 (one round trip). Resumed sessions can skip most of the handshake.
