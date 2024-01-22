# RSSwipe
<img src="./docs/header-image.png" alt="A header image with the name and logo of rsswipe" />

RSSwipe is a RSS reader that allows you to find your next article just like you would find your next date. Swipe left to skip, swipe right to save for later. It's that simple. 

This repo contains the code for the frontend, a progressive web app written in Vuejs, and the backend, an expressjs server with a prisma database exposing a REST api.

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

### 📑 Readinglist

You can save articles for later in your readinglist. The readinglist is synced across all your devices. To keep it clean, you can set a time after which articles are automatically removed.

### 🧾 Read In App

When you find an article you want to read, you can open it in the app. The article is displayed in a clean and readable format powered by [Mozillas Readability](https://github.com/mozilla/readability). 
You can set per feed if you want to open the article in the app or in the browser - this way you can still support your favorite content creators.

### 😢 Swipe Limit

You swipe to much? No problem, you can set a swipe limit per day. When you reach the limit, you can still read articles in your readinglist.

## Usage & Deployment

**❌ The bad news**: There is a hosted instance of RSSwipe, but it's **not for public use** (yet?) as we don't have the resources and legal knowledge to host it for more than private use.  
**✅ The good news**: It's planned to improve the deployment process so that you can easily host your own instance. If you want to help us with that, don't hesitate!

## Local Setup

Clone the repo:

```sh
git clone https://git.mylab.th-luebeck.de/vwprg/wise23_24/b2.git
```

Create an .env file in the root directory of the project and copy the content of the .env.local file into it.
Do the same for the .env file in the /backend/prisma directory.

Start the app:

```sh
cd b2
docker compose up
```

Run migrations:

```sh
npx prisma migrate deploy
```

Generate the prisma client:

```sh
npx prisma generate
```

### How to make changes to the database

Make changes to the schema.prisma file

Create a migration:

```sh
npx prisma migrate dev --name <name of migration>
```

### Troubleshooting

If there are problems with the database, try to delete the docker volumes and restart the app:

```sh
docker compose down -v
docker compose up --build
```