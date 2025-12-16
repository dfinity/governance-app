import { useEffect, useState } from 'react';

import { DottedMap } from './DottedMap';

const ALL_MARKERS = [
  // North America
  { lat: 40.7128, lng: -74.006, size: 0.3 }, // New York
  { lat: 34.0522, lng: -118.2437, size: 0.3 }, // Los Angeles
  { lat: 41.8781, lng: -87.6298, size: 0.3 }, // Chicago
  { lat: 29.7604, lng: -95.3698, size: 0.3 }, // Houston
  { lat: 39.9526, lng: -75.1652, size: 0.3 }, // Philadelphia
  { lat: 33.4484, lng: -112.074, size: 0.3 }, // Phoenix
  { lat: 29.4241, lng: -98.4936, size: 0.3 }, // San Antonio
  { lat: 32.7157, lng: -117.1611, size: 0.3 }, // San Diego
  { lat: 32.7767, lng: -96.797, size: 0.3 }, // Dallas
  { lat: 37.3382, lng: -121.8863, size: 0.3 }, // San Jose
  { lat: 43.6532, lng: -79.3832, size: 0.3 }, // Toronto
  { lat: 49.2827, lng: -123.1207, size: 0.3 }, // Vancouver
  { lat: 45.5017, lng: -73.5673, size: 0.3 }, // Montreal
  { lat: 19.4326, lng: -99.1332, size: 0.3 }, // Mexico City

  // South America
  { lat: -23.5505, lng: -46.6333, size: 0.3 }, // São Paulo
  { lat: -34.6037, lng: -58.3816, size: 0.3 }, // Buenos Aires
  { lat: -22.9068, lng: -43.1729, size: 0.3 }, // Rio de Janeiro
  { lat: 4.711, lng: -74.0721, size: 0.3 }, // Bogotá
  { lat: -12.0464, lng: -77.0428, size: 0.3 }, // Lima
  { lat: -33.4489, lng: -70.6693, size: 0.3 }, // Santiago

  // Europe
  { lat: 51.5074, lng: -0.1278, size: 0.3 }, // London
  { lat: 48.8566, lng: 2.3522, size: 0.3 }, // Paris
  { lat: 52.52, lng: 13.405, size: 0.3 }, // Berlin
  { lat: 40.4168, lng: -3.7038, size: 0.3 }, // Madrid
  { lat: 41.9028, lng: 12.4964, size: 0.3 }, // Rome
  { lat: 55.7558, lng: 37.6176, size: 0.3 }, // Moscow
  { lat: 41.0082, lng: 28.9784, size: 0.3 }, // Istanbul
  { lat: 52.2297, lng: 21.0122, size: 0.3 }, // Warsaw
  { lat: 48.2082, lng: 16.3738, size: 0.3 }, // Vienna
  { lat: 59.3293, lng: 18.0686, size: 0.3 }, // Stockholm
  { lat: 52.3676, lng: 4.9041, size: 0.3 }, // Amsterdam
  { lat: 50.8503, lng: 4.3517, size: 0.3 }, // Brussels
  { lat: 47.3769, lng: 8.5417, size: 0.3 }, // Zurich

  // Asia
  { lat: 35.6762, lng: 139.6503, size: 0.3 }, // Tokyo
  { lat: 28.6139, lng: 77.209, size: 0.3 }, // New Delhi
  { lat: 31.2304, lng: 121.4737, size: 0.3 }, // Shanghai
  { lat: 39.9042, lng: 116.4074, size: 0.3 }, // Beijing
  { lat: 19.076, lng: 72.8777, size: 0.3 }, // Mumbai
  { lat: 37.5665, lng: 126.978, size: 0.3 }, // Seoul
  { lat: -6.2088, lng: 106.8456, size: 0.3 }, // Jakarta
  { lat: 13.7563, lng: 100.5018, size: 0.3 }, // Bangkok
  { lat: 1.3521, lng: 103.8198, size: 0.3 }, // Singapore
  { lat: 25.2048, lng: 55.2708, size: 0.3 }, // Dubai
  { lat: 32.0853, lng: 34.7818, size: 0.3 }, // Tel Aviv
  { lat: 22.3193, lng: 114.1694, size: 0.3 }, // Hong Kong
  { lat: 14.5995, lng: 120.9842, size: 0.3 }, // Manila
  { lat: 3.139, lng: 101.6869, size: 0.3 }, // Kuala Lumpur
  { lat: 10.8231, lng: 106.6297, size: 0.3 }, // Ho Chi Minh City

  // Africa
  { lat: 30.0444, lng: 31.2357, size: 0.3 }, // Cairo
  { lat: 6.5244, lng: 3.3792, size: 0.3 }, // Lagos
  { lat: -26.2041, lng: 28.0473, size: 0.3 }, // Johannesburg
  { lat: -4.4419, lng: 15.2663, size: 0.3 }, // Kinshasa
  { lat: -1.2921, lng: 36.8219, size: 0.3 }, // Nairobi
  { lat: 33.5731, lng: -7.5898, size: 0.3 }, // Casablanca

  // Oceania
  { lat: -33.8688, lng: 151.2093, size: 0.3 }, // Sydney
  { lat: -37.8136, lng: 144.9631, size: 0.3 }, // Melbourne
  { lat: -27.4698, lng: 153.0251, size: 0.3 }, // Brisbane
  { lat: -31.9505, lng: 115.8605, size: 0.3 }, // Perth
  { lat: -36.8485, lng: 174.7633, size: 0.3 }, // Auckland
];

const getRandomMarkers = (count: number) => {
  const shuffled = [...ALL_MARKERS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const AnimatedDecentralizedMap = () => {
  const [activeMarkers, setActiveMarkers] = useState(getRandomMarkers(40));

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMarkers(getRandomMarkers(40));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute h-full w-full overflow-hidden">
      <div className="absolute inset-0 bg-radial from-transparent to-background to-70%" />
      <DottedMap markers={activeMarkers} />
    </div>
  );
};
