import { accountSchema } from '../../../components/usercreation/accountSchema';
import { fetchLocations } from '../redux/locationsSlice';
import { createUserBySuperAdmin } from '../../../redux/slices/authSlice';
import AccountForm from '../../../components/usercreation/AccountForm';
import toast from 'react-hot-toast';

const SuperAdminAccountForm = () => {
  return (
    <AccountForm
      schema={accountSchema()}
      defaultValues={{
        email: '',
        name: '',
        phone: '',
        role: 'admin',
        locations: [],
      }}
      title="Create New Account"
      buttonText="Create Account"
      locationsSelector={(state) => state.superAdminLocations.locations}
      createAction={createUserBySuperAdmin}
      navigatePath="/superadmin/users"
      getToastMessage={(data) => {
        const roleDisplay = data.role === 'admin' ? 'Admin' : 'Site Incharge';
        return `${roleDisplay} account created successfully! ${data.name} will receive a password setup email at ${data.email}.`;
      }}
      showRoleField={true}
      handleError={(error) => {
        if (error.includes('Forbidden: Insufficient role')) {
          toast.error('You don\'t have permission to perform this action. Please contact your administrator for assistance.');
        } else if (error.includes('Network Error') || error.includes('timeout')) {
          toast.error('Connection problem. Please check your internet connection and try again.');
        } else if (error.includes('500') || error.includes('Server Error')) {
          toast.error('Server is currently unavailable. Please try again in a few minutes.');
        } else {
          toast.error(error || 'Unable to create account. Please try again or contact support if the problem persists.');
        }
      }}
      locationsLabelFn={(role) => `Locations ${role === 'siteincharge' ? '*' : '(Not applicable for Admin)'}`}
      fetchLocationsAction={fetchLocations}
    />
  );
};

export default SuperAdminAccountForm;
