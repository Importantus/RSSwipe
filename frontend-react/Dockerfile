FROM node:16.17.0 AS building

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm install

COPY . .

ARG BACKEND_URL
ENV REACT_APP_BACKEND_URL=$BACKEND_URL

RUN npm run build

FROM nginx:1.23.1-alpine as running
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=building /build/build /frontend/build