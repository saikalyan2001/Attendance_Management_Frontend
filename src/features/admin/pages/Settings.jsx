import { useSelector } from 'react-redux';
import Layout from '../../../components/layout/Layout';
import SettingsForm from '../../../components/settings/SettingsForm';
import { 
  fetchSettings, 
  updateSettings, 
  updateEmployeeLeaves, 
  fetchLocations, 
  reset 
} from '../redux/settingsSlice';

const AdminSettings = () => {
  const settingsSelector = (state) => state.adminSettings;
  
  return (
    <Layout title="Settings">
      <SettingsForm
        role="admin"
        settingsSelector={settingsSelector}
        fetchSettings={fetchSettings}
        updateSettings={updateSettings}
        updateEmployeeLeaves={updateEmployeeLeaves}
        fetchLocations={fetchLocations} // Added fetchLocations prop
        reset={reset}
        employeeCountEndpoint="http://localhost:5000/api/admin/employees/count"
      />
    </Layout>
  );
};

export default AdminSettings;
