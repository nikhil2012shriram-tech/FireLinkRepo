# FireLink - Wildfire Readiness MVP

A wildfire preparedness app that helps homeowners assess their risk and take action.

## Features

- **Dual-Risk Assessment**
  - **Exposure Risk**: Location-based wildfire hazard (from USFS Wildfire Hazard Potential data)
  - **Vulnerability Risk**: Property-based structural risk factors
  
- **Real Geospatial Data**
  - USFS Wildfire Hazard Potential (WHP) 2023 dataset
  - OpenStreetMap Nominatim geocoding
  - Automatic caching for performance

- **Actionable Insights**
  - Prioritized mitigation tasks
  - Weekly action plans
  - Risk factor breakdown

## Setup

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the backend API server:
```bash
npm start
```

3. Open the app in your browser:
```
http://localhost:3000/index.html
```

## Architecture

### Backend (`server.js`)
- Express.js API server
- Geocoding service (ZIP → lat/lon via Nominatim)
- USFS WHP data fetching via ArcGIS REST API
- 24-hour response caching

### Frontend
- `index.html` - Property assessment form
- `dashboard.html` - Risk score visualization
- `plan.html` - Mitigation action plan
- `week.html` - Weekly task tracker
- `app.js` - Shared application logic

## API Endpoints

### GET `/api/risk/exposure?zip={zipcode}`
Returns base location wildfire risk score (0-100) for a given ZIP code.

**Response:**
```json
{
  "baseRisk": 75,
  "source": "USFS_WHP_2023",
  "coordinates": { "lat": 34.0522, "lon": -118.2437 },
  "cached": false
}
```

### GET `/api/health`
Health check endpoint.

## Data Sources

- **USFS Wildfire Hazard Potential (2023)**: https://apps.fs.usda.gov/fsgisx01/rest/services/RDW_Wildfire/RMRS_WildfireHazardPotential_Continuous_2023/ImageServer
- **OpenStreetMap Nominatim**: https://nominatim.openstreetmap.org/

## Development

Run with auto-reload:
```bash
npm run dev
```

## License

MIT
