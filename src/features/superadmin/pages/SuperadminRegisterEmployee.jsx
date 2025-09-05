import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Layout from "../../../components/layout/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useEmployeeRegistration from "../../../components/employeeregister/useEmployeeRegistration";
import EmployeeForm from "../../../components/employeeregister/EmployeeForm";
import ExcelImport from "../../../components/employeeregister/ExcelImport";
import {
  fetchEmployees,
  registerEmployee,
  registerEmployeesFromExcel,
  reset as resetEmployees,
} from "../redux/superadminEmployeeSlice";
import {
  fetchLocations,
  reset as resetLocations,
} from "../redux/locationsSlice";

const SuperadminRegisterEmployee = () => {
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
    requiredRole: "super_admin",
    redirectPath: "/superadmin/employees",
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

  const renderSelectionScreen = () => (
    <div className="flex flex-col items-center space-y-6">
      <h3 className="text-lg sm:text-xl xl:text-2xl font-semibold text-body">
        Choose Registration Method
      </h3>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Button
          onClick={() => setRegistrationMode("single")}
          className="bg-accent text-body hover:bg-accent-hover rounded-lg text-sm sm:text-base xl:text-lg py-3 sm:py-4 px-6 sm:px-8 flex-1 transition-all duration-300 hover:shadow-lg"
        >
          Register Single Employee
        </Button>
        <Button
          onClick={() => setRegistrationMode("excel")}
          className="bg-accent text-body hover:bg-accent-hover rounded-lg text-sm sm:text-base xl:text-lg py-3 sm:py-4 px-6 sm:px-8 flex-1 transition-all duration-300 hover:shadow-lg"
        >
          Import Employees from Excel
        </Button>
      </div>
    </div>
  );

  return (
    <Layout title="Register Employee (Superadmin)">
      <Card className="bg-complementary text-body max-w-full sm:max-w-3xl xl:max-w-4xl mx-auto shadow-lg rounded-lg border border-accent/10 animate-fade-in">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold text-center">
            Register Employee (Superadmin)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6">
          {!registrationMode ? (
            renderSelectionScreen()
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

export default SuperadminRegisterEmployee;
