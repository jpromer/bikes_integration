FROM node:current-alpine AS node

FROM node AS builder

WORKDIR /app

COPY package*.json ./

RUN npm i

COPY . .

RUN npm run build

FROM node AS final

ENV NODE_ENV production

RUN apk --no-cache -U upgrade

RUN mkdir -p /home/node/app/dist && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./

RUN npm i --only=production --omit=dev

COPY --chown=node:node --from=builder /app/dist ./dist

USER node

CMD [ "node", "./dist/app.js" ]