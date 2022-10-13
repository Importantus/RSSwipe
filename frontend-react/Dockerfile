FROM node:16.17.0 AS building

COPY package**.json .
RUN npm install
WORKDIR /usr/app

EXPOSE 3000
CMD ["npm", "start"]