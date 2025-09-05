import { accountSchema } from '../../../components/usercreation/accountSchema';
import { fetchLocations } from '../redux/locationsSlice';
import { createSiteIncharge } from '../../../redux/slices/authSlice';
import AccountForm from '../../../components/usercreation/AccountForm';

const AdminSiteInchargeForm = () => {
  return (
    <AccountForm
      schema={accountSchema('siteincharge')}
      defaultValues={{
        email: '',
        name: '',
        phone: '',
        locations: [],
      }}
      title="Create Site Incharge Account"
      buttonText="Create Site Incharge"
      locationsSelector={(state) => state.adminLocations.locations}
      createAction={createSiteIncharge}
      navigatePath="/admin/dashboard"
      getToastMessage={(data) =>
        `Site Incharge ${data.name} created successfully. A password setup link has been sent to ${data.email}.`
      }
      showRoleField={false}
      fixedRole="siteincharge"
      fetchLocationsAction={fetchLocations}
    />
  );
};

export default AdminSiteInchargeForm;