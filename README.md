# Node Data Processor

An example Node data processor. Tries following methods:

1. JSON parser
2. Raw buffer
3. Multiple threads

## How to run

Please make sure you have at least node 10.5.0 to run the server.

Run `yarn` in CLI, then run the following three commands in separate CLI windows.

1. `npm start:client`
2. `npm start:server`
3. `npm start:mock-external-server`

Then, go to `http://localhost:8093/`.
## Runtime and security changes

Use Node 22.13 or later. Install with `yarn install --frozen-lockfile --ignore-scripts`, then run `yarn test`, `yarn lint`, and `yarn build`. Vite replaces the obsolete Webpack/Babel pipeline; production files are in `client/dist`. The three existing start commands run the client on 8093, processing API on 8094, and mock parser on 8095. Servers bind to loopback unless HOST is explicitly set.

All request bodies are limited to 50 MiB, including the buffer endpoint regardless of content type. Requests allow at most 100,000 records and 1–8 workers. The buffer endpoint accepts the original bracket-framed newline-separated JSON objects and a final line without a newline. Parser failures return a completed error response. `PARSER_URL` configures the server-side parser URL; it defaults to the local mock parser. Requests cannot choose this URL.
