import React, { useEffect, useRef } from 'react';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";

interface AddressAutocompleteProps {
  onSelect: (address: {
    formatted_address: string;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    zipcode: string;
    latitude: string;
    longitude: string;
  }) => void;
  defaultValue?: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  onSelect,
  defaultValue = ""
}) => {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'nl' }, // Restrict to Netherlands
    },
    debounce: 300,
    defaultValue
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultValue) {
      setValue(defaultValue, false);
    }
  }, [defaultValue, setValue]);

  const handleSelect = async (description: string) => {
    setValue(description, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);
      
      // Parse address components
      const addressComponents = results[0].address_components;
      let streetNumber = '';
      let route = '';
      let city = '';
      let postalCode = '';
      
      for (const component of addressComponents) {
        const types = component.types;
        
        if (types.includes('street_number')) {
          streetNumber = component.long_name;
        }
        if (types.includes('route')) {
          route = component.long_name;
        }
        if (types.includes('locality')) {
          city = component.long_name;
        }
        if (types.includes('postal_code')) {
          postalCode = component.long_name;
        }
      }

      const address_line_1 = route + (streetNumber ? ' ' + streetNumber : '');
      
      onSelect({
        formatted_address: description,
        address_line_1,
        address_line_2: null,
        city,
        zipcode: postalCode,
        latitude: lat.toString(),
        longitude: lng.toString()
      });
    } catch (error) {
      console.error('Error: ', error);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!ready}
        placeholder="Enter an address..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
      {status === "OK" && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {data.map((suggestion) => {
            const {
              place_id,
              structured_formatting: { main_text, secondary_text },
            } = suggestion;

            return (
              <li
                key={place_id}
                onClick={() => handleSelect(suggestion.description)}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                <strong className="block text-gray-800">{main_text}</strong>
                <span className="text-gray-500 text-sm">{secondary_text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;