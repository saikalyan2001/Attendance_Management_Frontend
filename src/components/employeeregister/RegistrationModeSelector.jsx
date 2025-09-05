import { Button } from "@/components/ui/button";

const RegistrationModeSelector = ({ setRegistrationMode }) => {
  return (
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
};

export default RegistrationModeSelector;