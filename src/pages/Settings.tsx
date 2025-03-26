import React, { useState } from 'react';
import { 
  Bell, 
  Mail, 
  Shield, 
  Globe, 
  CreditCard, 
  Truck, 
  Palette,
  Save,
  Building2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ElementType;
}

const Settings = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sections: SettingsSection[] = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'email', label: 'Email Templates', icon: Mail },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'localization', label: 'Localization', icon: Globe },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'appearance', label: 'Appearance', icon: Palette }
  ];

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Support Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="support@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Hours
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Mon-Fri, 9:00 AM - 6:00 PM"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Enter street address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Enter postal code"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Push Notifications</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input type="checkbox" className="form-checkbox h-5 w-5 text-primary rounded border-gray-300" />
                  <span className="ml-2 text-gray-700">New Order Notifications</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="form-checkbox h-5 w-5 text-primary rounded border-gray-300" />
                  <span className="ml-2 text-gray-700">Custom Quote Requests</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="form-checkbox h-5 w-5 text-primary rounded border-gray-300" />
                  <span className="ml-2 text-gray-700">Business Inquiries</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input type="checkbox" className="form-checkbox h-5 w-5 text-primary rounded border-gray-300" />
                  <span className="ml-2 text-gray-700">Daily Order Summary</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="form-checkbox h-5 w-5 text-primary rounded border-gray-300" />
                  <span className="ml-2 text-gray-700">Weekly Analytics Report</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input type="checkbox" className="form-checkbox h-5 w-5 text-primary rounded border-gray-300" />
                  <span className="ml-2 text-gray-700">Enable Two-Factor Authentication</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="form-checkbox h-5 w-5 text-primary rounded border-gray-300" />
                  <span className="ml-2 text-gray-700">Require Strong Passwords</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Session Management</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="30"
                  />
                </div>
                <label className="flex items-center">
                  <input type="checkbox" className="form-checkbox h-5 w-5 text-primary rounded border-gray-300" />
                  <span className="ml-2 text-gray-700">Allow Multiple Sessions</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Methods</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input type="checkbox" className="form-checkbox h-5 w-5 text-primary rounded border-gray-300" />
                  <span className="ml-2 text-gray-700">Credit Card</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="form-checkbox h-5 w-5 text-primary rounded border-gray-300" />
                  <span className="ml-2 text-gray-700">iDEAL</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="form-checkbox h-5 w-5 text-primary rounded border-gray-300" />
                  <span className="ml-2 text-gray-700">Bancontact</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Currency Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Currency
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center text-gray-500 py-8">
            This section is under development
          </div>
        );
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="inline-flex items-center px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5 mr-2" />
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          <nav className="p-4 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-6 md:col-span-3">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;