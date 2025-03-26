import React, { useEffect } from 'react';

interface GooglePlacesScriptProps {
  apiKey: string;
}

const GooglePlacesScript: React.FC<GooglePlacesScriptProps> = ({ apiKey }) => {
  useEffect(() => {
    // Check if the script is already loaded
    if (!document.querySelector(`script[src*="maps.googleapis.com/maps/api"]`)) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [apiKey]);

  return null;
};

export default GooglePlacesScript;