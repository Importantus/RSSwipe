# RSSwiper

## Local Setup

Clone the repo: 
```bash
git clone https://git.mylab.th-luebeck.de/vwprg/wise23_24/b2.git
```

Create a .env file in the root directory of the project and copy the content of the .env.local file into it. 

Start the app:
```bash
cd b2
docker compose up
```

Run migrations:
```bash
 docker exec -it b2-vwprg-backend-1 npx prisma migrate deploy
```


Generate the prisma client:
```bash
 docker exec -it b2-vwprg-backend-1 npx prisma generate
```

### Get latest changes

Pull the latest changes:
```bash
git pull
```

Check if the .env.local file has changed and copy the content of the .env.local file into your .env file.

Restart the app:
```bash
docker compose down
docker compose up --build
```

Check if there are new migrations, if so run them:

Run migrations:
```bash
 docker exec -it b2-vwprg-backend-1 npx prisma migrate deploy
```

Generate the prisma client:
```bash
 docker exec -it b2-vwprg-backend-1 npx prisma generate
```

### How to make changes to the database

Make changes to the schema.prisma file

Migrate the changes:
```bash
 docker exec -it b2-vwprg-backend-1 npx prisma migrate dev --name <name of migration>
```

Generate the prisma client:
```bash
 docker exec -it b2-vwprg-backend-1 npx prisma generate
```

### Troubleshooting

If there are problems with the database, try to delete the docker volumes and restart the app:
```bash
docker compose down -v
docker compose up --build
```
