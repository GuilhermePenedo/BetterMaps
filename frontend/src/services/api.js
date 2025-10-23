import axios from 'axios';

const API_URL = 'http://localhost:8000/routes';

const api = axios.create({
  baseURL: API_URL,
});

export const fetchNearestRoad = (lng, lat, profile = 'driving') =>
  api.get(`/osrm/nearest/`, { params: { lng, lat, profile } });