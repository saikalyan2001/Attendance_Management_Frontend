// src/components/layout/Layout.jsx
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../redux/slices/authSlice';
import AdminSidebar from '../../features/admin/components/Sidebar';
import SiteInchargeSidebar from '../../features/siteincharge/components/Sidebar';
import SuperAdminSidebar from '../../features/superadmin/components/Sidebar';
import { ThemeToggle } from '../common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toaster, toast } from 'react-hot-toast';

const Layout = ({ children, title, role: propRole }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const role = propRole || user?.role || 'siteincharge';
  const Sidebar = role === 'siteincharge' ? SiteInchargeSidebar : role === 'super_admin' ? SuperAdminSidebar : AdminSidebar;

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleLogout = () => {
    dispatch(logout()).then(() => {
      toast.success('Logged out successfully', {
        id: 'logout-success',
        position: 'top-center',
        duration: 3000, // Reduced duration for faster dismissal
      });
      navigate('/login');
    });
  };

  const navbarHeight = 48; // Reduced from 64px to save vertical space

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Toaster position="top-center" containerStyle={{ top: navbarHeight + 10 }} /> {/* Adjusted to avoid navbar overlap */}
      <div
        className={cn(
          'hidden xl:block fixed top-0 left-0 h-full bg-complementary text-body shadow-md z-30 transition-all duration-300',
          isSidebarCollapsed ? 'w-[72px]' : 'w-[256px]'
        )}
      >
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={toggleSidebar}
          isMobile={false}
          setMobileMenuOpen={() => {}}
          isOpen={true}
        />
      </div>
      <div className="xl:hidden fixed top-0 left-0 right-0 z-50 bg-complementary text-body shadow-md p-2 flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md p-1"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </Button>
        <h1 className="text-xs font-bold truncate max-w-[150px]">{title}</h1> {/* Smaller text, tighter truncate */}
        <div className="flex items-center space-x-1"> {/* Reduced space-x */}
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            aria-label="Log out"
            className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md p-1"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {mobileMenuOpen && (
        <>
          <div
            className={cn(
              'xl:hidden fixed top-0 left-0 z-50 w-[256px] h-full bg-complementary text-body shadow-md transition-transform duration-300',
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            )}
            style={{ maxHeight: '100vh', overflowY: 'auto' }} // Added max height and scroll
          >
            <Sidebar
              isCollapsed={false}
              toggleCollapse={() => {}}
              isMobile={true}
              setMobileMenuOpen={setMobileMenuOpen}
              isOpen={mobileMenuOpen}
            />
          </div>
          <div
            className="xl:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        </>
      )}
      <main
        className={cn(
          'flex-1 p-3 sm:p-4 md:p-5 xl:p-6 transition-all duration-300 max-w-full overflow-x-hidden', // Reduced mobile padding
          isSidebarCollapsed ? 'xl:ml-[72px]' : 'xl:ml-[256px]'
        )}
        style={{ paddingTop: `${navbarHeight + 10}px` }} // Dynamic padding instead of spacer
      >
        <header className="hidden xl:flex justify-between items-center p-2 sm:p-3 bg-complementary text-body shadow-md rounded-md mb-4">
          <h1 className="text-base sm:text-lg md:text-xl font-bold">{title}</h1>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <span className="text-sm sm:text-base">{user?.name || 'Guest'}</span>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              aria-label="Log out"
              className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md text-xs sm:text-sm py-1 px-2"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
};

export default Layout;