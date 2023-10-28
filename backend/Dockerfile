FROM git.mylab.th-luebeck.de:4181/vwprg/teaching/docker-archive/node:latest

# Create app directory
WORKDIR /usr/src/app

# Combine all environment variables into one mariadb connection string
# ARG DB_DATABASE
# ARG DB_USER
# ARG DB_PASSWORD
# ARG DB_HOST
# ARG DB_PORT
# ENV MYSQL_CONNECTION_STRING="mysql://test${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}"

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 8080
CMD [ "npm", "run", "serve" ]