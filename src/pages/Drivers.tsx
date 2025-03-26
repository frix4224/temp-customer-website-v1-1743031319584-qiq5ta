import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Mail, Phone, MapPin, Truck, Key, Building2 } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import AddressAutocomplete from '../components/AddressAutocomplete';
import GooglePlacesScript from '../components/GooglePlacesScript';

interface Driver {
  id: string;
  driver_code: number;
  name: string;
  email: string | null;
  contact_number: string | null;
  address: string | null;
  license_number: string;
  vehicle_type: string;
  vehicle_number: string;
  status: boolean;
  notes: string | null;
  profile_image: string | null;
  created_at: string;
  facilities?: Facility[];
}

interface Facility {
  id: string;
  facility_name: string;
  facility_code: number;
}

const Drivers = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact_number: '',
    address: '',
    license_number: '',
    vehicle_type: 'car',
    vehicle_number: '',
    notes: '',
    status: true
  });

  useEffect(() => {
    fetchDrivers();
    fetchFacilities();

    const subscription = supabase
      .channel('drivers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers'
        },
        () => {
          fetchDrivers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchFacilities = async () => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, facility_name, facility_code')
        .order('facility_name');

      if (error) throw error;
      setFacilities(data || []);
    } catch (error) {
      console.error('Error fetching facilities:', error);
      toast.error('Failed to load facilities');
    }
  };

  const fetchDrivers = async () => {
    try {
      // First get all drivers
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });

      if (driversError) throw driversError;

      // Then get facility assignments for each driver
      const driversWithFacilities = await Promise.all(
        (driversData || []).map(async (driver) => {
          const { data: facilityData, error: facilityError } = await supabase
            .from('facility_drivers')
            .select(`
              facilities (
                id,
                facility_name,
                facility_code
              )
            `)
            .eq('driver_id', driver.id);

          if (facilityError) throw facilityError;

          return {
            ...driver,
            facilities: facilityData?.map(fd => fd.facilities) || []
          };
        })
      );

      setDrivers(driversWithFacilities);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('Failed to load drivers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!editingDriver) {
        // First check if a driver with this email already exists
        const { data: existingDriver } = await supabase
          .from('drivers')
          .select('id')
          .eq('email', formData.email)
          .maybeSingle();

        if (existingDriver) {
          throw new Error('A driver with this email already exists');
        }

        // Create driver record
        const { data: newDriver, error: driverError } = await supabase
          .from('drivers')
          .insert([{
            driver_code: Math.floor(100000 + Math.random() * 900000),
            name: formData.name,
            email: formData.email,
            contact_number: formData.contact_number,
            address: formData.address,
            license_number: formData.license_number,
            vehicle_type: formData.vehicle_type,
            vehicle_number: formData.vehicle_number,
            notes: formData.notes,
            status: formData.status
          }])
          .select()
          .single();

        if (driverError) throw driverError;

        // Create facility assignments
        if (selectedFacilities.length > 0) {
          const { error: assignmentError } = await supabase
            .from('facility_drivers')
            .insert(
              selectedFacilities.map(facilityId => ({
                driver_id: newDriver.id,
                facility_id: facilityId
              }))
            );

          if (assignmentError) throw assignmentError;
        }

        toast.success('Driver created successfully');
      } else {
        // Update existing driver
        const { error: driverError } = await supabase
          .from('drivers')
          .update({
            name: formData.name,
            email: formData.email,
            contact_number: formData.contact_number,
            address: formData.address,
            license_number: formData.license_number,
            vehicle_type: formData.vehicle_type,
            vehicle_number: formData.vehicle_number,
            notes: formData.notes,
            status: formData.status
          })
          .eq('id', editingDriver.id);

        if (driverError) throw driverError;

        // Delete existing facility assignments
        const { error: deleteError } = await supabase
          .from('facility_drivers')
          .delete()
          .eq('driver_id', editingDriver.id);

        if (deleteError) throw deleteError;

        // Create new facility assignments
        if (selectedFacilities.length > 0) {
          const { error: assignmentError } = await supabase
            .from('facility_drivers')
            .insert(
              selectedFacilities.map(facilityId => ({
                driver_id: editingDriver.id,
                facility_id: facilityId
              }))
            );

          if (assignmentError) throw assignmentError;
        }

        toast.success('Driver updated successfully');
      }

      setIsModalOpen(false);
      setEditingDriver(null);
      resetForm();
    } catch (error: any) {
      console.error('Error saving driver:', error);
      toast.error(error.message || 'Failed to save driver');
    }
  };

  const handleDelete = async (driver: Driver) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;

    try {
      // Delete facility assignments first
      const { error: assignmentError } = await supabase
        .from('facility_drivers')
        .delete()
        .eq('driver_id', driver.id);

      if (assignmentError) throw assignmentError;

      // Then delete the driver
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', driver.id);

      if (error) throw error;
      toast.success('Driver deleted successfully');
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast.error('Failed to delete driver');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      contact_number: '',
      address: '',
      license_number: '',
      vehicle_type: 'car',
      vehicle_number: '',
      notes: '',
      status: true
    });
    setSelectedFacilities([]);
  };

  const handleEdit = async (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      email: driver.email || '',
      contact_number: driver.contact_number || '',
      address: driver.address || '',
      license_number: driver.license_number,
      vehicle_type: driver.vehicle_type,
      vehicle_number: driver.vehicle_number,
      notes: driver.notes || '',
      status: driver.status
    });

    // Get current facility assignments
    const { data: assignments } = await supabase
      .from('facility_drivers')
      .select('facility_id')
      .eq('driver_id', driver.id);

    setSelectedFacilities(assignments?.map(a => a.facility_id) || []);
    setIsModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
    setFormData({
      ...formData,
      address: addressData.formatted_address
    });
  };

  return (
    <div className="p-6">
      <GooglePlacesScript apiKey="AIzaSyACA7XEfHbsp5gXZ_Eup5eDNxuYojhQl6A" />
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Drivers</h1>
        <button
          onClick={() => {
            setEditingDriver(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Driver
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-600">Loading drivers...</p>
        </div>
      ) : drivers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-600">No drivers found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {driver.name}
                    </h3>
                    {!driver.status && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Driver Code: {driver.driver_code}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(driver)}
                    className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(driver)}
                    className="p-2 text-gray-600 hover:text-red-500 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{driver.email}</span>
                </div>
                {driver.contact_number && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{driver.contact_number}</span>
                  </div>
                )}
                {driver.address && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 mt-1" />
                    <span className="text-sm">{driver.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <Key className="w-4 h-4" />
                  <span className="text-sm">License: {driver.license_number}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Truck className="w-4 h-4" />
                  <span className="text-sm">
                    {driver.vehicle_type.charAt(0).toUpperCase() + driver.vehicle_type.slice(1)} - {driver.vehicle_number}
                  </span>
                </div>
                {driver.facilities && driver.facilities.length > 0 && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <Building2 className="w-4 h-4 mt-1" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Assigned Facilities:</p>
                      <ul className="space-y-1">
                        {driver.facilities.map(facility => (
                          <li key={facility.id}>
                            {facility.facility_name} (#{facility.facility_code})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {driver.notes && (
                  <p className="text-sm text-gray-500 mt-2">{driver.notes}</p>
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
          setEditingDriver(null);
          resetForm();
        }}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-xl shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <Dialog.Title className="text-lg font-semibold text-gray-800">
                {editingDriver ? 'Edit Driver' : 'Add New Driver'}
              </Dialog.Title>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingDriver(null);
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
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>

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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number *
                  </label>
                  <input
                    type="text"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <AddressAutocomplete
                  onSelect={handleAddressSelect}
                  defaultValue={formData.address}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Type *
                  </label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  >
                    <option value="bike">Bike</option>
                    <option value="car">Car</option>
                    <option value="van">Van</option>
                    <option value="truck">Truck</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Number *
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Facilities *
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {facilities.map(facility => (
                    <label key={facility.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedFacilities.includes(facility.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFacilities([...selectedFacilities, facility.id]);
                          } else {
                            setSelectedFacilities(selectedFacilities.filter(id => id !== facility.id));
                          }
                        }}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {facility.facility_name} (#{facility.facility_code})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="Add any additional notes about the driver..."
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
                    setEditingDriver(null);
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
                  {editingDriver ? 'Save Changes' : 'Add Driver'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default Drivers;