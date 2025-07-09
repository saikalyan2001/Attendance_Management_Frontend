import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../redux/slices/authSlice';
import AdminSidebar from '../../features/admin/components/Sidebar';
import SiteInchargeSidebar from '../../features/siteincharge/components/Sidebar';
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
  
  const Sidebar = role === 'siteincharge' ? SiteInchargeSidebar : AdminSidebar;

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleLogout = () => {
    dispatch(logout()).then(() => {
      toast.success('Logged out successfully', {
        id: 'logout-success', // Unique ID
        position: 'top-center',
        duration: 5000,
      });
      navigate('/login');
    });
  };

  const navbarHeight = 64;

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Toaster position="top-center" />
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
      <div className="xl:hidden fixed top-0 left-0 right-0 z-50 bg-complementary text-body shadow-md p-3 flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md p-1.5"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </Button>
        <h1 className="text-sm font-bold truncate">{title}</h1>
        <div className="flex items-center space-x-1.5">
          <span className="text-xs truncate max-w-[100px]">{user?.name || 'Guest'}</span>
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            aria-label="Log out"
            className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md p-1.5"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {mobileMenuOpen && (
        <>
          <div className="xl:hidden fixed top-0 left-0 z-50">
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
          'flex-1 p-4 sm:p-5 md:p-6 xl:p-8 transition-all duration-300 max-w-full overflow-x-hidden',
          isSidebarCollapsed ? 'xl:ml-[72px]' : 'xl:ml-[256px]'
        )}
      >
        <div className="xl:hidden" style={{ height: `${navbarHeight}px` }} />
        <header className="hidden xl:flex justify-between items-center p-3 sm:p-4 bg-complementary text-body shadow-md rounded-md mb-4 sm:mb-5 md:mb-6">
          <h1 className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">{title}</h1>
          <div className="flex items-center space-x-3 sm:space-x-4">
            <span className="text-sm sm:text-base md:text-lg">{user?.name || 'Guest'}</span>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              aria-label="Log out"
              className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md text-[10px] sm:text-sm md:text-base xl:text-lg py-1 sm:py-1.5 px-2 sm:px-3"
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