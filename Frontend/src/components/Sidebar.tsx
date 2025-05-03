import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, Settings, ChevronRight, UserCheck, AlertTriangle, Menu, X, Clock, LayoutGrid } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery({ query: '(max-width: 767px)' });
  const effectiveIsCollapsed = isMobile ? false : isCollapsed;

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/', icon: <Home size={20} />, label: 'Home' },
    { path: '/students', icon: <Users size={20} />, label: 'Students', hasDropdown: true },
    { path: '/schedule', icon: <Calendar size={20} />, label: 'Schedule' },
    { path: '/shifts', icon: <Clock size={20} />, label: 'Shifts' },
    { path: '/seats', icon: <LayoutGrid size={20} />, label: 'Seats' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <>
      {isMobile && (
        <button
          className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md bg-white shadow-md"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu size={24} />
        </button>
      )}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      <div
        className={`h-screen bg-gradient-to-br from-purple-50 to-orange-50 border-r border-gray-100 flex flex-col transition-all duration-300 ${
          isMobile ? (isSidebarOpen ? 'fixed inset-0 z-50 w-full' : 'hidden') : (effectiveIsCollapsed ? 'w-16' : 'w-64')
        }`}
      >
        <div className="p-4 flex items-center justify-between">
          {!effectiveIsCollapsed && (
            <div className="flex items-center gap-2">
              <div className="bg-gradient-radial from-purple-300 to-orange-200 h-10 w-10 rounded-full"></div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-orange-400 text-transparent bg-clip-text">
                Library Management
              </h1>
            </div>
          )}
          {isMobile ? (
            <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
              <X size={20} />
            </button>
          ) : (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <ChevronRight size={20} className={`${isCollapsed ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        <nav className="flex-1 px-2 py-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-purple-100 text-purple-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  } ${effectiveIsCollapsed ? 'justify-center' : 'justify-between'}`}
                  onClick={(e) => {
                    if (item.hasDropdown && item.label === 'Students' && !effectiveIsCollapsed) {
                      e.preventDefault();
                      setShowStudentDropdown(!showStudentDropdown);
                    } else if (isMobile) {
                      setIsSidebarOpen(false);
                    }
                  }}
                >
                  <div className={`flex items-center gap-3 ${effectiveIsCollapsed ? 'justify-center' : ''}`}>
                    <span className={isActive(item.path) ? 'text-purple-600' : 'text-gray-500'}>{item.icon}</span>
                    {!effectiveIsCollapsed && <span className="font-medium">{item.label}</span>}
                  </div>
                  {!effectiveIsCollapsed && item.hasDropdown && (
                    <ChevronRight
                      size={18}
                      className={`transition-transform ${showStudentDropdown ? 'rotate-90' : ''}`}
                    />
                  )}
                </Link>
                {!effectiveIsCollapsed && item.hasDropdown && showStudentDropdown && item.label === 'Students' && (
                  <div className="ml-8 mt-1 space-y-1 animate-fade-in">
                    <Link
                      to="/students/add"
                      className={`block py-2 px-3 rounded-md text-sm font-medium ${
                        isActive('/students/add') ? 'bg-purple-50 text-purple-600' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => isMobile && setIsSidebarOpen(false)}
                    >
                      Add Student
                    </Link>
                    <Link
                      to="/students"
                      className={`block py-2 px-3 rounded-md text-sm font-medium ${
                        isActive('/students') ? 'bg-purple-50 text-purple-600' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => isMobile && setIsSidebarOpen(false)}
                    >
                      View All
                    </Link>
                    <Link
                      to="/active-students"
                      className={`flex items-center py-2 px-3 rounded-md text-sm font-medium ${
                        isActive('/active-students') ? 'bg-purple-50 text-purple-600' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => isMobile && setIsSidebarOpen(false)}
                    >
                      <UserCheck size={14} className="mr-1.5" />
                      Active Students
                    </Link>
                    <Link
                      to="/expired-memberships"
                      className={`flex items-center py-2 px-3 rounded-md text-sm font-medium ${
                        isActive('/expired-memberships')
                          ? 'bg-purple-50 text-purple-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => isMobile && setIsSidebarOpen(false)}
                    >
                      <AlertTriangle size={14} className="mr-1.5" />
                      Expired Members
                    </Link>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>
        {!effectiveIsCollapsed && (
          <div className="p-4 mb-4 mx-4 bg-purple-100 rounded-lg">
            <p className="text-sm font-medium text-purple-800">Need help?</p>
            <p className="text-xs text-purple-600 mt-1">Check our documentation</p>
            <button className="mt-2 text-xs bg-white text-purple-600 px-3 py-1 rounded-md border border-purple-200 hover:bg-purple-50">
              View Docs
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;