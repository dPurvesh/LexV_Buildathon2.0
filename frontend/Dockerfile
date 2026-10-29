FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

ARG NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://mstscan.com
ENV NEXT_PUBLIC_BLOCK_EXPLORER_URL=$NEXT_PUBLIC_BLOCK_EXPLORER_URL

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]