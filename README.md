# RSSwipe
<img src="./docs/header-image.png" alt="A header image with the name and logo of rsswipe" />

RSSwipe is a RSS reader that allows you to find your next article just like you would find your next date. Swipe left to skip, swipe right to save for later. It's that simple. 

This repo contains the code for the frontend, a progressive web app written in Vuejs, and the backend, a Rust server (axum, sqlx, MariaDB) exposing a REST api. Its OpenAPI documentation is served at `/v1/api-docs`.

RSSwipe was originally developed as a project for a web engineering course at the University of Applied Sciences Lübeck. We took a lot of inspiration from [Fox RSS](https://github.com/16arpi/Fox-RSS) - a similar app for swiping articles but it runs natively on Android and has no backend.

<img src="./docs/mockup.png" alt="A mockup of the app" />

## Features

### 👆 Swipe

You can swipe through articles like you would on a dating app. Swipe left to skip, swipe right to save for later.

### 🛜 Sync Across Devices

Your account is synced across all your devices. You can use RSSwipe on your phone, tablet and computer.

### 📱 Progessive Web App

RSSwipe is a progressive web app. You can install it on your phone or computer and use it like a native app. Articles in your readinglist are available offline.

### 📰 RSS, Atom and RDF Feeds

You can add RSS, Atom and RDF feeds to your account. They are automatically updated on the server every few minutes.

### 🗂️ Categories

Group your feeds into your own categories (a feed can be in several). On the home screen a tap on a category swipes through all of its feeds, and the sources dialog lets you pick single feeds as well. On the feeds page you can sort feeds by long pressing for multi-select or by swiping a row to the right. Your selection is remembered.

### 📑 Readinglist

You can save articles for later in your readinglist. The readinglist is synced across all your devices. To keep it clean, you can set a time after which articles are automatically removed.

### 🧾 Read In App

When you find an article you want to read, you can open it in the app. The article is displayed in a clean and readable format powered by [Mozillas Readability](https://github.com/mozilla/readability). 
You can set per feed if you want to open the article in the app or in the browser - this way you can still support your favorite content creators.

### 😢 Swipe Limit

You swipe too much? No problem, you can set a swipe limit per day. When you reach the limit, you can still read articles in your readinglist.

## Usage & Deployment

The recommended way to deploy RSSwipe is to use the provided docker-compose file. 

To deploy the app, you need to have docker and docker-compose installed on your machine.

Get the `docker-compose.yml` file in the docker directory of this repository:

```sh
wget https://raw.githubusercontent.com/Importantus/RSSwipe/main/docker/docker-compose.yml
```

Create an `.env` file in the same directory as the docker-compose file and copy the content of the `.env.prod` file into it.

```sh
wget -O .env https://raw.githubusercontent.com/Importantus/RSSwipe/main/.env.prod
```

Edit the `.env` file and set the values for the environment variables.

Start the app (this may take a short while):

```sh
docker compose up
```

The app is now running on port 80 or the custom `FRONTEND_FORWARD_PORT` you set in the `.env` file. 

To run the app in the background, add the `-d` flag:

```sh
docker compose up -d
```

To update the app, pull the latest changes from the repository and restart the app:

```sh
docker compose pull && docker compose up -d
```

## Local Setup

Clone the repo:

```sh
git clone https://github.com/Importantus/RSSwipe.git
```

Create an .env file in the root directory of the project and copy the content of the .env.local file into it.

Start the app (the backend container applies the database migrations and rebuilds on restart):

```sh
cd RSSwipe/
docker compose up
```

Without Docker you need a Rust toolchain and a running MariaDB:

```sh
cd backend/
export DATABASE_URL=mysql://user:password@localhost:3306/rsswipe JWT_SECRET=change-me
cargo run -p rsswipe -- migrate   # apply migrations
cargo run -p rsswipe              # API + background jobs
cargo test && cargo clippy --all-targets -- -D warnings
```

The services of the backend are selected with `SERVICE_TYPE` (`all`, `api`, `feedParser`, `garbageCollector`); see
[docs/rust-migration/README.md](docs/rust-migration/README.md) for build, start, migrations and the contract tests.

### How to make changes to the database

Add a SQL file to `backend/migrations/` (e.g. `0004_my_change.sql`). Migrations must be additive and safe to run on a live database.
They are applied by `rsswipe migrate` (in Kubernetes: the migration job of the deployment).

### Troubleshooting

If there are problems with the database, try to delete the docker volumes and restart the app:

```sh
docker compose down -v
docker compose up --build
```