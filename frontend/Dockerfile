FROM git.mylab.th-luebeck.de:4181/vwprg/teaching/docker-archive/node:latest AS building

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm install

ARG BACKEND_URL
ENV VITE_BACKEND_URL=$BACKEND_URL

COPY . .
RUN npm run build

FROM git.mylab.th-luebeck.de:4181/vwprg/teaching/docker-archive/nginx:alpine as running
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=building /build/dist /frontend/