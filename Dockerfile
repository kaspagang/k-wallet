FROM node:lts-alpine

RUN addgroup -S k-wallet && adduser -S k-wallet -G k-wallet
RUN mkdir /app && chown k-wallet:k-wallet /app
RUN apk update && apk add git vim

USER k-wallet
WORKDIR /app

RUN git clone --single-branch --branch multiple_targets https://github.com/tmrlvi/kaspa-wallet.git
WORKDIR /app/kaspa-wallet
RUN npm install
RUN npx tsc

WORKDIR /app
RUN git clone https://github.com/kaspagang/k-wallet.git

WORKDIR /app/k-wallet
RUN npm install
CMD ["npm", "run", "start"]
