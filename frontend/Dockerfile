FROM node:20.11.0 AS building

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

FROM alpine:3.12

RUN apk update && apk add nginx && rm -rf /var/cache/apk/*

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=building /build/dist /frontend/
COPY ./entrypoint.sh .

EXPOSE 80

ENTRYPOINT [ "./entrypoint.sh" ]
CMD ["nginx", "-g", "daemon off;pid /tmp/nginx.pid;"]
