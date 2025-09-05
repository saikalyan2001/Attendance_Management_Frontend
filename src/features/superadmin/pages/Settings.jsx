import { useSelector } from 'react-redux';
import Layout from '../../../components/layout/Layout';
import SettingsForm from '../../../components/settings/SettingsForm';
import { fetchSettings, updateSettings, updateEmployeeLeaves, reset } from '../redux/settingsSlice';

const SuperAdminSettings = () => {
  const settingsSelector = (state) => state.superAdminSettings;

  return (
    <Layout title="Settings" role="super_admin">
      <SettingsForm
        role="super_admin"
        settingsSelector={settingsSelector}
        fetchSettings={fetchSettings}
        updateSettings={updateSettings}
        updateEmployeeLeaves={updateEmployeeLeaves}
        reset={reset}
        employeeCountEndpoint="http://localhost:5000/api/superadmin/employees/count"
      />
    </Layout>
  );
};

export default SuperAdminSettings;