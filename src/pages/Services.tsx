import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Star, Search, Box } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import ServiceModal from '../components/ServiceModal';
import CategoryModal from '../components/CategoryModal';
import ItemModal from '../components/ItemModal';
import type { Service, Category, Item } from '../types/database';

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Record<string, Item[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>();
  const [selectedItem, setSelectedItem] = useState<Item | undefined>();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<Service | undefined>();

  useEffect(() => {
    fetchServices();

    // Subscribe to real-time changes
    const serviceSubscription = supabase
      .channel('services_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services'
        },
        () => {
          fetchServices();
        }
      )
      .subscribe();

    const categorySubscription = supabase
      .channel('categories_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories'
        },
        () => {
          if (selectedService) {
            fetchCategories(selectedService.id);
          }
        }
      )
      .subscribe();

    const itemSubscription = supabase
      .channel('items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items'
        },
        () => {
          if (categories.length > 0) {
            fetchAllItems();
          }
        }
      )
      .subscribe();

    return () => {
      serviceSubscription.unsubscribe();
      categorySubscription.unsubscribe();
      itemSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedService) {
      fetchCategories(selectedService.id);
    } else {
      setCategories([]);
      setItems({});
    }
  }, [selectedService]);

  useEffect(() => {
    if (categories.length > 0) {
      fetchAllItems();
    }
  }, [categories]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('sequence', { ascending: true });

      if (error) throw error;
      setServices(data || []);
      
      // Select first service by default if none selected
      if (data && data.length > 0 && !selectedService) {
        setSelectedService(data[0]);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async (serviceId: string) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('service_id', serviceId)
        .order('sequence', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchAllItems = async () => {
    try {
      const categoryIds = categories.map(cat => cat.id);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .in('category_id', categoryIds)
        .order('sequence', { ascending: true });

      if (error) throw error;

      const itemsByCategory = data.reduce((acc: Record<string, Item[]>, item) => {
        if (!acc[item.category_id]) {
          acc[item.category_id] = [];
        }
        acc[item.category_id].push(item);
        return acc;
      }, {});

      setItems(itemsByCategory);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load items');
    }
  };

  const handleSaveService = async (serviceData: Partial<Service>) => {
    try {
      if (serviceData.id) {
        // Update existing service
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', serviceData.id);

        if (error) throw error;
        toast.success('Service updated successfully');
      } else {
        // Create new service
        const { error } = await supabase
          .from('services')
          .insert([serviceData]);

        if (error) throw error;
        toast.success('Service created successfully');
      }

      setIsServiceModalOpen(false);
      setEditingService(undefined);
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Failed to save service');
    }
  };

  const handleDeleteService = async (service: Service) => {
    if (!confirm('Are you sure you want to delete this service? All associated categories and items will also be deleted.')) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', service.id);

      if (error) throw error;
      toast.success('Service deleted successfully');

      if (selectedService?.id === service.id) {
        setSelectedService(null);
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Failed to delete service');
    }
  };

  const handleSaveCategory = async (categoryData: Partial<Category>) => {
    if (!selectedService) return;

    try {
      if (categoryData.id) {
        const { error } = await supabase
          .from('categories')
          .update({
            name: categoryData.name,
            description: categoryData.description,
            icon: categoryData.icon,
            sequence: categoryData.sequence,
            status: categoryData.status
          })
          .eq('id', categoryData.id);

        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([{
            ...categoryData,
            service_id: selectedService.id
          }]);

        if (error) throw error;
        toast.success('Category created successfully');
      }

      setIsCategoryModalOpen(false);
      setSelectedCategory(undefined);
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm('Are you sure you want to delete this category? All items in this category will also be deleted.')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const handleSaveItem = async (itemData: Partial<Item>) => {
    try {
      if (itemData.id) {
        const { error } = await supabase
          .from('items')
          .update({
            name: itemData.name,
            description: itemData.description,
            price: itemData.price,
            is_popular: itemData.is_popular,
            sequence: itemData.sequence,
            status: itemData.status
          })
          .eq('id', itemData.id);

        if (error) throw error;
        toast.success('Item updated successfully');
      } else {
        const { error } = await supabase
          .from('items')
          .insert([itemData]);

        if (error) throw error;
        toast.success('Item created successfully');
      }

      setIsItemModalOpen(false);
      setSelectedItem(undefined);
      setActiveCategory(null);
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save item');
    }
  };

  const handleDeleteItem = async (item: Item) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const filteredCategories = categories.filter(category => {
    if (!searchTerm) return true;
    
    const searchString = searchTerm.toLowerCase();
    const hasMatchingItems = items[category.id]?.some(item =>
      item.name.toLowerCase().includes(searchString) ||
      (item.description?.toLowerCase() || '').includes(searchString)
    );
    
    return category.name.toLowerCase().includes(searchString) ||
           (category.description?.toLowerCase() || '').includes(searchString) ||
           hasMatchingItems;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Services Management</h1>
        <button
          onClick={() => {
            setEditingService(undefined);
            setIsServiceModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Service
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-600">Loading services...</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Select Service</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {services.map(service => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                    selectedService?.id === service.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Box className={`w-5 h-5 ${
                    selectedService?.id === service.id ? 'text-primary' : 'text-gray-400'
                  }`} />
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium ${
                        selectedService?.id === service.id ? 'text-primary' : 'text-gray-700'
                      }`}>
                        {service.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingService(service);
                            setIsServiceModalOpen(true);
                          }}
                          className="p-1 text-gray-400 hover:text-primary"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteService(service);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {service.short_description && (
                      <p className="text-sm text-gray-500 mt-1">{service.short_description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-medium text-primary">
                        ${service.price_starts_at} {service.price_unit}
                      </span>
                      {service.is_popular && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          Popular
                        </span>
                      )}
                      {!service.status && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedService && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Categories for {selectedService.name}
                  </h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search categories and items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary w-64"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCategory(undefined);
                    setIsCategoryModalOpen(true);
                  }}
                  className="inline-flex items-center px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Category
                </button>
              </div>

              {filteredCategories.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                  <p className="text-gray-600">
                    {searchTerm ? 'No categories or items found matching your search.' : 'No categories found.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredCategories.map((category) => {
                    const isExpanded = expandedCategories.has(category.id);
                    const categoryItems = items[category.id] || [];
                    
                    return (
                      <div
                        key={category.id}
                        className="bg-white rounded-lg shadow-sm overflow-hidden"
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => toggleCategory(category.id)}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-5 h-5" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5" />
                                  )}
                                </button>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-800">
                                    {category.name}
                                  </h3>
                                  {category.description && (
                                    <p className="text-gray-600 mt-1">{category.description}</p>
                                  )}
                                </div>
                                {!category.status && (
                                  <span className="px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                    Inactive
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedCategory(category);
                                  setIsCategoryModalOpen(true);
                                }}
                                className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(category)}
                                className="p-2 text-gray-600 hover:text-red-500 hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-6 border-t border-gray-100 pt-6">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-medium text-gray-700">Items</h4>
                                <button
                                  onClick={() => {
                                    setSelectedItem(undefined);
                                    setActiveCategory(category.id);
                                    setIsItemModalOpen(true);
                                  }}
                                  className="inline-flex items-center text-sm text-primary hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Item
                                </button>
                              </div>

                              {categoryItems.length === 0 ? (
                                <p className="text-sm text-gray-500">No items in this category</p>
                              ) : (
                                <div className="grid grid-cols-1 gap-4">
                                  {categoryItems.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <h5 className="text-sm font-medium text-gray-800">
                                            {item.name}
                                          </h5>
                                          {item.is_popular && (
                                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                          )}
                                          {!item.status && (
                                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
                                              Inactive
                                            </span>
                                          )}
                                        </div>
                                        {item.description && (
                                          <p className="text-sm text-gray-600 mt-1">
                                            {item.description}
                                          </p>
                                        )}
                                        <p className="text-sm font-medium text-primary mt-1">
                                          ${item.price.toFixed(2)}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => {
                                            setSelectedItem(item);
                                            setActiveCategory(category.id);
                                            setIsItemModalOpen(true);
                                          }}
                                          className="p-2 text-gray-600 hover:text-primary hover:bg-white rounded-lg transition-colors"
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteItem(item)}
                                          className="p-2 text-gray-600 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => {
          setIsServiceModalOpen(false);
          setEditingService(undefined);
        }}
        onSave={handleSaveService}
        service={editingService}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setSelectedCategory(undefined);
        }}
        onSave={handleSaveCategory}
        category={selectedCategory}
      />

      {activeCategory && (
        <ItemModal
          isOpen={isItemModalOpen}
          onClose={() => {
            setIsItemModalOpen(false);
            setSelectedItem(undefined);
            setActiveCategory(null);
          }}
          onSave={handleSaveItem}
          categoryId={activeCategory}
          item={selectedItem}
        />
      )}
    </div>
  );
};

export default Services;