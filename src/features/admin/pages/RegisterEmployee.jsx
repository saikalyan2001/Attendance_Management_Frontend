import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Layout from "../../../components/layout/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  fetchEmployees,
  registerEmployee,
  registerEmployeesFromExcel,
  reset as resetEmployees,
} from "../redux/employeeSlice";
import {
  fetchLocations,
  reset as resetLocations,
} from "../redux/locationsSlice";
import useEmployeeRegistration from "../../../components/employeeregister/useEmployeeRegistration";
import RegistrationModeSelector from "../../../components/employeeregister/RegistrationModeSelector";
import EmployeeForm from "../../../components/employeeregister/EmployeeForm";
import ExcelImport from "../../../components/employeeregister/ExcelImport";

const RegisterEmployee = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const hookProps = {
    user,
    dispatch,
    navigate,
    employeeSlice: {
      fetchEmployees,
      registerEmployee,
      registerEmployeesFromExcel,
      reset: resetEmployees,
    },
    locationSlice: {
      fetchLocations,
      reset: resetLocations,
    },
    requiredRole: "admin",
    redirectPath: "/admin/employees",
    includeEmailField: true,
  };

  const {
    form,
    documentFields,
    appendDocument,
    handleRemoveDocument,
    dragStates,
    previews,
    setPreview,
    handleDragOver,
    handleDragLeave,
    handleDrop,
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
    serverError,
    isSubmitting,
    employeesLoading,
    locationsLoading,
    locations,
    registrationMode,
    setRegistrationMode,
    formRef,
    documentsSectionRef,
    excelSectionRef,
  } = useEmployeeRegistration(hookProps);

  return (
    <Layout title="Register Employee">
      <Card className="bg-complementary text-body max-w-full sm:max-w-3xl xl:max-w-4xl mx-auto shadow-lg rounded-lg border border-accent/10 animate-fade-in">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold text-center">
            Register Employee
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6">
          {locationsLoading ? (
            <div className="text-center text-body/80 text-sm sm:text-base">
              Loading locations...
            </div>
          ) : !registrationMode ? (
            <RegistrationModeSelector setRegistrationMode={setRegistrationMode} />
          ) : registrationMode === "single" ? (
            <EmployeeForm
              form={form}
              locations={locations}
              employeesLoading={employeesLoading}
              locationsLoading={locationsLoading}
              isSubmitting={isSubmitting}
              serverError={serverError}
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
              setRegistrationMode={setRegistrationMode}
              documentsSectionRef={documentsSectionRef}
              includeEmailField={hookProps.includeEmailField}
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
              setRegistrationMode={setRegistrationMode}
              excelSectionRef={excelSectionRef}
              employeesLoading={employeesLoading}
              locationsLoading={locationsLoading}
              isSubmitting={isSubmitting}
            />
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default RegisterEmployee;