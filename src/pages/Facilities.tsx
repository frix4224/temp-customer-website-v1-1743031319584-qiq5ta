import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Mail, Phone, MapPin, Building2, Clock, Users } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import AddressAutocomplete from '../components/AddressAutocomplete';
import ServiceRadiusMap from '../components/ServiceRadiusMap';
import GooglePlacesScript from '../components/GooglePlacesScript';

interface Driver {
  id: string;
  name: string;
  email: string | null;
  contact_number: string | null;
  vehicle_type: string;
  vehicle_number: string;
  status: boolean;
}

interface Facility {
  id: string;
  facility_code: number;
  user_identifier: number;
  facility_name: string;
  logo: string | null;
  house_number: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  zipcode: string | null;
  location: string;
  latitude: string;
  longitude: string;
  opening_hour: string | null;
  close_hour: string | null;
  services_offered: string | null;
  contact_number: string | null;
  email: string | null;
  password: string | null;
  owner_name: string | null;
  notes: string | null;
  radius: number | null;
  status: boolean;
  created_at: string;
  drivers?: Driver[];
}

const Facilities = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [formData, setFormData] = useState({
    facility_name: '',
    owner_name: '',
    email: '',
    password: '',
    contact_number: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    zipcode: '',
    location: '',
    latitude: '',
    longitude: '',
    opening_hour: '',
    close_hour: '',
    services_offered: '',
    radius: '10',
    status: true
  });

  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetchFacilities();

    const subscription = supabase
      .channel('facilities_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'facilities'
        },
        () => {
          fetchFacilities();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchFacilities = async () => {
    try {
      // First get all facilities
      const { data: facilitiesData, error: facilitiesError } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: false });

      if (facilitiesError) throw facilitiesError;

      // Then get drivers for each facility
      const facilitiesWithDrivers = await Promise.all(
        (facilitiesData || []).map(async (facility) => {
          const { data: driversData, error: driversError } = await supabase
            .from('facility_drivers')
            .select(`
              drivers (
                id,
                name,
                email,
                contact_number,
                vehicle_type,
                vehicle_number,
                status
              )
            `)
            .eq('facility_id', facility.id);

          if (driversError) throw driversError;

          return {
            ...facility,
            drivers: driversData?.map(d => d.drivers) || []
          };
        })
      );

      setFacilities(facilitiesWithDrivers);
    } catch (error) {
      console.error('Error fetching facilities:', error);
      toast.error('Failed to load facilities');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Format time values - convert empty strings to null
      const facilityData = {
        ...formData,
        facility_code: Math.floor(100000 + Math.random() * 900000),
        user_identifier: Math.floor(100000 + Math.random() * 900000),
        radius: parseInt(formData.radius),
        opening_hour: formData.opening_hour || null,
        close_hour: formData.close_hour || null
      };

      if (editingFacility) {
        const { error } = await supabase
          .from('facilities')
          .update(facilityData)
          .eq('id', editingFacility.id);

        if (error) throw error;
        toast.success('Facility updated successfully');
      } else {
        const { error } = await supabase
          .from('facilities')
          .insert([facilityData]);

        if (error) throw error;
        toast.success('Facility created successfully');
      }

      setIsModalOpen(false);
      setEditingFacility(null);
      resetForm();
    } catch (error) {
      console.error('Error saving facility:', error);
      toast.error('Failed to save facility');
    }
  };

  const handleDelete = async (facility: Facility) => {
    if (!confirm('Are you sure you want to delete this facility?')) return;

    try {
      // Delete facility assignments first
      const { error: assignmentError } = await supabase
        .from('facility_drivers')
        .delete()
        .eq('facility_id', facility.id);

      if (assignmentError) throw assignmentError;

      // Then delete the facility
      const { error } = await supabase
        .from('facilities')
        .delete()
        .eq('id', facility.id);

      if (error) throw error;
      toast.success('Facility deleted successfully');
    } catch (error) {
      console.error('Error deleting facility:', error);
      toast.error('Failed to delete facility');
    }
  };

  const resetForm = () => {
    setFormData({
      facility_name: '',
      owner_name: '',
      email: '',
      password: '',
      contact_number: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      zipcode: '',
      location: '',
      latitude: '',
      longitude: '',
      opening_hour: '',
      close_hour: '',
      services_offered: '',
      radius: '10',
      status: true
    });
  };

  const handleEdit = (facility: Facility) => {
    setEditingFacility(facility);
    setFormData({
      facility_name: facility.facility_name,
      owner_name: facility.owner_name || '',
      email: facility.email || '',
      password: facility.password || '',
      contact_number: facility.contact_number || '',
      address_line_1: facility.address_line_1 || '',
      address_line_2: facility.address_line_2 || '',
      city: facility.city || '',
      zipcode: facility.zipcode || '',
      location: facility.location,
      latitude: facility.latitude,
      longitude: facility.longitude,
      opening_hour: facility.opening_hour || '',
      close_hour: facility.close_hour || '',
      services_offered: facility.services_offered || '',
      radius: facility.radius?.toString() || '10',
      status: facility.status
    });
    setIsModalOpen(true);
  };

  const handleAddressSelect = (addressData: {
    formatted_address: string;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    zipcode: string;
    latitude: string;
    longitude: string;
  }) => {
    // Validate coordinates before setting them
    const lat = parseFloat(addressData.latitude);
    const lng = parseFloat(addressData.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Invalid coordinates received from address selection');
      return;
    }

    setFormData({
      ...formData,
      address_line_1: addressData.address_line_1,
      address_line_2: addressData.address_line_2 || '',
      city: addressData.city,
      zipcode: addressData.zipcode,
      location: addressData.formatted_address,
      latitude: addressData.latitude,
      longitude: addressData.longitude
    });

    setMapCenter({ lat, lng });
    setShowMap(true);
  };

  return (
    <div className="p-6">
      <GooglePlacesScript apiKey="AIzaSyACA7XEfHbsp5gXZ_Eup5eDNxuYojhQl6A" />
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Facilities</h1>
        <button
          onClick={() => {
            setEditingFacility(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Facility
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-600">Loading facilities...</p>
        </div>
      ) : facilities.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-600">No facilities found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((facility) => (
            <div
              key={facility.id}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {facility.facility_name}
                    </h3>
                    {!facility.status && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  {facility.owner_name && (
                    <p className="text-sm text-gray-600 mt-1">
                      Owner: {facility.owner_name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(facility)}
                    className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(facility)}
                    className="p-2 text-gray-600 hover:text-red-500 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm">Code: {facility.facility_code}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{facility.email}</span>
                </div>
                {facility.contact_number && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{facility.contact_number}</span>
                  </div>
                )}
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 mt-1" />
                  <div className="text-sm">
                    {[
                      facility.address_line_1,
                      facility.address_line_2,
                      facility.city,
                      facility.zipcode
                    ].filter(Boolean).join(', ')}
                  </div>
                </div>
                {(facility.opening_hour || facility.close_hour) && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      {facility.opening_hour} - {facility.close_hour}
                    </span>
                  </div>
                )}

                {/* Assigned Drivers Section */}
                {facility.drivers && facility.drivers.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-gray-700 mb-2">
                      <Users className="w-4 h-4" />
                      <h4 className="text-sm font-medium">Assigned Drivers</h4>
                    </div>
                    <div className="space-y-2">
                      {facility.drivers.map(driver => (
                        <div 
                          key={driver.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                        >
                          <div>
                            <p className="font-medium text-gray-800">{driver.name}</p>
                            <p className="text-gray-600 text-xs">
                              {driver.vehicle_type} - {driver.vehicle_number}
                            </p>
                          </div>
                          {!driver.status && (
                            <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingFacility(null);
          resetForm();
          setShowMap(false);
        }}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-xl shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <Dialog.Title className="text-lg font-semibold text-gray-800">
                {editingFacility ? 'Edit Facility' : 'Add New Facility'}
              </Dialog.Title>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingFacility(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Facility Name *
                  </label>
                  <input
                    type="text"
                    value={formData.facility_name}
                    onChange={(e) => setFormData({ ...formData, facility_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required={!editingFacility}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <AddressAutocomplete
                  onSelect={handleAddressSelect}
                  defaultValue={formData.location}
                />
              </div>

              {showMap && mapCenter && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Area
                  </label>
                  <ServiceRadiusMap
                    center={mapCenter}
                    radius={parseInt(formData.radius)}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Service radius: {formData.radius} km
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Radius (km)
                </label>
                <input
                  type="number"
                  value={formData.radius}
                  onChange={(e) => {
                    setFormData({ ...formData, radius: e.target.value });
                  }}
                  min="1"
                  max="50"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opening Hour
                  </label>
                  <input
                    type="time"
                    value={formData.opening_hour}
                    onChange={(e) => setFormData({ ...formData, opening_hour: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Closing Hour
                  </label>
                  <input
                    type="time"
                    value={formData.close_hour}
                    onChange={(e) => setFormData({ ...formData, close_hour: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Services Offered
                </label>
                <textarea
                  value={formData.services_offered}
                  onChange={(e) => setFormData({ ...formData, services_offered: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="List the services offered by this facility..."
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingFacility(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                >
                  {editingFacility ? 'Save Changes' : 'Add Facility'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default Facilities;