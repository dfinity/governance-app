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
  { lat: 42.3601, lng: -71.0589, size: 0.3 }, // Boston
  { lat: 47.6062, lng: -122.3321, size: 0.3 }, // Seattle
  { lat: 37.7749, lng: -122.4194, size: 0.3 }, // San Francisco
  { lat: 25.7617, lng: -80.1918, size: 0.3 }, // Miami
  { lat: 39.7392, lng: -104.9903, size: 0.3 }, // Denver
  { lat: 33.749, lng: -84.388, size: 0.3 }, // Atlanta
  { lat: 30.2672, lng: -97.7431, size: 0.3 }, // Austin
  { lat: 36.1699, lng: -115.1398, size: 0.3 }, // Las Vegas
  { lat: 45.4215, lng: -75.6972, size: 0.3 }, // Ottawa
  { lat: 51.0447, lng: -114.0719, size: 0.3 }, // Calgary

  // South America
  { lat: -23.5505, lng: -46.6333, size: 0.3 }, // São Paulo
  { lat: -34.6037, lng: -58.3816, size: 0.3 }, // Buenos Aires
  { lat: -22.9068, lng: -43.1729, size: 0.3 }, // Rio de Janeiro
  { lat: 4.711, lng: -74.0721, size: 0.3 }, // Bogotá
  { lat: -12.0464, lng: -77.0428, size: 0.3 }, // Lima
  { lat: -33.4489, lng: -70.6693, size: 0.3 }, // Santiago
  { lat: -15.8267, lng: -47.9218, size: 0.3 }, // Brasilia
  { lat: 10.4806, lng: -66.9036, size: 0.3 }, // Caracas
  { lat: -0.1807, lng: -78.4678, size: 0.3 }, // Quito
  { lat: -34.9011, lng: -56.1645, size: 0.3 }, // Montevideo
  { lat: 6.2442, lng: -75.5812, size: 0.3 }, // Medellin
  { lat: -31.4201, lng: -64.1888, size: 0.3 }, // Cordoba
  { lat: -25.2637, lng: -57.5759, size: 0.3 }, // Asuncion
  { lat: -16.5, lng: -68.15, size: 0.3 }, // La Paz

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
  { lat: 53.3498, lng: -6.2603, size: 0.3 }, // Dublin
  { lat: 55.9533, lng: -3.1883, size: 0.3 }, // Edinburgh
  { lat: 38.7223, lng: -9.1393, size: 0.3 }, // Lisbon
  { lat: 37.9838, lng: 23.7275, size: 0.3 }, // Athens
  { lat: 50.0755, lng: 14.4378, size: 0.3 }, // Prague
  { lat: 47.4979, lng: 19.0402, size: 0.3 }, // Budapest
  { lat: 55.6761, lng: 12.5683, size: 0.3 }, // Copenhagen
  { lat: 59.9139, lng: 10.7522, size: 0.3 }, // Oslo
  { lat: 60.1695, lng: 24.9354, size: 0.3 }, // Helsinki
  { lat: 48.1351, lng: 11.582, size: 0.3 }, // Munich
  { lat: 41.3851, lng: 2.1734, size: 0.3 }, // Barcelona
  { lat: 45.4642, lng: 9.19, size: 0.3 }, // Milan
  { lat: 64.1466, lng: -21.9426, size: 0.3 }, // Reykjavik

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
  { lat: 34.6937, lng: 135.5023, size: 0.3 }, // Osaka
  { lat: 35.0116, lng: 135.7681, size: 0.3 }, // Kyoto
  { lat: 25.033, lng: 121.5654, size: 0.3 }, // Taipei
  { lat: 21.0285, lng: 105.8542, size: 0.3 }, // Hanoi
  { lat: 12.9716, lng: 77.5946, size: 0.3 }, // Bangalore
  { lat: 13.0827, lng: 80.2707, size: 0.3 }, // Chennai
  { lat: 24.7136, lng: 46.6753, size: 0.3 }, // Riyadh
  { lat: 25.2854, lng: 51.531, size: 0.3 }, // Doha
  { lat: 24.4539, lng: 54.3773, size: 0.3 }, // Abu Dhabi
  { lat: 35.6892, lng: 51.389, size: 0.3 }, // Tehran
  { lat: 41.2995, lng: 69.2401, size: 0.3 }, // Tashkent
  { lat: 24.8607, lng: 67.0011, size: 0.3 }, // Karachi
  { lat: 23.8103, lng: 90.4125, size: 0.3 }, // Dhaka
  { lat: 6.9271, lng: 79.8612, size: 0.3 }, // Colombo

  // Africa
  { lat: 30.0444, lng: 31.2357, size: 0.3 }, // Cairo
  { lat: 6.5244, lng: 3.3792, size: 0.3 }, // Lagos
  { lat: -26.2041, lng: 28.0473, size: 0.3 }, // Johannesburg
  { lat: -4.4419, lng: 15.2663, size: 0.3 }, // Kinshasa
  { lat: -1.2921, lng: 36.8219, size: 0.3 }, // Nairobi
  { lat: 33.5731, lng: -7.5898, size: 0.3 }, // Casablanca
  { lat: 9.0331, lng: 38.7444, size: 0.3 }, // Addis Ababa
  { lat: -33.9249, lng: 18.4241, size: 0.3 }, // Cape Town
  { lat: 14.7167, lng: -17.4677, size: 0.3 }, // Dakar
  { lat: 5.6037, lng: -0.187, size: 0.3 }, // Accra
  { lat: 36.7528, lng: 3.042, size: 0.3 }, // Algiers
  { lat: 36.8065, lng: 10.1815, size: 0.3 }, // Tunis
  { lat: -6.7924, lng: 39.2083, size: 0.3 }, // Dar es Salaam
  { lat: -8.839, lng: 13.2894, size: 0.3 }, // Luanda
  { lat: 5.36, lng: -4.0083, size: 0.3 }, // Abidjan
  { lat: 0.3476, lng: 32.5825, size: 0.3 }, // Kampala

  // Oceania
  { lat: -33.8688, lng: 151.2093, size: 0.3 }, // Sydney
  { lat: -37.8136, lng: 144.9631, size: 0.3 }, // Melbourne
  { lat: -27.4698, lng: 153.0251, size: 0.3 }, // Brisbane
  { lat: -31.9505, lng: 115.8605, size: 0.3 }, // Perth
  { lat: -36.8485, lng: 174.7633, size: 0.3 }, // Auckland
  { lat: -41.2865, lng: 174.7762, size: 0.3 }, // Wellington
  { lat: -43.532, lng: 172.6362, size: 0.3 }, // Christchurch
  { lat: -34.9285, lng: 138.6007, size: 0.3 }, // Adelaide
  { lat: -35.2809, lng: 149.13, size: 0.3 }, // Canberra
  { lat: -42.8821, lng: 147.3272, size: 0.3 }, // Hobart
  { lat: -9.4438, lng: 147.1803, size: 0.3 }, // Port Moresby
];

const getRandomMarkers = (count: number) => {
  const shuffled = [...ALL_MARKERS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const AnimatedDecentralizedMap = () => {
  const [activeMarkers, setActiveMarkers] = useState(getRandomMarkers(60));

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMarkers(getRandomMarkers(60));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute h-full w-full animate-in overflow-hidden duration-1000 fade-in">
      <DottedMap markers={activeMarkers} />
    </div>
  );
};
