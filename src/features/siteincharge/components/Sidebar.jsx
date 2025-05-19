import { NavLink } from 'react-router-dom';
import { Home, Users, Calendar, BarChart2, CheckCircle, User } from 'lucide-react';

const Sidebar = () => {
  return (
    <aside className="w-64 bg-card dark:bg-card text-card-foreground dark:text-card-foreground shadow-md">
      <div className="p-4">
        <h2 className="text-xl font-bold">Site Incharge</h2>
      </div>
      <nav className="mt-4">
        <NavLink
          to="/siteincharge/dashboard"
          className={({ isActive }) =>
            `flex items-center p-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent dark:hover:text-accent-foreground ${
              isActive ? 'bg-accent text-accent-foreground dark:bg-accent dark:text-accent-foreground' : ''
            }`
          }
        >
          <Home className="mr-2 h-5 w-5" />
          Dashboard
        </NavLink>
        <NavLink
          to="/siteincharge/mark-attendance"
          className={({ isActive }) =>
            `flex items-center p-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent dark:hover:text-accent-foreground ${
              isActive ? 'bg-accent text-accent-foreground dark:bg-accent dark:text-accent-foreground' : ''
            }`
          }
        >
          <CheckCircle className="mr-2 h-5 w-5" />
          Mark Attendance
        </NavLink>
        <NavLink
          to="/siteincharge/attendance"
          className={({ isActive }) =>
            `flex items-center p-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent dark:hover:text-accent-foreground ${
              isActive ? 'bg-accent text-accent-foreground dark:bg-accent dark:text-accent-foreground' : ''
            }`
          }
        >
          <Calendar className="mr-2 h-5 w-5" />
          Attendance
        </NavLink>
        <NavLink
          to="/siteincharge/register-employee"
          className={({ isActive }) =>
            `flex items-center p-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent dark:hover:text-accent-foreground ${
              isActive ? 'bg-accent text-accent-foreground dark:bg-accent dark:text-accent-foreground' : ''
            }`
          }
        >
          <Users className="mr-2 h-5 w-5" />
          Register Employee
        </NavLink>
        <NavLink
          to="/siteincharge/employees"
          className={({ isActive }) =>
            `flex items-center p-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent dark:hover:text-accent-foreground ${
              isActive ? 'bg-accent text-accent-foreground dark:bg-accent dark:text-accent-foreground' : ''
            }`
          }
        >
          <Users className="mr-2 h-5 w-5" />
          Employees
        </NavLink>
        <NavLink
          to="/siteincharge/reports"
          className={({ isActive }) =>
            `flex items-center p-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent dark:hover:text-accent-foreground ${
              isActive ? 'bg-accent text-accent-foreground dark:bg-accent dark:text-accent-foreground' : ''
            }`
          }
        >
          <BarChart2 className="mr-2 h-5 w-5" />
          Reports
        </NavLink>
        <NavLink
          to="/siteincharge/profile"
          className={({ isActive }) =>
            `flex items-center p-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent dark:hover:text-accent-foreground ${
              isActive ? 'bg-accent text-accent-foreground dark:bg-accent dark:text-accent-foreground' : ''
            }`
          }
        >
          <User className="mr-2 h-5 w-5" />
          Profile
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;