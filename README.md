# ShopMart

ShopMart is a full-stack ecommerce app with a Laravel backend and a Next.js frontend.

## Prerequisites

- PHP 8.1+ (with Composer)
- Node.js 18+ and npm
- MySQL or MariaDB

## Backend setup

1. Open a terminal in `backend`.
2. Install dependencies:
   - `composer install`
3. Copy env file and set values (DB, mail, app URL):
   - `copy .env.example .env`
4. Generate app key:
   - `php artisan key:generate`
5. Run migrations:
   - `php artisan migrate`

## Frontend setup

1. Open a terminal in `frontend`.
2. Install dependencies:
   - `npm install`

## Run the app

- Start the backend API:
  - `php artisan serve`
- Start the frontend:
  - `npm run dev`

The frontend is configured to call the backend at `http://localhost:8000/api`.

## Notes

- If you need to seed demo data, add your own seeders and run `php artisan db:seed`.
- Email OTP requires valid mail settings in `backend/.env`.
