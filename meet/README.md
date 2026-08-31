# meet

The selective forwarding unit and signaling for Serenite support group
sessions. Its own process because mediasoup holds real UDP ports and cannot run
inside Next.js's request model.

## What owns what

Serenite's Next.js app owns identity, group membership, eligibility and
scheduling. It decides who may enter a room and says so by minting a
short-lived signed join token. This service owns media only: it verifies that
token locally, with no callback and no database round-trip, and forwards RTP.

The one thing crossing between them is `JOIN_TOKEN_SECRET`, which must match
`client/.env`.

## Database

Shares Serenite's Postgres and reads it with plain `pg`. Every statement it
runs is in `src/db/queries.js`. Serenite's `client/prisma/schema.prisma`
remains the single definition of those tables; if it changes, `queries.js` has
to change with it.

A second Prisma client was rejected: it would mean duplicating or
cross-importing the schema, plus a generate step in the container build, for
six statements.

## Running

```bash
npm install
cp .env.example .env     # fill in DATABASE_URL and JOIN_TOKEN_SECRET
npm run dev              # http://localhost:4100/health
```

`MEDIASOUP_ANNOUNCED_ADDRESS` must be set in production. `listenInfos` does not
expand `0.0.0.0` into real interface addresses, so the ICE candidate address
comes from that variable alone. Unset, the service starts, reports healthy, and
never connects anyone.

## Origin of this code

The media path, signaling handlers and wire protocol were taken from
`samples/mediasoup-meet` and adapted. What changed: the data layer is Serenite's
schema rather than the sample's, admission is Serenite's decision rather than
this service's, and recording is not wired up.
