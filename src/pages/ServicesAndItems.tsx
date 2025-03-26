import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Service, Category, Item } from '../types/database';

const ServicesAndItems = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('schema_db_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services'
        },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories'
        },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items'
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    try {
      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: true });

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      // Fetch categories with service_id
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch items with category_id
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleService = (serviceId: string) => {
    setExpandedServices(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  };

  const handleAddService = () => {
    toast.success('Add Service clicked');
  };

  const handleEditService = (service: Service) => {
    toast.success(`Edit ${service.name} clicked`);
  };

  const handleDeleteService = (service: Service) => {
    toast.success(`Delete ${service.name} clicked`);
  };

  const handleAddCategory = (serviceId: string) => {
    toast.success(`Add category to service ${serviceId} clicked`);
  };

  const handleEditCategory = (category: Category) => {
    toast.success(`Edit category ${category.name} clicked`);
  };

  const handleDeleteCategory = (category: Category) => {
    toast.success(`Delete category ${category.name} clicked`);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#64748B]">Services & Items</h1>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-600">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#64748B]">Services & Items</h1>
        <button
          onClick={handleAddService}
          className="inline-flex items-center px-4 py-2 text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Service
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(service => {
          const isExpanded = expandedServices.has(service.id);
          const serviceCategories = categories.filter(
            category => category.service_id === service.id
          );

          return (
            <div key={service.id} className="bg-white rounded-lg shadow-sm">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => toggleService(service.id)}
                        className="text-gray-400 hover:text-gray-600 -ml-1"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                      <h2 className="text-lg font-semibold text-gray-800">
                        {service.name}
                      </h2>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditService(service)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-6 border-t border-gray-100 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-700">Categories</h3>
                      <button
                        onClick={() => handleAddCategory(service.id)}
                        className="inline-flex items-center text-sm text-[#3B82F6] hover:text-[#2563EB]"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Category
                      </button>
                    </div>

                    {serviceCategories.length === 0 ? (
                      <p className="text-sm text-gray-500">No categories yet</p>
                    ) : (
                      <div className="space-y-3">
                        {serviceCategories.map(category => (
                          <div
                            key={category.id}
                            className="border border-gray-100 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-gray-700">
                                  {category.name}
                                </h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditCategory(category)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(category)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {items
                              .filter(item => item.category_id === category.id)
                              .map(item => (
                                <div
                                  key={item.id}
                                  className="mt-2 p-2 bg-gray-50 rounded-lg"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">
                                        {item.name}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        ${item.price.toFixed(2)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button className="text-gray-400 hover:text-gray-600">
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button className="text-gray-400 hover:text-gray-600">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
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
    </div>
  );
};

export default ServicesAndItems;