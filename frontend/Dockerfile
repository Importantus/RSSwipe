FROM node:16.17.0 AS building

COPY package**.json .
RUN npm install
WORKDIR /usr/app

CMD ["npm run watch-frontend"]