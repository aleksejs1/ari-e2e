FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY package.json ./
RUN npm install --production=false

COPY tsconfig.json server.ts ./

EXPOSE 4011

CMD ["npm", "start"]
