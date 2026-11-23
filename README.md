# Roadmap Frontend

## Development Environment Install

```bash
git clone https://github.com/luvittor/typescript-react-roadmap-frontend.git
cd typescript-react-roadmap-frontend
cp .env.example .env
```

Edit `.env` and set `VITE_API_BASE_URL` to the [php-laravel-roadmap-backend](https://github.com/luvittor/php-laravel-roadmap-backend) API URL. For local development, the example points to `http://localhost:8000`.

Choose one of the following methods to run the project:

### No-Container

Use Node `24.15.0` (see `.nvmrc`).

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

Set the GitHub Actions variable `VITE_API_BASE_URL` to the backend directory base path, without `/public/`. The workflow passes this value to the Vite build without defining a production URL in the repository; Laravel routes are appended under `/api/v1`.

Deployment needs these secrets to be set:

 - secrets.SFTP_HOST: Dreamhost SFTP host for deployment.
 - secrets.SFTP_USERNAME: Dreamhost SFTP username for deployment.
 - secrets.SFTP_PASSWORD: Dreamhost SFTP password for deployment.
