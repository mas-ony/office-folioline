# @folioline/relay

The live-session relay of Folioline, a Word (DOCX) editor that runs in the browser. When someone
chooses **Settings › Start a live session**, the editor uploads the document to the relay and
shows an invite link and a QR code. Everyone who opens the link edits the same document in real
time, with shared comments and each other's cursors.

For each room, the relay keeps the DOCX the session started from and the ordered list of editing
steps (the ProseMirror collaboration protocol). It sends everyone's steps, comment threads and
cursors over Server-Sent Events.

## Install

```bash
npm install --save-dev @folioline/relay   # as a Vite plugin
npm install @folioline/relay              # in a Node server
```

## Use

```js
// vite.config.ts: serves /collab from `vite` and `vite preview`
import { collabRelay } from '@folioline/relay';
export default defineConfig({ plugins: [vue(), collabRelay()] });
```

```js
// Any Node server (node:http, Connect, Express); other requests go to next()
import { createRelayMiddleware } from '@folioline/relay';
app.use(createRelayMiddleware({ base: '/collab' }));
```

`base` is the path the relay answers under (default `/collab`). The editor's `relay` option must
match it.

## Requests

Under the base path:

| Request | |
| --- | --- |
| `GET /collab/health` | `{ ok, rooms, addresses }` |
| `POST /collab/rooms` | Starts a room from the DOCX bytes in the body (file name in `x-file-name`); answers `{ room }` |
| `GET /collab/rooms/:room/doc` | The DOCX the room started from |
| `GET /collab/rooms/:room/events?since=N` | Event stream: steps, comment threads (`meta`) and cursors (`presence`) |
| `POST /collab/rooms/:room/steps` | `{ version, steps, clientID }`; 409 with the room's version when the client's is not the latest |
| `POST /collab/rooms/:room/meta` | `{ clientID, comments }` |
| `POST /collab/rooms/:room/presence` | `{ clientID, name, color, anchor, head }` |

## Limits

- Rooms live in the server's memory: they end when it stops or after 12 hours without use.
- There is no sign-in. Anyone who can reach the server and has a room's link can join, so put the
  relay behind your own authentication before you expose it outside a trusted network.
- A document can be up to 64 MB, and other requests up to 16 MB.
- Headers, footers and footnotes cannot be edited while a document is shared.

## License

MIT
