import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Calculator,
  Briefcase,
  UserCircle,
  Users,
  Settings as SettingsIcon,
  Waves,
  Box,
  Building2,
  Truck,
  ClipboardList,
  Store,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
  Package
} from 'lucide-react';

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: {
    to: string;
    icon: React.ElementType;
    label: string;
  }[];
}

const Sidebar = () => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['orders']));
  const [isExpanded, setIsExpanded] = useState(true);

  const navGroups: NavGroup[] = [
    {
      label: 'Overview',
      icon: LayoutDashboard,
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' }
      ]
    },
    {
      label: 'Orders',
      icon: ShoppingCart,
      items: [
        { to: '/orders', icon: ShoppingCart, label: 'Orders' },
        { to: '/custom-quotes', icon: Calculator, label: 'Custom Quotes' },
        { to: '/business-inquiries', icon: Briefcase, label: 'Business Inquiries' }
      ]
    },
    {
      label: 'Users',
      icon: Users,
      items: [
        { to: '/customers', icon: UserCircle, label: 'Customers' },
        { to: '/drivers', icon: Truck, label: 'Drivers' },
        { to: '/users-roles', icon: Users, label: 'Users & Roles' }
      ]
    },
    {
      label: 'Operations',
      icon: ClipboardList,
      items: [
        { to: '/driver-orders', icon: ClipboardList, label: 'Driver Orders' },
        { to: '/driver-packages', icon: Package, label: 'Driver Packages' },
        { to: '/facility-orders', icon: Store, label: 'Facility Orders' }
      ]
    },
    {
      label: 'Management',
      icon: Building2,
      items: [
        { to: '/services', icon: Box, label: 'Services' },
        { to: '/facilities', icon: Building2, label: 'Facilities' },
        { to: '/settings', icon: SettingsIcon, label: 'Settings' }
      ]
    }
  ];

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  return (
    <div
      className={`${
        isExpanded ? 'w-64' : 'w-16'
      } bg-white border-r border-gray-200 py-6 flex flex-col transition-all duration-300 ease-in-out relative`}
    >
      <div className={`flex items-center ${isExpanded ? 'px-3' : 'justify-center'} mb-6`}>
        <Waves className="h-8 w-8 text-[#007AFF]" />
        {isExpanded && (
          <span className="text-xl font-bold text-gray-800 ml-2">
            Eazyy Admin
          </span>
        )}
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute right-0 top-6 transform translate-x-1/2 bg-white rounded-full p-1.5 border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        {isExpanded ? (
          <PanelLeftClose className="w-4 h-4 text-gray-600" />
        ) : (
          <PanelLeftOpen className="w-4 h-4 text-gray-600" />
        )}
      </button>
      
      <nav className="flex-1 space-y-1 px-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-2">
            <button
              onClick={() => toggleGroup(group.label)}
              className={`w-full flex items-center justify-between ${
                isExpanded ? 'px-3' : 'px-2'
              } py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors`}
            >
              <div className="flex items-center gap-2">
                <group.icon className="h-5 w-5" />
                {isExpanded && (
                  <span>{group.label}</span>
                )}
              </div>
              {isExpanded && (
                <div>
                  {expandedGroups.has(group.label) ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              )}
            </button>

            {isExpanded && expandedGroups.has(group.label) && (
              <div className="mt-1 ml-3 space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[#007AFF] text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;