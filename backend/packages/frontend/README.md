# Bones Report Frontend

A modern React frontend for the Bones Report property analysis system.

## Features

- **Address Search with Autocomplete**: Search existing addresses or create new analysis requests
- **Dashboard View**: Track all address requests and their processing status
- **Property Details**: View comprehensive property analysis reports for completed requests
- **Real-time Status Updates**: Monitor request progress from pending to processed
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **React Query** for API state management
- **React Router** for navigation
- **Lucide React** for icons

## Development

### Prerequisites

Make sure you have the API service running on port 8080:

```bash
# From the project root
cd packages/api
npm run dev
```

### Start Development Server

```bash
# From the project root
cd packages/frontend
npm run dev
```

The frontend will be available at `http://localhost:3000` with API proxying to `localhost:8080`.

### Build for Production

```bash
npm run build
```

## API Integration

The frontend integrates with the following API endpoints:

- `GET /address-requests` - List all address requests
- `POST /address-requests` - Create new address request
- `GET /address-requests/:id` - Get specific address request
- `GET /bones-report-results` - List all property reports
- `GET /bones-report-results?address_request_id=:id` - Get report for specific address

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AddressSearch.tsx    # Address search with autocomplete
│   ├── AddressRequestTable.tsx  # Dashboard table
│   └── ui.tsx               # Common UI components
├── pages/               # Route components
│   ├── HomePage.tsx         # Main dashboard page
│   └── PropertyDetailPage.tsx  # Property report view
├── hooks/               # Custom React hooks
│   └── useApi.ts            # API integration hooks
├── lib/                 # Utilities
│   └── api.ts               # API client functions
├── types/               # TypeScript type definitions
│   └── api.ts               # API response types
├── App.tsx              # Main app component
├── main.tsx             # React entry point
└── index.css            # Global styles
```

## Usage

### Creating a New Address Request

1. Navigate to the homepage
2. Type an address in the search bar
3. If the address exists, select it from the dropdown
4. If it doesn't exist, click "Create new request for [address]"
5. The new request will appear in the dashboard table

### Viewing Property Reports

1. Wait for an address request to reach "processed" status
2. Click the "View Report" button in the dashboard table
3. Or click directly on a processed row
4. View comprehensive property analysis including:
   - Estimated property value
   - Rental estimates
   - Investment potential score
   - Property details and market metrics

### Status Meanings

- **Pending**: Request created, waiting to be processed
- **Processing**: Analysis in progress (RentCast data being fetched)
- **Processed**: Complete analysis available
- **Failed**: Error occurred during processing

## Responsive Design

The interface adapts to different screen sizes:
- **Desktop**: Full table layout with all columns
- **Tablet**: Condensed table with essential information
- **Mobile**: Card-based layout for easy touch interaction