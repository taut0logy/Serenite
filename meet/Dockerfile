# mediasoup builds native code, so the image needs a toolchain and Python at
# install time. They are dropped from the final stage: shipping a compiler in
# a service that terminates untrusted media is not worth the convenience.
FROM node:22-bookworm-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential python3 pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim

WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

ENV NODE_ENV=production

# Signaling. Media does not pass through here: it arrives on the UDP/TCP range
# below, which must be published on the host with `network_mode: host` or an
# explicit range, because mediasoup announces those ports directly to clients.
EXPOSE 4100

# One port per worker, from MEDIASOUP_RTC_BASE_PORT.
EXPOSE 44440-44448/udp
EXPOSE 44440-44448/tcp

# Runs as an unprivileged user; none of these ports is privileged.
USER node

CMD ["node", "src/main.js"]
