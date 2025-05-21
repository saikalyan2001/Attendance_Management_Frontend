import { NavLink } from 'react-router-dom';
import { Home, MapPin, Users, FileText, Calendar, UserPlus, User } from 'lucide-react';

const Sidebar = () => {
  return (
    <aside className="w-64 bg-complementary text-body shadow-md hidden md:block">
      <div className="p-4">
        <h2 className="text-xl font-bold">Admin Panel</h2>
      </div>
      <nav className="flex flex-col p-4 space-y-2">
        <NavLink
          to="/admin/dashboard"
          className={({ isActive }) =>
            `flex items-center p-2 rounded-md ${isActive ? 'bg-accent text-body' : 'hover:bg-accent-hover hover:text-body'}`
          }
        >
          <Home className="h-5 w-5 mr-2" />
          Dashboard
        </NavLink>
        <NavLink
          to="/admin/attendance"
          className={({ isActive }) =>
            `flex items-center p-2 rounded-md ${isActive ? 'bg-accent text-body' : 'hover:bg-accent-hover hover:text-body'}`
          }
        >
          <Calendar className="h-5 w-5 mr-2" />
          Attendance
        </NavLink>
        <NavLink
          to="/admin/locations"
          className={({ isActive }) =>
            `flex items-center p-2 rounded-md ${isActive ? 'bg-accent text-body' : 'hover:bg-accent-hover hover:text-body'}`
          }
        >
          <MapPin className="h-5 w-5 mr-2" />
          Locations
        </NavLink>
        <NavLink
          to="/admin/reports"
          className={({ isActive }) =>
            `flex items-center p-2 rounded-md ${isActive ? 'bg-accent text-body' : 'hover:bg-accent-hover hover:text-body'}`
          }
        >
          <FileText className="h-5 w-5 mr-2" />
          Reports
        </NavLink>
        <NavLink
          to="/admin/employees"
          className={({ isActive }) =>
            `flex items-center p-2 rounded-md ${isActive ? 'bg-accent text-body' : 'hover:bg-accent-hover hover:text-body'}`
          }
        >
          <Users className="h-5 w-5 mr-2" />
          Employees
        </NavLink>
        <NavLink
          to="/admin/register-employee"
          className={({ isActive }) =>
            `flex items-center p-2 rounded-md ${isActive ? 'bg-accent text-body' : 'hover:bg-accent-hover hover:text-body'}`
          }
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Register Employee
        </NavLink>
        <NavLink
          to="/admin/profile"
          className={({ isActive }) =>
            `flex items-center p-2 rounded-md ${isActive ? 'bg-accent text-body' : 'hover:bg-accent-hover hover:text-body'}`
          }
        >
          <User className="h-5 w-5 mr-2" />
          Profile
        </NavLink>
        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            `flex items-center p-2 rounded-md ${isActive ? 'bg-accent text-body' : 'hover:bg-accent-hover hover:text-body'}`
          }
        >
          <User className="h-5 w-5 mr-2" />
          Settings
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;

