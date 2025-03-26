import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Service {
  id?: string;
  name: string;
  description: string | null;
  short_description: string;
  icon: string;
  image_url: string | null;
  price_starts_at: number;
  price_unit: string;
  features: string[];
  benefits: string[];
  service_identifier: string;
  color_scheme: {
    primary: string;
    secondary: string;
  };
  sequence: number;
  is_popular: boolean;
  status: boolean;
}

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: Partial<Service>) => void;
  service?: Service;
}

const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  service
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [icon, setIcon] = useState('box');
  const [imageUrl, setImageUrl] = useState('');
  const [priceStartsAt, setPriceStartsAt] = useState('');
  const [priceUnit, setPriceUnit] = useState('per item');
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [benefits, setBenefits] = useState<string[]>([]);
  const [newBenefit, setNewBenefit] = useState('');
  const [serviceIdentifier, setServiceIdentifier] = useState('');
  const [sequence, setSequence] = useState('0');
  const [isPopular, setIsPopular] = useState(false);
  const [status, setStatus] = useState(true);

  useEffect(() => {
    if (service) {
      setName(service.name);
      setDescription(service.description || '');
      setShortDescription(service.short_description);
      setIcon(service.icon);
      setImageUrl(service.image_url || '');
      setPriceStartsAt(service.price_starts_at.toString());
      setPriceUnit(service.price_unit);
      setFeatures(service.features);
      setBenefits(service.benefits);
      setServiceIdentifier(service.service_identifier);
      setSequence(service.sequence.toString());
      setIsPopular(service.is_popular);
      setStatus(service.status);
    } else {
      resetForm();
    }
  }, [service]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setShortDescription('');
    setIcon('box');
    setImageUrl('');
    setPriceStartsAt('');
    setPriceUnit('per item');
    setFeatures([]);
    setBenefits([]);
    setServiceIdentifier('');
    setSequence('0');
    setIsPopular(false);
    setStatus(true);
    setNewFeature('');
    setNewBenefit('');
  };

  const handleAddFeature = () => {
    if (!newFeature.trim()) {
      toast.error('Please enter a feature');
      return;
    }
    setFeatures([...features, newFeature.trim()]);
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleAddBenefit = () => {
    if (!newBenefit.trim()) {
      toast.error('Please enter a benefit');
      return;
    }
    setBenefits([...benefits, newBenefit.trim()]);
    setNewBenefit('');
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (features.length === 0) {
      toast.error('Please add at least one feature');
      return;
    }

    const serviceData: Partial<Service> = {
      ...(service?.id && { id: service.id }),
      name,
      description: description || null,
      short_description: shortDescription,
      icon,
      image_url: imageUrl || null,
      price_starts_at: parseFloat(priceStartsAt),
      price_unit: priceUnit,
      features,
      benefits,
      service_identifier: serviceIdentifier || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      color_scheme: {
        primary: 'blue',
        secondary: 'blue-light'
      },
      sequence: parseInt(sequence),
      is_popular: isPopular,
      status
    };

    onSave(serviceData);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-xl shadow-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <Dialog.Title className="text-lg font-semibold text-gray-800">
              {service ? 'Edit Service' : 'Add New Service'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Service Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="short_description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Short Description *
                </label>
                <input
                  type="text"
                  id="short_description"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Full Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="icon"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Icon Name *
                </label>
                <input
                  type="text"
                  id="icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="image_url"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Image URL
                </label>
                <input
                  type="url"
                  id="image_url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="price_starts_at"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Starting Price *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    id="price_starts_at"
                    value={priceStartsAt}
                    onChange={(e) => setPriceStartsAt(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="price_unit"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Price Unit *
                </label>
                <select
                  id="price_unit"
                  value={priceUnit}
                  onChange={(e) => setPriceUnit(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                >
                  <option value="per item">Per Item</option>
                  <option value="per kg">Per KG</option>
                  <option value="per service">Per Service</option>
                  <option value="per hour">Per Hour</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Features *
              </label>
              <div className="space-y-2">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="flex-1">{feature}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(index)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Enter a feature"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="p-2 text-primary hover:bg-primary/5 rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Benefits
              </label>
              <div className="space-y-2">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="flex-1">{benefit}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBenefit(index)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  placeholder="Enter a benefit"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleAddBenefit}
                  className="p-2 text-primary hover:bg-primary/5 rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="service_identifier"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Service Identifier (Slug)
                </label>
                <input
                  type="text"
                  id="service_identifier"
                  value={serviceIdentifier}
                  onChange={(e) => setServiceIdentifier(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="auto-generated-if-empty"
                />
              </div>

              <div>
                <label
                  htmlFor="sequence"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Sequence
                </label>
                <input
                  type="number"
                  id="sequence"
                  value={sequence}
                  onChange={(e) => setSequence(e.target.value)}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isPopular}
                  onChange={(e) => setIsPopular(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">Popular Service</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={status}
                  onChange={(e) => setStatus(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                {service ? 'Save Changes' : 'Add Service'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ServiceModal;