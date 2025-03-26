import React, { useCallback, useEffect, useState } from 'react';
import { GoogleMap, Circle, Marker, useJsApiLoader } from '@react-google-maps/api';

interface ServiceRadiusMapProps {
  center: {
    lat: number;
    lng: number;
  };
  radius: number; // in kilometers
}

const ServiceRadiusMap: React.FC<ServiceRadiusMapProps> = ({ center, radius }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: 'AIzaSyACA7XEfHbsp5gXZ_Eup5eDNxuYojhQl6A'
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  useEffect(() => {
    if (map && center && !isNaN(center.lat) && !isNaN(center.lng)) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(center);
      bounds.extend(new google.maps.LatLng(
        center.lat + (radius / 111), // Rough conversion of km to degrees
        center.lng + (radius / 111)
      ));
      map.fitBounds(bounds);
    }
  }, [map, center, radius]);

  if (!isLoaded) return <div>Loading map...</div>;
  
  if (!center || isNaN(center.lat) || isNaN(center.lng)) {
    return <div>Invalid coordinates</div>;
  }

  return (
    <GoogleMap
      mapContainerClassName="w-full h-[300px] rounded-lg"
      center={center}
      zoom={12}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      }}
    >
      <Marker position={center} />
      <Circle
        center={center}
        radius={radius * 1000} // Convert km to meters
        options={{
          fillColor: '#007AFF',
          fillOpacity: 0.1,
          strokeColor: '#007AFF',
          strokeOpacity: 0.8,
          strokeWeight: 2,
        }}
      />
    </GoogleMap>
  );
};

export default ServiceRadiusMap;