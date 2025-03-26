import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import CustomQuotes from './pages/CustomQuotes';
import BusinessInquiries from './pages/BusinessInquiries';
import Customers from './pages/Customers';
import UsersAndRoles from './pages/UsersAndRoles';
import Settings from './pages/Settings';
import Services from './pages/Services';
import Facilities from './pages/Facilities';
import Drivers from './pages/Drivers';
import DriverOrders from './pages/DriverOrders';
import FacilityOrders from './pages/FacilityOrders';
import DriverPackages from './pages/DriverPackages';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/custom-quotes" element={<CustomQuotes />} />
            <Route path="/business-inquiries" element={<BusinessInquiries />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/driver-orders" element={<DriverOrders />} />
            <Route path="/driver-packages" element={<DriverPackages />} />
            <Route path="/facility-orders" element={<FacilityOrders />} />
            <Route path="/users-roles" element={<UsersAndRoles />} />
            <Route path="/services" element={<Services />} />
            <Route path="/facilities" element={<Facilities />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App