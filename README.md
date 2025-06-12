# Roadmap Frontend

## Development Environment Install

```bash
git clone https://github.com/luvittor/typescript-react-roadmap-frontend.git
cd typescript-react-roadmap-frontend
cp .env.example .env
```

Edit `.env` and set the variables defined inside. Only `VITE_API_URL` is required and should point to the [php-laravel-roadmap-backend](https://github.com/luvittor/php-laravel-roadmap-backend) project API.

Choose one of the following methods to run the project:

### No-Container

Use Node `20.14.0` (see `.nvmrc`).

```bash
npm ci
npm run dev
```

### Container

```bash
docker-compose up --build
```

## Production Environment Install

For a production build run:

```bash
npm run build
npm run preview # serves the production build locally
```

### Github Actions Deploy to Dreamhost

Deployment needs these variables to be set:

 - vars.VITE_API_URL: URL to [php-laravel-roadmap-backend](https://github.com/luvittor/php-laravel-roadmap-backend) project API.
 - secrets.SFTP_HOST: Dreamhost SFTP host for deployment.
 - secrets.SFTP_USERNAME: Dreamhost SFTP username for deployment.
 - secrets.SFTP_PASSWORD: Dreamhost SFTP password for deployment.