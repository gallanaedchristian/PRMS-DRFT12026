import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Stethoscope, 
  Plus, 
  Search, 
  Activity, 
  ShieldCheck,
  ChevronRight,
  Database
} from 'lucide-react';
import { usePatients } from '../../context/PatientContext';
import { useAuth } from '../../context/AuthContext';
import { getStaffDisplayName } from '../../utils/staffDisplay';

interface AppLayoutProps {
  children: React.ReactNode;
  onOpenNewPatient: () => void;
  onOpenNewRecord: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  onOpenNewPatient,
  onOpenNewRecord,
}) => {
  const { activeView, setActiveView, clinicInfo, syncStatus, searchQuery, setSearchQuery } = usePatients();
  const { doctor, staffProfile, signOut } = useAuth();
  const displayName = getStaffDisplayName(staffProfile);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { 
      id: 'dashboard', 
      label: staffProfile?.role === 'nurse' ? 'Nurse Station' : staffProfile?.role === 'staff' ? 'Staff Dashboard' : 'Clinical Dashboard', 
      icon: LayoutDashboard 
    },
    { id: 'patients', label: 'Patient Records', icon: Users },
    { id: 'medical-records', label: 'Clinical Records', icon: FileText },
    { id: 'analytics', label: 'Practice Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Clinic Settings', icon: Settings },
  ];

  const handleNavClick = (viewId: any) => {
    setActiveView(viewId);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased text-slate-900">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between no-print sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Patient Records MS</h1>
            <p className="text-[10px] text-blue-300">Modern Healthcare 2026</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNewPatient}
            className="p-1.5 bg-blue-600 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-slate-300 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-64 bg-slate-900 text-white flex flex-col justify-between shrink-0 z-50 transition-transform duration-200 no-print ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div>
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-white">PATIENT RECORDS</h2>
                <p className="text-[11px] text-blue-400 font-medium">Management System</p>
              </div>
            </div>

            {/* Cloud sync status indicator */}
            <div className="mt-4 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Database className="w-3 h-3 text-emerald-400" />
                Backend
              </span>
              <span className="capitalize font-medium text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {syncStatus}
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="p-4 space-y-2 border-b border-slate-800">
            <button
              type="button"
              onClick={onOpenNewPatient}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Patient
            </button>
            <button
              type="button"
              onClick={onOpenNewRecord}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              New Clinical Record
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Staff Profile & Sign Out */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/60">
            <div className="w-9 h-9 rounded-full bg-blue-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {displayName.charAt(0) || 'C'}
            </div>
            <div className="overflow-hidden flex-1">
              <h4 className="text-xs font-bold text-white truncate">
                {displayName}
              </h4>
              <p className="text-[10px] text-slate-400 truncate capitalize">
                {staffProfile?.role || 'Staff'}
                {(staffProfile?.specialty || doctor?.specialty) && ` • ${staffProfile?.specialty || doctor?.specialty}`}
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              title="Sign Out / Switch Staff Account"
              className="p-1 text-slate-400 hover:text-white rounded transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="no-print bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs">
          {/* Global Search Jump Bar */}
          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search patients by name, ID, or phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeView !== 'patients') {
                  setActiveView('patients');
                }
              }}
              className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-slate-800 block">
                {clinicInfo.name}
              </span>
              <span className="text-[10px] text-slate-500">
                PRC Lic. #{clinicInfo.license_number}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
              FT
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Backdrop overlay for mobile drawer */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden"
        />
      )}
    </div>
  );
};
