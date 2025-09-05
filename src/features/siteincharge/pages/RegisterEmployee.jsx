import { useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Layout from '../../../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import RegistrationModeSelector from '../../../components/employeeregister/RegistrationModeSelector';
import EmployeeForm from '../../../components/employeeregister/EmployeeForm';
import ExcelImport from '../../../components/employeeregister/ExcelImport';
import useEmployeeRegistration from '../../../components/employeeregister/useEmployeeRegistration';
import { registerEmployee, importEmployees, reset } from '../redux/employeeSlice';

const SiteInchargeRegisterEmployee = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, loading: authLoading } = useSelector((state) => state.auth);
  const locationId = user?.locations?.[0]?._id;
  const documentsSectionRef = useRef(null);

  // Debug: Log navigate, user, and location
  console.log('navigate in SiteInchargeRegisterEmployee:', navigate);
  console.log('user in SiteInchargeRegisterEmployee:', user);
  console.log('SiteInchargeRegisterEmployee render: locationId=', locationId, 'locationName=', user?.locations?.[0]?.name);

  // Redirect to login if user is not authenticated
  if (!user || !locationId) {
    console.log('Redirecting to login: user or locationId missing');
    navigate('/login');
    return null;
  }

  const {
    registrationMode,
    setRegistrationMode,
    form,
    documentFields,
    appendDocument,
    handleRemoveDocument,
    dragStates,
    previews,
    setPreview,
    excelFile,
    setExcelFile,
    excelDragState,
    handleExcelDragOver,
    handleExcelDragLeave,
    handleExcelDrop,
    handleExcelFileChange,
    handleRemoveExcel,
    handleExcelSubmit,
    handleSaveClick,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    serverError,
    isSubmitting,
    employeesLoading,
    locationsLoading,
    locations,
  } = useEmployeeRegistration({
    user,
    dispatch,
    navigate,
    employeeSlice: { registerEmployee, importEmployees, reset },
    requiredRole: 'siteincharge',
    redirectPath: '/siteincharge/employees',
    includeEmailField: true,
    defaultLocationId: locationId,
    validateExcelFile: async (file, user) => {
      try {
        if (file.size > 5 * 1024 * 1024) {
          return { isValid: false, error: 'File size exceeds 5MB limit' };
        }
        const arrayBuffer = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(new Error('Failed to read file'));
          reader.readAsArrayBuffer(file);
        });
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(arrayBuffer, { type: 'array', raw: false, dateNF: 'yyyy-mm-dd' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const headers = jsonData[0].map((h) => h.toString().trim());
        const requiredHeaders = [
          'employeeId',
          'name',
          'email',
          'designation',
          'department',
          'salary',
          'phone',
          'joinDate',
          'accountNo',
          'ifscCode',
          'bankName',
          'accountHolder',
          'locationName',
        ];
        const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
        if (missingHeaders.length > 0) {
          return { isValid: false, error: `Missing required headers: ${missingHeaders.join(', ')}` };
        }

        const rows = jsonData.slice(1).filter((row) => row.some((cell) => cell !== undefined && cell !== ''));
        const errors = [];
        const userLocations = user?.locations || [];
        const validLocationNames = userLocations.map(loc => loc.name.toLowerCase());

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowData = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index] !== undefined ? row[index] : null;
          });
          const rowNumber = i + 2;

          if (!rowData.locationName || !validLocationNames.includes(rowData.locationName.toLowerCase())) {
            errors.push(`Row ${rowNumber}: Invalid or missing location name`);
            continue;
          }

          let parsedJoinDate;
          if (typeof rowData.joinDate === 'number') {
            const dateObj = XLSX.SSF.parse_date_code(rowData.joinDate);
            parsedJoinDate = new Date(dateObj.y, dateObj.m - 1, dateObj.d);
          } else {
            parsedJoinDate = new Date(rowData.joinDate);
          }

          if (isNaN(parsedJoinDate) || parsedJoinDate > new Date()) {
            errors.push(`Row ${rowNumber}: Invalid or future join date`);
            continue;
          }

          if (!rowData.employeeId || !/^[A-Z0-9-]+$/.test(rowData.employeeId)) {
            errors.push(`Row ${rowNumber}: Invalid or missing employee ID`);
          }
          if (!rowData.name || !/^[a-zA-Z\s]+$/.test(rowData.name)) {
            errors.push(`Row ${rowNumber}: Invalid or missing name`);
          }
          if (!rowData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rowData.email)) {
            errors.push(`Row ${rowNumber}: Invalid or missing email`);
          }
          if (!rowData.phone || !/^\d{10,15}$/.test(rowData.phone)) {
            errors.push(`Row ${rowNumber}: Invalid or missing phone number`);
          }
          const parsedSalary = Number(rowData.salary);
          if (isNaN(parsedSalary) || parsedSalary < 1000 || parsedSalary > 10000000) {
            errors.push(`Row ${rowNumber}: Invalid salary`);
          }
          if (!rowData.designation || typeof rowData.designation !== 'string') {
            errors.push(`Row ${rowNumber}: Invalid or missing designation`);
          }
          if (!rowData.department || typeof rowData.department !== 'string') {
            errors.push(`Row ${rowNumber}: Invalid or missing department`);
          }
          if (!rowData.accountNo || !rowData.ifscCode || !rowData.bankName || !rowData.accountHolder) {
            errors.push(`Row ${rowNumber}: Missing bank details`);
          }
        }

        if (errors.length > 0) {
          return { isValid: false, error: errors.join('; ') };
        }
        return { isValid: true };
      } catch (error) {
        console.error('Excel validation error:', error);
        return { isValid: false, error: `Failed to validate Excel file: ${error.message}` };
      }
    },
  });

  return (
    <Layout title="Register Employee" role="siteincharge">
      <Card className="bg-complementary text-body max-w-full sm:max-w-3xl xl:max-w-4xl mx-auto shadow-lg rounded-lg border border-accent/10 animate-fade-in">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold text-center">
            Register Employee
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6">
          {!registrationMode ? (
            <RegistrationModeSelector
              setRegistrationMode={setRegistrationMode}
              disabled={authLoading || !locationId || isSubmitting}
            />
          ) : registrationMode === 'single' ? (
            <EmployeeForm
              form={form}
              documentFields={documentFields}
              appendDocument={appendDocument}
              handleRemoveDocument={handleRemoveDocument}
              dragStates={dragStates}
              previews={previews}
              setPreview={setPreview}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
              handleSaveClick={handleSaveClick}
              serverError={serverError}
              isSubmitting={isSubmitting}
              employeesLoading={isSubmitting}
              locationsLoading={locationsLoading}
              locations={locations || []}
              setRegistrationMode={setRegistrationMode}
              documentsSectionRef={documentsSectionRef}
              includeEmailField={true}
              showLocationField={true}
              disableLocationField={true}
              locationName={user?.locations?.[0]?.name || 'No location'}
            />
          ) : (
            <ExcelImport
              excelFile={excelFile}
              setExcelFile={setExcelFile}
              excelDragState={excelDragState}
              handleExcelDragOver={handleExcelDragOver}
              handleExcelDragLeave={handleExcelDragLeave}
              handleExcelDrop={handleExcelDrop}
              handleExcelFileChange={handleExcelFileChange}
              handleRemoveExcel={handleRemoveExcel}
              handleExcelSubmit={handleExcelSubmit}
              disabled={authLoading || !locationId || isSubmitting}
              setRegistrationMode={setRegistrationMode}
            />
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default SiteInchargeRegisterEmployee;