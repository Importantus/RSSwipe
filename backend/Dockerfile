FROM node:16

# Create app directory
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package**.json .
RUN npm install
WORKDIR /usr/app
# If you are building your code for production
# RUN npm ci --only=production

EXPOSE 3080
CMD [ "node", "bin/www" ]