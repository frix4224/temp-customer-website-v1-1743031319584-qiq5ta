import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';

interface Item {
  id?: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | null;
  is_custom_price: boolean;
  is_popular: boolean;
  sequence: number;
  status: boolean;
}

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<Item>) => void;
  categoryId: string;
  item?: Item;
}

const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categoryId,
  item
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isCustomPrice, setIsCustomPrice] = useState(false);
  const [isPopular, setIsPopular] = useState(false);
  const [sequence, setSequence] = useState('0');
  const [status, setStatus] = useState(true);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description || '');
      setPrice(item.price?.toString() || '');
      setIsCustomPrice(item.is_custom_price);
      setIsPopular(item.is_popular);
      setSequence(item.sequence.toString());
      setStatus(item.status);
    } else {
      setName('');
      setDescription('');
      setPrice('');
      setIsCustomPrice(false);
      setIsPopular(false);
      setSequence('0');
      setStatus(true);
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Only validate price if it's not a custom price item
    if (!isCustomPrice && (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
      alert('Please enter a valid price');
      return;
    }

    onSave({
      ...(item?.id && { id: item.id }),
      category_id: categoryId,
      name,
      description: description || null,
      price: isCustomPrice ? null : parseFloat(price),
      is_custom_price: isCustomPrice,
      is_popular: isPopular,
      sequence: parseInt(sequence),
      status
    });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg w-full bg-white rounded-xl shadow-lg">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <Dialog.Title className="text-lg font-semibold text-gray-800">
              {item ? 'Edit Item' : 'Add New Item'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Item Name
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
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            <div>
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={isCustomPrice}
                  onChange={(e) => {
                    setIsCustomPrice(e.target.checked);
                    if (e.target.checked) {
                      setPrice('');
                    }
                  }}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">Custom Price (price will be determined per order)</span>
              </label>

              {!isCustomPrice && (
                <div className="relative">
                  <span className="absolute left-4 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    id="price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>
              )}
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

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isPopular}
                  onChange={(e) => setIsPopular(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">Popular Item</span>
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
                {item ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ItemModal;