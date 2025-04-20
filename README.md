# Bobatcal - The Boba Drink Rating App

This is a web application for discovering, rating, and reviewing specific boba drinks at various boba shop locations.

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

## Database Setup

This project uses PostgreSQL with Prisma.

1.  **Ensure PostgreSQL is running.** You might be using Docker (see `docker-compose.yml`) or a local installation.
2.  **Set up your database connection string** in a `.env` file (see Environment Variables below).
3.  **Run database migrations** to create the necessary tables:

    ```bash
    npx prisma migrate dev
    ```

4.  **(Optional) Seed the database** with initial shop data (requires `GOOGLE_PLACES_API_KEY` in `.env`):
    ```bash
    node --import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("ts-node/esm", pathToFileURL("./"));' prisma/seed.mts
    ```

## Environment Variables

Create a `.env` file in the root of the project and add the following variables:

```env
# Database Connection (update with your details)
DATABASE_URL="postgresql://bobatcal_user:bobatcal_password@localhost:5433/bobatcal_db?schema=public"

# Google OAuth Credentials (obtain from Google Cloud Console)
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
# GOOGLE_PLACES_API_KEY=YOUR_GOOGLE_PLACES_API_KEY # Optional: Only needed for seeding

# NextAuth.js Configuration
NEXTAUTH_SECRET=YOUR_GENERATED_SECRET # Generate using: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000 # Or your deployment URL
```

## Running the Development Server

Once dependencies are installed and the environment is configured, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

-   Next.js (React Framework)
-   TypeScript
-   Tailwind CSS
-   NextAuth.js (Authentication)
-   Google OAuth 2.0 (via NextAuth.js)
-   PostgreSQL (Database)
-   Prisma (ORM)

## Features

-   [x] User Authentication (Google OAuth)
-   [ ] Boba Shop Listings (Searchable - Basic listing exists)
-   [x] Shop Detail Pages (Displays drinks)
-   [x] Adding drinks to shop menus
-   [x] Drink-Specific Rating System (Submit & View Ratings/Reviews)
-   [ ] User Profiles (Planned)
-   [ ] Improved Shop Search/Filtering (Planned)
