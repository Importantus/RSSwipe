FROM node:16.17.0 AS building

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm install

ARG BACKEND_URL
ENV NG_BACKEND_URL=$BACKEND_URL

COPY . .
RUN cp ./src/environments/environment.prod.ts ./src/environments/environment.prod.ts.old &&  \
    sed "s%BACKEND_URL: '0'%BACKEND_URL: '$NG_BACKEND_URL'%" ./src/environments/environment.prod.ts.old > ./src/environments/environment.prod.ts

RUN cat ./src/environments/environment.prod.ts

RUN npx ng build --configuration=production

FROM nginx:1.23.1-alpine as running
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=building /build/dist /frontend/build

EXPOSE 80
