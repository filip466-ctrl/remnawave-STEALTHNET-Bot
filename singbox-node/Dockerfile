# STEALTHNET sing-box node: agent + sing-box binary
# Build from repo root: docker build -f singbox-node/Dockerfile .
# Run: STEALTHNET_API_URL, SINGBOX_NODE_TOKEN, PROTOCOL, PORT

ARG SINGBOX_VERSION=1.12.22

# Stage 1: download sing-box
FROM alpine:3.19 AS singbox-builder
ARG SINGBOX_VERSION
# Fallback-зеркала для apk: dl-cdn.alpinelinux.org иногда недоступен.
RUN set -eux; \
    apk add --no-cache curl \
    || (printf 'https://mirror.yandex.ru/mirrors/alpine/v3.19/main\nhttps://mirror.yandex.ru/mirrors/alpine/v3.19/community\n' > /etc/apk/repositories && apk update && apk add --no-cache curl) \
    || (printf 'https://mirrors.tuna.tsinghua.edu.cn/alpine/v3.19/main\nhttps://mirrors.tuna.tsinghua.edu.cn/alpine/v3.19/community\n' > /etc/apk/repositories && apk update && apk add --no-cache curl)
WORKDIR /build
RUN curl -sL "https://github.com/SagerNet/sing-box/releases/download/v${SINGBOX_VERSION}/sing-box-${SINGBOX_VERSION}-linux-amd64.tar.gz" -o singbox.tar.gz && \
    tar xzf singbox.tar.gz && \
    mv sing-box-*-linux-amd64/sing-box /build/sing-box && \
    chmod +x /build/sing-box

# Stage 2: node + agent + sing-box (openssl для самоподписанного сертификата при HYSTERIA2/TROJAN)
FROM node:22-alpine
ARG SINGBOX_VERSION
RUN set -eux; \
    apk add --no-cache openssl \
    || (printf 'https://mirror.yandex.ru/mirrors/alpine/v3.19/main\nhttps://mirror.yandex.ru/mirrors/alpine/v3.19/community\n' > /etc/apk/repositories && apk update && apk add --no-cache openssl) \
    || (printf 'https://mirrors.tuna.tsinghua.edu.cn/alpine/v3.19/main\nhttps://mirrors.tuna.tsinghua.edu.cn/alpine/v3.19/community\n' > /etc/apk/repositories && apk update && apk add --no-cache openssl)
WORKDIR /app

COPY --from=singbox-builder /build/sing-box /usr/local/bin/sing-box
COPY singbox-node/agent.js /app/agent.js

ENV CONFIG_PATH=/app/config.json

CMD ["node", "agent.js"]
