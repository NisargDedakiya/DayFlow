import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  User, 
  Clock, 
  Calendar, 
  DollarSign, 
  LogOut,
  Users,
  CheckSquare,
  Menu,
  X,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function NavItem({ to, icon, label, onClick }: NavItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
            : 'text-sidebar-foreground'
        )
      }
    >
      {icon}
      <span className="font-medium">{label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  const { role, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const closeSidebar = () => setIsOpen(false);

  const employeeLinks = [
    { to: '/employee/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/notifications', icon: <AlertCircle size={20} />, label: 'Notifications' },
    { to: '/employee/profile', icon: <User size={20} />, label: 'Profile' },
    { to: '/employee/attendance', icon: <Clock size={20} />, label: 'Attendance' },
    { to: '/employee/leave', icon: <Calendar size={20} />, label: 'Leave Requests' },
    { to: '/employee/payroll', icon: <DollarSign size={20} />, label: 'Payroll' },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/notifications', icon: <AlertCircle size={20} />, label: 'Notifications' },
    { to: '/admin/employees', icon: <Users size={20} />, label: 'Employees' },
    { to: '/admin/attendance', icon: <Clock size={20} />, label: 'Attendance' },
    { to: '/admin/leave-approvals', icon: <CheckSquare size={20} />, label: 'Leave Approvals' },
    { to: '/admin/payroll', icon: <DollarSign size={20} />, label: 'Payroll' },
    { to: '/admin/audit-logs', icon: <AlertCircle size={20} />, label: 'Audit Logs' },
  ];

  const links = role === 'admin' ? adminLinks : employeeLinks;

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 gradient-sidebar z-50 flex flex-col transition-transform duration-300 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-bold text-sidebar-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">DF</span>
            </div>
            DayFlow
          </h1>
          <p className="text-xs text-sidebar-foreground/60 mt-1">HR Management System</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavItem key={link.to} {...link} onClick={closeSidebar} />
          ))}
        </nav>

        {/* User & Logout */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <User size={16} className="text-sidebar-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.email}
              </p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleSignOut}
          >
            <LogOut size={20} />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
}
