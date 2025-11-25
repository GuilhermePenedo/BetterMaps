import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
});

export const fetchNearestRoad = (lng, lat, profile = 'driving') =>
  api.get(`/osrm/nearest/`, { params: { lng, lat, profile } });

export const fetchRoute = (originLng, originLat, destLng, destLat, profile = 'driving') =>
  api.get(`/osrm/route/`, { 
    params: { 
      origin_lng: originLng, 
      origin_lat: originLat, 
      dest_lng: destLng, 
      dest_lat: destLat, 
      profile 
    } 
  });