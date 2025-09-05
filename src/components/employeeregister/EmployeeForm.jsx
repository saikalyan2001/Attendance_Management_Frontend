import { useEffect } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import DocumentUpload from "./DocumentUpload";

const EmployeeForm = ({
  form,
  locations = [], // Default to empty array
  employeesLoading,
  locationsLoading,
  isSubmitting,
  serverError,
  documentFields,
  appendDocument,
  handleRemoveDocument,
  dragStates,
  previews,
  setPreview,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleSaveClick,
  setRegistrationMode,
  documentsSectionRef,
  includeEmailField,
  showLocationField = true, // Default to true for admin and super_admin
  disableLocationField = false, // Default to false, true for siteincharge
  locationName = "No location", // Default location name
}) => {

  return (
    <Form {...form}>
      <form className="space-y-6 sm:space-y-8">
        <div>
          <h3 className="text-sm sm:text-base xl:text-lg font-semibold mb-3 sm:mb-4 text-body">
            {includeEmailField ? "Personal Information" : "Identification"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Employee ID *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., EMP003"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.employeeId ||
                      form.formState.errors.employeeId?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Name *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Alice Johnson"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.name || form.formState.errors.name?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            {includeEmailField && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                      Email *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                        placeholder="e.g., alice@example.com"
                        className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                        disabled={employeesLoading || locationsLoading || isSubmitting}
                      />
                    </FormControl>
                    <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                      {serverError?.fields?.email ||
                        form.formState.errors.email?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Designation *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Analyst"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.designation ||
                      form.formState.errors.designation?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Department *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Finance"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.department ||
                      form.formState.errors.department?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            {showLocationField && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                      Location *
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={
                        employeesLoading ||
                        locationsLoading ||
                        disableLocationField ||
                        locations.length === 0 ||
                        isSubmitting
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg">
                          <SelectValue
                            placeholder={
                              disableLocationField
                                ? locationName
                                : locations.length === 0
                                ? "No locations available"
                                : "Select location"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-complementary text-body">
                        {locations.length > 0 ? (
                          locations.map((loc) => (
                            <SelectItem
                              key={loc._id}
                              value={loc._id}
                              className="text-[10px] sm:text-sm xl:text-base"
                            >
                              {loc.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem
                            value=""
                            disabled
                            className="text-[10px] sm:text-sm xl:text-base"
                          >
                            No locations available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {locations.length === 0 && !locationsLoading && !disableLocationField && (
                      <p className="text-error text-[9px] sm:text-xs xl:text-base mt-1">
                        No locations available. Please add a location in the Locations page.
                      </p>
                    )}
                    <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                      {serverError?.fields?.location ||
                        form.formState.errors.location?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="salary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Salary (₹/year) *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      placeholder="e.g., 55000"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.salary ||
                      form.formState.errors.salary?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="joinDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Join Date *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.joinDate ||
                      form.formState.errors.joinDate?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Phone *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., 1234567890"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.phone ||
                      form.formState.errors.phone?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
          </div>
        </div>
        <div>
          <h3 className="text-sm sm:text-base xl:text-lg font-semibold mb-3 sm:mb-4 text-body">
            Bank Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField
              control={form.control}
              name="bankDetails.accountNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Account Number *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., 123456789012"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.["bankDetails.accountNo"] ||
                      form.formState.errors.bankDetails?.accountNo?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankDetails.ifscCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    IFSC Code *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., SBIN0001234"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.["bankDetails.ifscCode"] ||
                      form.formState.errors.bankDetails?.ifscCode?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankDetails.bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Bank Name *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., State Bank of India"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.["bankDetails.bankName"] ||
                      form.formState.errors.bankDetails?.bankName?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankDetails.accountHolder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Account Holder Name *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Alice Johnson"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.["bankDetails.accountHolder"] ||
                      form.formState.errors.bankDetails?.accountHolder?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
          </div>
        </div>
        <div ref={documentsSectionRef}>
          <h3 className="text-sm sm:text-base xl:text-lg font-semibold mb-3 sm:mb-4 text-body">
            Employee Documents
          </h3>
          {documentFields.map((field, index) => (
            <FormField
              key={field.id}
              control={form.control}
              name={`documents[${index}].file`}
              render={({ field: formField }) => (
                <DocumentUpload
                  index={index}
                  form={form}
                  serverError={serverError}
                  fieldProps={field}
                  onChange={formField.onChange}
                  value={formField.value}
                  dragState={dragStates[index]}
                  preview={previews[index]}
                  setPreview={setPreview}
                  handleDragOver={handleDragOver}
                  handleDragLeave={handleDragLeave}
                  handleDrop={handleDrop}
                  handleRemoveDocument={handleRemoveDocument}
                  employeesLoading={employeesLoading}
                  locationsLoading={locationsLoading}
                  isSubmitting={isSubmitting}
                />
              )}
            />
          ))}
          <Button
            type="button"
            onClick={appendDocument}
            className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md"
            disabled={employeesLoading || locationsLoading || isSubmitting}
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Add Document
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setRegistrationMode(null)}
            className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] w-full sm:w-auto transition-all duration-300 hover:shadow-md"
            disabled={employeesLoading || locationsLoading || isSubmitting}
            aria-label="Back"
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={handleSaveClick}
            className={cn(
              "bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] w-full sm:w-auto transition-all duration-300 hover:shadow-md",
              isSubmitting && "animate-scale-in"
            )}
            disabled={employeesLoading || locationsLoading || isSubmitting}
            aria-label="Register Employee"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Register Employee"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default EmployeeForm;