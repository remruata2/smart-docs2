# ICPS AI - Next.js Starter with Authentication

A modern Next.js starter template with built-in authentication, role-based access control, and Prisma ORM integration.

## Features

- 🔐 NextAuth.js authentication
- 👥 Role-based access control (RBAC)
- 🗄️ Prisma ORM with PostgreSQL
- 🎨 Shadcn UI components
- 🛡️ TypeScript support
- ⚡ Server Actions for data mutations

## Prerequisites

- Node.js 18.0.0 or later
- PostgreSQL database
- npm or yarn

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cid-ai.git
   cd cid-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory and add the following variables:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/yourdb?schema=public"
   
   # NextAuth
   NEXTAUTH_SECRET="your-secret-key" # Generate with: openssl rand -base64 32
   NEXTAUTH_URL="http://localhost:3000"
   
   # OAuth providers (optional)
   GOOGLE_CLIENT_ID=""
   GOOGLE_CLIENT_SECRET=""
   ```

4. **Set up the database**
   ```bash
   # Run database migrations
   npx prisma migrate dev --name init
   
   # Generate Prisma Client
   npx prisma generate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Authentication

This project uses NextAuth.js for authentication. The following features are included:

- Email/Password authentication
- OAuth support (Google, GitHub, etc.)
- Role-based access control
- Protected API routes

### Available User Roles

- `ADMIN`: Full access to all features
- `STAFF`: Limited access

## Database Schema

The project uses Prisma ORM with the following models:

- `User`: User accounts and authentication
- `Account`: OAuth account connections
- `Session`: User sessions
- `VerificationToken`: Email verification tokens

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| NEXTAUTH_SECRET | Yes | Secret key for NextAuth.js |
| NEXTAUTH_URL | Yes | Base URL of your application |
| GOOGLE_CLIENT_ID | No | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | No | Google OAuth client secret |

## Project Structure

```
src/
├── app/                    # App router
│   ├── api/                # API routes
│   ├── auth/               # Authentication pages
│   └── dashboard/          # Protected routes
├── components/             # Reusable components
│   ├── auth/               # Auth components
│   └── ui/                 # UI components
├── lib/                    # Utility functions
│   └── auth.ts             # Auth utilities
├── prisma/                 # Prisma schema
└── types/                  # TypeScript types
```

## Deployment

### Vercel

1. Push your code to a GitHub repository
2. Import the repository on Vercel
3. Add your environment variables
4. Deploy!

### Self-hosting

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## License

[MIT](https://choosealicense.com/licenses/mit/)
