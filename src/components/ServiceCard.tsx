import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import type { Service, Category, Item } from '../types/database';
import CategoryModal from './CategoryModal';
import ItemModal from './ItemModal';

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onEdit,
  onDelete
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Record<string, Item[]>>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>();
  const [selectedItem, setSelectedItem] = useState<Item | undefined>();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (isExpanded) {
      fetchCategories();
    }
  }, [isExpanded, service.id]);

  useEffect(() => {
    // Subscribe to real-time changes for categories
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
          if (isExpanded) {
            fetchCategories();
          }
        }
      )
      .subscribe();

    // Subscribe to real-time changes for items
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
      categorySubscription.unsubscribe();
      itemSubscription.unsubscribe();
    };
  }, [isExpanded, categories]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('service_id', service.id)
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
      if (categoryIds.length === 0) return;

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .in('category_id', categoryIds)
        .order('sequence', { ascending: true });

      if (error) throw error;

      // Group items by their category_id
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

  const handleSaveCategory = async (categoryData: Partial<Category>) => {
    try {
      if (categoryData.id) {
        // Update existing category
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
        // Create new category
        const { error } = await supabase
          .from('categories')
          .insert([{
            ...categoryData,
            service_id: service.id
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
        // Update existing item
        const { error } = await supabase
          .from('items')
          .update({
            name: itemData.name,
            description: itemData.description,
            price: itemData.price,
            is_custom_price: itemData.is_custom_price,
            is_popular: itemData.is_popular,
            sequence: itemData.sequence,
            status: itemData.status
          })
          .eq('id', itemData.id);

        if (error) throw error;
        toast.success('Item updated successfully');
      } else {
        // Create new item
        const { error } = await supabase
          .from('items')
          .insert([{
            ...itemData,
            category_id: itemData.category_id
          }]);

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

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-800">{service.name}</h3>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
          {service.description && (
            <p className="text-gray-600 mt-1">{service.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(service)}
            className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(service)}
            className="p-2 text-gray-600 hover:text-red-500 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="pt-4 border-t border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Categories</h4>
            <button
              onClick={() => {
                setSelectedCategory(undefined);
                setIsCategoryModalOpen(true);
              }}
              className="inline-flex items-center text-sm text-primary hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </button>
          </div>

          {categories.length === 0 ? (
            <p className="text-sm text-gray-500">No categories yet</p>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="border border-gray-100 rounded-lg overflow-hidden"
                >
                  <div className="flex items-center justify-between p-3 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                      >
                        {expandedCategories.has(category.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <h5 className="text-sm font-medium text-gray-700">
                        {category.name}
                      </h5>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedCategory(category);
                          setIsCategoryModalOpen(true);
                        }}
                        className="p-1 text-gray-500 hover:text-primary rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        className="p-1 text-gray-500 hover:text-red-500 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {expandedCategories.has(category.id) && (
                    <div className="p-3 bg-white">
                      <div className="flex justify-end mb-3">
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

                      {!items[category.id] || items[category.id].length === 0 ? (
                        <p className="text-sm text-gray-500">No items in this category</p>
                      ) : (
                        <div className="space-y-2">
                          {items[category.id].map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <h5 className="text-sm font-medium text-gray-800">
                                  {item.name}
                                </h5>
                                {item.description && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {item.description}
                                  </p>
                                )}
                                <p className="text-sm font-medium text-primary mt-1">
                                  {item.is_custom_price ? 'Custom Price' : `$${item.price?.toFixed(2) || '0.00'}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setActiveCategory(category.id);
                                    setIsItemModalOpen(true);
                                  }}
                                  className="p-1 text-gray-500 hover:text-primary rounded transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item)}
                                  className="p-1 text-gray-500 hover:text-red-500 rounded transition-colors"
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
              ))}
            </div>
          )}
        </div>
      )}

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

export default ServiceCard;