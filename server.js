const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { getZipRisk } = require('./zipRiskData');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const cache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000;

async function geocodeZIP(zipCode) {
  const cacheKey = `geo_${zipCode}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  }

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        postalcode: zipCode,
        country: 'US',
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'FireLink-MVP/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      const result = {
        lat: parseFloat(response.data[0].lat),
        lon: parseFloat(response.data[0].lon)
      };
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
}

function getWildfireHazardPotential(zipCode) {
  const cacheKey = `whp_${zipCode}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  }

  const riskScore = getZipRisk(zipCode);
  cache.set(cacheKey, { data: riskScore, timestamp: Date.now() });
  return riskScore;
}

app.get('/api/risk/exposure', async (req, res) => {
  const { zip } = req.query;

  if (!zip) {
    return res.status(400).json({ error: 'ZIP code required' });
  }

  try {
    const coords = await geocodeZIP(zip);
    const riskScore = getWildfireHazardPotential(zip);

    res.json({
      baseRisk: riskScore,
      source: 'Wildfire_Hazard_Database',
      coordinates: coords || null,
      cached: cache.has(`whp_${zip}`),
      zipCode: zip
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      baseRisk: 50,
      source: 'fallback'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', cache_size: cache.size });
});

app.listen(PORT, () => {
  console.log(`FireLink API server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
