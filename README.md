# See My Voice

Linux-only setup for running the app locally.

## Requirements

- Linux
- Git
- Node.js 22+
- npm
- MongoDB local or MongoDB Atlas

## Install

```bash
sudo apt update
sudo apt install -y git curl

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

git clone https://github.com/SturkaCircutz/see-my-voice.git
cd see-my-voice
git checkout english-version

npm install
```

## Backend Config

Create the backend env file:

```bash
cp backend/.env.example backend/.env
```

Use this for local MongoDB:

```env
PORT=8080
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=see_my_voice
JWT_SECRET=replace-this-with-a-long-random-string
FRONTEND_ORIGIN=http://127.0.0.1:3000
SEED_USERNAME=jiawen
SEED_PASSWORD=123
SEED_NAME=Jiawen
PRONUNCIATION_API_URL=
```

Use this instead if you use MongoDB Atlas:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
```

Keep the other backend values the same.

## Frontend Config

Create the frontend env file:

```bash
cp frontend/.env.example frontend/.env.local
```

Frontend env:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080
```

## Run

Terminal 1:

```bash
npm run dev:backend
```

Terminal 2:

```bash
npm run dev:frontend
```

Open:

```text
http://127.0.0.1:3000
```

Backend health check:

```text
http://127.0.0.1:8080/api/health
```

## Check

```bash
npm run typecheck
```
