# Roadmap Frontend

## Development Environment Install

```bash
git clone https://github.com/luvittor/typescript-react-roadmap-frontend.git
cd typescript-react-roadmap-frontend
cp .env.example .env
```

Set the environment variables in `.env` file.

Choose one of the following methods to run the project:

### No-Container

Node version is in `.nvmrc` file.

```bash
npm ci
npm run dev
```

## Container

```bash
docker-compose up --build
```

## Production Environment Install

### Github Actions Deploy to Dreamhost

Deploys needs these variables to be s:

 - vars.VITE_API_URL: URL to backend API.
 - secrets.SFTP_HOST: Dreamhost SFTP host for deployment.
 - secrets.SFTP_USERNAME: Dreamhost SFTP username for deployment.
 - secrets.SFTP_PASSWORD: Dreamhost SFTP password for deployment.