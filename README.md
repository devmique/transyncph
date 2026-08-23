# TranSync PH - Bus Operator Management System

A modern SaaS platform for Philippine bus operators to streamline route management, scheduling, and passenger notifications.

## Features

### For Bus Operators (Dashboard)

- **Route Management**: Create and manage bus routes with detailed stops and estimated times
- **Schedule Management**: Assign drivers and vehicles to routes with flexible scheduling
- **Terminal Management**: Register and organize terminal locations with GPS coordinates
- **Announcements**: Broadcast service updates and delays to commuters
- **Analytics Dashboard**: Monitor operational metrics and performance
- **Settings**: Edit information, change password for security and account deletion

### For Commuters (Public Map)

- **Route Finder**: Search and discover bus routes and trip schedules and information by route number, start point, or destination
- **Terminal Locator**: Find nearby terminals and get location information
- **Service Visibility**: View available routes and key operational details
- **Real-time Bus Locator**: Track the location of the active bus managed by the specific driver

## Technology Stack

- **Frontend**: Next.js 16, React, Tailwind CSS, shadcn/ui, Leafletjs
- **Backend**: Next.js API Routes
- **Database**: MongoDB
- **Authentication**: JWT stored in HttpOnly cookies with bcrypt password hashing
- **Styling**: Tailwind CSS v4 with semantic design tokens
- **Real-time**: Socket.io


## Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- MongoDB instance (MongoDB Atlas recommended)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd v0-project
```

1. Install dependencies:

```bash
pnpm install
```

1. Set up environment variables:

Create a `.env.local` file with the following variables:

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
RESEND_API_KEY=
NEXT_PUBLIC_SOCKET_URL=your_separate_socket_url
```

1. Run the development server:

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## User Flows

### Operator Registration & Dashboard Access

1. Visit `/register` to create account
2. After login, access `/dashboard` for overview
3. Navigate to Routes, Schedules, Terminals, or Announcements from sidebar
4. Manage operations through intuitive forms and lists

### Commuter Route Discovery

1. Visit `/map` page for public route finder
2. Search by route number, starting point, or destination
3. View available terminals, live bus location managed by drivers and route details
4. Register button to encourage operator sign-ups

### Driver Live Bus Location Management
1. Visit the link sent by the operator. Example link format:`transyncph.vercel.app/driver?scheduleId=example123` for start/end live trip management.


## Database Schema

### Collections

- **operators**: Company information and authentication
- **routes**: Route definitions with stops and times
- **schedules**: Driver assignments and route schedules
- **terminals**: Pickup/dropoff locations with GPS data
- **announcements**: Service updates and alerts

## Security Features

- JWT-based authentication with HttpOnly
- Password hashing with bcryptjs
- Protected API routes with token verification
- MongoDB ObjectID validation
- Input validation with Zod

## Separate server repo for socket
 [transyncph-socket](https://github.com/devmique/transyncph-socket)

## Future Enhancements

- Real road routes (curves, highways, turns)
- SMS notifications for commuters
- Payment integration for ticketing
- Mobile app for drivers and commuters
- Multi-language support (Filipino, English)

## End-to-end tests

Playwright drives the real app against the real database, so the suite needs a
test operator account. Its credentials are never committed — add them to
`.env.local` (already gitignored):

```
E2E_EMAIL=e2e-<something-unique>@transync.test
E2E_PASSWORD=<a long random password>
```

The first run registers that operator; later runs reuse it. Each spec creates
its own terminals, routes and schedules and deletes them afterwards.

```bash
npm test          # headless, starts the dev server itself
npm run test:ui   # Playwright UI mode
```

## Support

For issues or questions, please open a GitHub issue 

## License

© 2026 TranSync PH. All rights reserved.