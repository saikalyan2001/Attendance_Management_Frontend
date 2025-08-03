import { NavLink } from "react-router-dom";
import {
  Home,
  MapPin,
  Users,
  ChevronsLeft,
  ChevronsRight,
  X,
  Settings,
  UserPlus,
  Briefcase,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const SuperAdminSidebar = ({
  isCollapsed,
  toggleCollapse,
  isMobile,
  setMobileMenuOpen,
  isOpen,
}) => {
  return (
    <aside
      className={cn(
        "bg-complementary text-body shadow-md min-h-screen transition-all duration-300 fixed top-0 left-0 z-50",
        isMobile
          ? cn(
              "w-3/4 h-screen",
              isOpen ? "transform translate-x-0" : "transform -translate-x-full"
            )
          : isCollapsed
          ? "w-[72px]"
          : "w-[256px]"
      )}
    >
      <div className="p-3 sm:p-4 flex justify-between items-center">
        {!isCollapsed && !isMobile && (
          <h2 className="text-lg sm:text-xl font-bold">Super Admin Panel</h2>
        )}
        {isMobile ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(false)}
            className="text-body hover:bg-accent-hover rounded-md"
            aria-label="Close Sidebar"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="hidden xl:block text-body hover:bg-accent-hover rounded-md"
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <ChevronsRight className="h-5 w-5" />
            ) : (
              <ChevronsLeft className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>
      <nav className="flex flex-col p-3 sm:p-4 space-y-2">
        {[
          { to: "/superadmin/dashboard", icon: Home, label: "Dashboard" },
          { to: "/superadmin/attendance", icon: Calendar, label: "Attendance" },
          { to: "/superadmin/locations", icon: MapPin, label: "Locations" },
          { to: "/superadmin/reports", icon: Calendar, label: "Reports" },
          { to: "/superadmin/employees", icon: Briefcase, label: "Employees" },

          {
            to: "/superadmin/register-employee",
            icon: UserPlus,
            label: "Register Employee",
          },

          { to: "/superadmin/users", icon: Users, label: "User Management" },
          {
            to: "/superadmin/create-user",
            icon: UserPlus,
            label: "Create User",
          },
          { to: "/superadmin/settings", icon: Settings, label: "Settings" },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center p-2 rounded-md text-[10px] sm:text-sm xl:text-base",
                isActive
                  ? "bg-accent text-body"
                  : "hover:bg-accent-hover hover:text-body",
                (isCollapsed || isMobile) && "justify-center"
              )
            }
          >
            <item.icon className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
            {!(isCollapsed && !isMobile) && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default SuperAdminSidebar;
