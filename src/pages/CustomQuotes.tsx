import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Clock, DollarSign, CheckCircle, XCircle, AlertCircle, X, MessageSquare } from 'lucide-react';
import { Dialog } from '@headlessui/react';

interface CustomQuote {
  id: string;
  item_name: string;
  description: string | null;
  image_url: string[] | null;
  suggested_price: number | null;
  status: 'pending' | 'quoted' | 'accepted' | 'declined';
  urgency: 'standard' | 'express';
  created_at: string;
  facility_note: string | null;
  admin_price: number | null;
  admin_note: string | null;
  admin_quoted_at: string | null;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  quoted: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800'
};

const statusIcons = {
  pending: AlertCircle,
  quoted: Clock,
  accepted: CheckCircle,
  declined: XCircle
};

const CustomQuotes = () => {
  const [quotes, setQuotes] = useState<CustomQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPrice, setEditingPrice] = useState<{ [key: string]: string }>({});
  const [editingNote, setEditingNote] = useState<{ [key: string]: string }>({});
  const [editingAdminPrice, setEditingAdminPrice] = useState<{ [key: string]: string }>({});
  const [editingAdminNote, setEditingAdminNote] = useState<{ [key: string]: string }>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [messageModal, setMessageModal] = useState<{ open: boolean; quoteId: string | null }>({
    open: false,
    quoteId: null
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchQuotes();

    const subscription = supabase
      .channel('custom_quotes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'custom_price_quotes'
        },
        () => {
          fetchQuotes();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_price_quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);

      // Initialize editing states
      const initialEditingState: { [key: string]: string } = {};
      const initialNoteState: { [key: string]: string } = {};
      const initialAdminPriceState: { [key: string]: string } = {};
      const initialAdminNoteState: { [key: string]: string } = {};
      
      data?.forEach(quote => {
        initialEditingState[quote.id] = quote.suggested_price?.toString() || '';
        initialNoteState[quote.id] = quote.facility_note || '';
        initialAdminPriceState[quote.id] = quote.admin_price?.toString() || '';
        initialAdminNoteState[quote.id] = quote.admin_note || '';
      });
      
      setEditingPrice(initialEditingState);
      setEditingNote(initialNoteState);
      setEditingAdminPrice(initialAdminPriceState);
      setEditingAdminNote(initialAdminNoteState);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Failed to load quotes');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePriceChange = (quoteId: string, value: string) => {
    setEditingPrice(prev => ({
      ...prev,
      [quoteId]: value
    }));
  };

  const handleNoteChange = (quoteId: string, value: string) => {
    setEditingNote(prev => ({
      ...prev,
      [quoteId]: value
    }));
  };

  const handleAdminPriceChange = (quoteId: string, value: string) => {
    setEditingAdminPrice(prev => ({
      ...prev,
      [quoteId]: value
    }));
  };

  const handleAdminNoteChange = (quoteId: string, value: string) => {
    setEditingAdminNote(prev => ({
      ...prev,
      [quoteId]: value
    }));
  };

  const handleSaveQuote = async (quote: CustomQuote) => {
    const price = parseFloat(editingPrice[quote.id]);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      const { error } = await supabase
        .from('custom_price_quotes')
        .update({
          suggested_price: price,
          facility_note: editingNote[quote.id],
          status: 'quoted'
        })
        .eq('id', quote.id);

      if (error) throw error;
      toast.success('Quote updated successfully');
    } catch (error) {
      console.error('Error updating quote:', error);
      toast.error('Failed to update quote');
    }
  };

  const handleSaveAdminQuote = async (quote: CustomQuote) => {
    const price = parseFloat(editingAdminPrice[quote.id]);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid final price');
      return;
    }

    try {
      const { error } = await supabase
        .from('custom_price_quotes')
        .update({
          admin_price: price,
          admin_note: editingAdminNote[quote.id],
          admin_quoted_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      if (error) throw error;
      toast.success('Final quote sent to customer');
    } catch (error) {
      console.error('Error updating admin quote:', error);
      toast.error('Failed to send final quote');
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !messageModal.quoteId) {
      toast.error('Please enter a message');
      return;
    }

    try {
      toast.success('Message sent to customer');
      setMessageModal({ open: false, quoteId: null });
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Custom Quotes</h1>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-600">Loading quotes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Custom Quotes</h1>
      
      {quotes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-600">No custom quotes found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {quotes.map((quote) => {
            const StatusIcon = statusIcons[quote.status];
            return (
              <div
                key={quote.id}
                className="bg-white rounded-lg shadow-sm p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {quote.item_name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[quote.status]
                        }`}
                      >
                        <StatusIcon className="w-4 h-4 mr-1" />
                        {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          quote.urgency === 'express'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {quote.urgency.charAt(0).toUpperCase() + quote.urgency.slice(1)}
                      </span>
                    </div>
                    
                    {quote.description && (
                      <p className="text-gray-600">{quote.description}</p>
                    )}
                    
                    <p className="text-sm text-gray-500">
                      Requested on {formatDate(quote.created_at)}
                    </p>
                  </div>

                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => setMessageModal({ open: true, quoteId: quote.id })}
                      className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>

                    <div className="space-y-6">
                      {/* Facility Suggestion Section */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-700">Facility Suggestion</h4>
                        {quote.status === 'pending' ? (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="number"
                                  value={editingPrice[quote.id]}
                                  onChange={(e) => handlePriceChange(quote.id, e.target.value)}
                                  placeholder="0.00"
                                  step="0.01"
                                  min="0"
                                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary w-32"
                                />
                              </div>
                            </div>
                            <div>
                              <textarea
                                value={editingNote[quote.id]}
                                onChange={(e) => handleNoteChange(quote.id, e.target.value)}
                                placeholder="Add facility notes..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                rows={2}
                              />
                            </div>
                            <button
                              onClick={() => handleSaveQuote(quote)}
                              className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              Save Suggestion
                            </button>
                          </>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-lg font-medium text-gray-600">
                              ${quote.suggested_price?.toFixed(2)}
                            </div>
                            {quote.facility_note && (
                              <div className="text-sm text-gray-500">
                                {quote.facility_note}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Admin Final Quote Section */}
                      {quote.status === 'quoted' && (
                        <div className="space-y-4 border-t pt-4">
                          <h4 className="text-sm font-medium text-gray-700">Final Quote to Customer</h4>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="number"
                                value={editingAdminPrice[quote.id]}
                                onChange={(e) => handleAdminPriceChange(quote.id, e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary w-32"
                              />
                            </div>
                          </div>
                          <div>
                            <textarea
                              value={editingAdminNote[quote.id]}
                              onChange={(e) => handleAdminNoteChange(quote.id, e.target.value)}
                              placeholder="Add note to customer..."
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                              rows={2}
                            />
                          </div>
                          <button
                            onClick={() => handleSaveAdminQuote(quote)}
                            className="w-full px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors"
                          >
                            Send Final Quote
                          </button>
                        </div>
                      )}

                      {/* Show Final Quote if Set */}
                      {quote.admin_price && (
                        <div className="space-y-2 border-t pt-4">
                          <h4 className="text-sm font-medium text-gray-700">Final Quote</h4>
                          <div className="text-lg font-semibold text-success">
                            ${quote.admin_price.toFixed(2)}
                          </div>
                          {quote.admin_note && (
                            <div className="text-sm text-gray-600">
                              {quote.admin_note}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            Sent on {formatDate(quote.admin_quoted_at!)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {quote.image_url && quote.image_url.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {quote.image_url.map((url, index) => (
                      <div
                        key={index}
                        className="relative group cursor-pointer"
                        onClick={() => setSelectedImage(url)}
                      >
                        <img
                          src={url}
                          alt={`${quote.item_name} - Image ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg transition-transform group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Image Modal */}
      <Dialog
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="relative max-w-4xl w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Large preview"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Message Modal */}
      <Dialog
        open={messageModal.open}
        onClose={() => setMessageModal({ open: false, quoteId: null })}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg w-full bg-white rounded-xl shadow-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <Dialog.Title className="text-lg font-semibold text-gray-800">
                Send Message to Customer
              </Dialog.Title>
              <button
                onClick={() => setMessageModal({ open: false, quoteId: null })}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />

              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => setMessageModal({ open: false, quoteId: null })}
                  className="px-4 py-2 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  className="px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                >
                  Send Message
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default CustomQuotes;