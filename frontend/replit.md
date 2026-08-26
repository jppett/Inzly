# Inzly - AI Real Estate Analysis Platform

## Overview

Inzly is an AI-powered real estate analysis application that helps homebuyers discover potential issues, neighborhood risks, and hidden costs before purchasing a property. The platform uses AI to analyze property images and data, generating detailed reports with issue identification, severity ratings, and cost estimates.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Animations**: Framer Motion for UI transitions
- **Charts**: Recharts for data visualization (price history)
- **Toasts**: Sonner for toast notifications
- **Build Tool**: Vite

The frontend follows a pages-based structure with reusable components. Key pages include:
- Home page with property search and listings
- Property details page with AI analysis, issue cards, and interactive image markers
- Saved Homes page (`/saved`) for authenticated users to view their bookmarked properties

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Design**: RESTful endpoints under `/api/` prefix
- **Authentication**: Session-based auth with bcrypt password hashing and connect-pg-simple session store
- **AI Integration**: OpenAI API via Replit AI Integrations for:
  - Property analysis and issue detection
  - Image generation capabilities
  - Chat functionality

### Data Models
Four primary database tables:
1. **Properties**: Stores property listings with address, price, images (JSONB), price history, schools data, and an "Inzly Score"
2. **Issues**: Property-related issues with severity levels (critical/warning/info/good), cost estimates, and image location coordinates for visual markers
3. **Users**: User accounts with email, name, and hashed password
4. **SavedProperties**: Join table linking users to their saved/bookmarked properties

### Auth System
- Session-based authentication using express-session + connect-pg-simple (PostgreSQL-backed sessions)
- Password hashing via bcrypt (10 rounds)
- Auth endpoints: POST `/api/auth/register`, POST `/api/auth/login`, POST `/api/auth/logout`, GET `/api/auth/me`
- Saved property endpoints: POST `/api/saved/:propertyId`, DELETE `/api/saved/:propertyId`, GET `/api/saved`, GET `/api/saved/:propertyId/check`
- Frontend auth hook (`useAuth`) manages auth state via React Query
- AuthDialog component provides login/register modal with tab switching
- Navbar shows user dropdown with "Saved Homes" and "Log Out" when authenticated

### API Specification
- OpenAPI spec stored at `openapi.yaml` — source of truth for the external backend API
- External backend provides a `features` object on each property (PropertyFeatures) with fields like type, lotSize, hoaFee, roofType, foundationDetails, constructionMaterials, heating, cooling, appliances, fireplaceFeatures, windowFeatures, flooring, fencing, basement, parking, stories
- Frontend reads `features` dynamically for the Property Features tab; only non-null fields are displayed

### Build System
- Development: Vite dev server with HMR
- Production: Custom build script using esbuild for server bundling and Vite for client
- Server runs on a single Express instance serving both API and static files

## External Dependencies

### Database
- PostgreSQL database (connection via `DATABASE_URL` environment variable)
- Drizzle Kit for schema migrations (`drizzle-kit push`)

### AI Services
- OpenAI API via Replit AI Integrations
  - Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`
  - Used for property analysis, chat completions, and image generation (gpt-image-1 model)

### Third-Party Libraries
- connect-pg-simple for PostgreSQL session storage
- bcrypt for password hashing
- Various Radix UI primitives for accessible UI components
- Zod for schema validation (integrated with Drizzle via drizzle-zod)
- Sonner for toast notifications

### Replit-Specific Integrations
- Vite plugins for development banner and cartographer
- Custom meta images plugin for OpenGraph tags
- Runtime error overlay for debugging
