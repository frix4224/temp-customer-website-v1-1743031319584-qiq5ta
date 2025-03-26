import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Building2, Mail, Phone, Clock, MessageSquare, CheckCircle, XCircle, AlertCircle, Search } from 'lucide-react';
import { Dialog } from '@headlessui/react';

interface BusinessInquiry {
  id: string;
  company_name: string;
  business_type: string;
  contact_name: string;
  email: string;
  phone: string;
  additional_info: string | null;
  requirements: Record<string, any>;
  status: 'pending' | 'contacted' | 'approved' | 'rejected';
  created_at: string;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  contacted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
};

const statusIcons = {
  pending: AlertCircle,
  contacted: MessageSquare,
  approved: CheckCircle,
  rejected: XCircle
};

const BusinessInquiries = () => {
  const [inquiries, setInquiries] = useState<BusinessInquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageModal, setMessageModal] = useState<{ open: boolean; inquiryId: string | null }>({
    open: false,
    inquiryId: null
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchInquiries();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('business_inquiries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_inquiries'
        },
        () => {
          fetchInquiries();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchInquiries = async () => {
    try {
      const { data, error } = await supabase
        .from('business_inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInquiries(data || []);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      toast.error('Failed to load business inquiries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (inquiry: BusinessInquiry, newStatus: BusinessInquiry['status']) => {
    try {
      const { error } = await supabase
        .from('business_inquiries')
        .update({ status: newStatus })
        .eq('id', inquiry.id);

      if (error) throw error;
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !messageModal.inquiryId) {
      toast.error('Please enter a message');
      return;
    }

    try {
      // Here you would typically send the message to the business
      // For now, we'll just update the status to 'contacted'
      const { error } = await supabase
        .from('business_inquiries')
        .update({ status: 'contacted' })
        .eq('id', messageModal.inquiryId);

      if (error) throw error;
      toast.success('Message sent and status updated');
      setMessageModal({ open: false, inquiryId: null });
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const filteredInquiries = inquiries.filter(inquiry => {
    const searchString = searchTerm.toLowerCase();
    return (
      inquiry.company_name.toLowerCase().includes(searchString) ||
      inquiry.contact_name.toLowerCase().includes(searchString) ||
      inquiry.business_type.toLowerCase().includes(searchString) ||
      inquiry.email.toLowerCase().includes(searchString)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Business Inquiries</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search inquiries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary w-64"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-600">Loading inquiries...</p>
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-600">
            {searchTerm ? 'No inquiries found matching your search.' : 'No business inquiries found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredInquiries.map((inquiry) => {
            const StatusIcon = statusIcons[inquiry.status];
            return (
              <div
                key={inquiry.id}
                className="bg-white rounded-lg shadow-sm p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {inquiry.company_name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[inquiry.status]
                        }`}
                      >
                        <StatusIcon className="w-4 h-4 mr-1" />
                        {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building2 className="w-4 h-4" />
                          <span className="text-sm">{inquiry.business_type}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4" />
                          <span className="text-sm">{inquiry.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span className="text-sm">{inquiry.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">
                            Submitted on {formatDate(inquiry.created_at)}
                          </span>
                        </div>
                      </div>

                      {(inquiry.additional_info || inquiry.requirements) && (
                        <div className="space-y-2">
                          {inquiry.additional_info && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">
                                Additional Information
                              </h4>
                              <p className="text-sm text-gray-600">
                                {inquiry.additional_info}
                              </p>
                            </div>
                          )}
                          {inquiry.requirements && Object.keys(inquiry.requirements).length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">
                                Requirements
                              </h4>
                              <ul className="text-sm text-gray-600 list-disc list-inside">
                                {Object.entries(inquiry.requirements).map(([key, value]) => (
                                  <li key={key}>
                                    {key}: {value.toString()}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMessageModal({ open: true, inquiryId: inquiry.id })}
                      className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                    <select
                      value={inquiry.status}
                      onChange={(e) => handleStatusChange(inquiry, e.target.value as BusinessInquiry['status'])}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="pending">Pending</option>
                      <option value="contacted">Contacted</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Message Modal */}
      <Dialog
        open={messageModal.open}
        onClose={() => setMessageModal({ open: false, inquiryId: null })}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg w-full bg-white rounded-xl shadow-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <Dialog.Title className="text-lg font-semibold text-gray-800">
                Send Message to Business
              </Dialog.Title>
              <button
                onClick={() => setMessageModal({ open: false, inquiryId: null })}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="w-5 h-5" />
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
                  onClick={() => setMessageModal({ open: false, inquiryId: null })}
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

export default BusinessInquiries;