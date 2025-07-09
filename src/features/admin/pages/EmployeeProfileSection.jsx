import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Edit, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

const EmployeeProfileSection = ({ currentEmployee, isHighlighted, totalYearlyPaidLeaves, openEditDialog, CopyButton }) => {
  const [isPersonalOpen, setIsPersonalOpen] = useState(true);
  const [isBankOpen, setIsBankOpen] = useState(false);

  return (
    <Card 
      className={cn(
        'bg-complementary text-body shadow-lg rounded-xl border border-accent/10 transition-all duration-500',
        isHighlighted && 'border-accent/50 bg-accent/10 animate-pulse',
        'w-full max-w-[92vw] xs:max-w-[90vw] sm:max-w-none mx-auto'
      )}
      role="region"
      aria-labelledby="employee-profile-title"
    >
      <CardHeader className="flex flex-row flex-wrap items-center justify-between px-2 xs:px-3 sm:px-6 py-2 xs:py-3 sm:py-6 gap-1 xs:gap-2">
        <CardTitle id="employee-profile-title" className="text-2xs xs:text-base sm:text-2xl md:text-3xl font-bold flex items-center gap-1 xs:gap-2 sm:gap-3 truncate">
          <div className="flex items-center justify-center w-7 xs:w-8 sm:w-12 h-7 xs:h-8 sm:h-12 rounded-full bg-accent/20 text-accent">
            <User className="h-2.5 xs:h-3 w-3 sm:h-6 sm:w-6" />
          </div>
          <span className="truncate">{currentEmployee.name}'s Profile</span>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openEditDialog(currentEmployee)}
          className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-1.5 xs:px-2 py-0.5 xs:py-1 sm:px-4 sm:py-2 text-2xs xs:text-xs sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
          aria-label={`Edit profile for ${currentEmployee.name}`}
        >
          <Edit className="h-2.5 xs:h-3 w-3 sm:h-5 sm:w-5 mr-0.5 xs:mr-1 sm:mr-2" />
          Edit Profile
        </Button>
      </CardHeader>
      <CardContent className="px-2 xs:px-3 sm:px-6 py-2 xs:py-3 sm:py-6 space-y-3 xs:space-y-4 sm:space-y-6">
        <Collapsible open={isPersonalOpen} onOpenChange={setIsPersonalOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-2xs xs:text-xs sm:text-lg md:text-xl font-semibold text-body hover:text-accent transition-colors">
            Personal Details
            {isPersonalOpen ? <ChevronUp className="h-2.5 xs:h-3 w-3 sm:h-5 sm:w-5" /> : <ChevronDown className="h-2.5 xs:h-3 w-3 sm:h-5 sm:w-5" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 xs:mt-1.5 sm:mt-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 sm:gap-6">
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold">Name</Label>
                <div className="flex items-center mt-0.5 xs:mt-1 sm:mt-2 group">
                  <p className="text-body text-xs xs:text-sm sm:text-base md:text-lg truncate">{currentEmployee.name}</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CopyButton text={currentEmployee.name} fieldId="name" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-complementary text-body border-accent text-2xs xs:text-xs sm:text-base max-w-[75vw] xs:max-w-[85vw] sm:max-w-none" side="top">
                        Copy Name
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold">Employee ID</Label>
                <div className="flex items-center mt-0.5 xs:mt-1 sm:mt-2 group">
                  <p className="text-body text-xs xs:text-sm sm:text-base md:text-lg">{currentEmployee.employeeId}</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CopyButton text={currentEmployee.employeeId} fieldId="employeeId" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-complementary text-body border-accent text-2xs xs:text-xs sm:text-base max-w-[75vw] xs:max-w-[85vw] sm:max-w-none" side="top">
                        Copy Employee ID
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold">Email</Label>
                <div className="flex items-center mt-0.5 xs:mt-1 sm:mt-2 group">
                  <p className="text-body text-xs xs:text-sm sm:text-base md:text-lg truncate">{currentEmployee.email}</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CopyButton text={currentEmployee.email} fieldId="email" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-complementary text-body border-accent text-2xs xs:text-xs sm:text-base max-w-[75vw] xs:max-w-[85vw] sm:max-w-none" side="top">
                        Copy Email
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold">Designation</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">{currentEmployee.designation}</p>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold">Department</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">{currentEmployee.department}</p>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold">Salary</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">₹{currentEmployee.salary.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold">Phone</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">{currentEmployee.phone || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold">Date of Birth</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">
                  {currentEmployee.dob ? format(new Date(currentEmployee.dob), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold">Join Date</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">
                  {currentEmployee.joinDate ? format(new Date(currentEmployee.joinDate), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold">Location</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">{currentEmployee.location?.name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold">Paid Leaves</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">
                  {currentEmployee.paidLeaves?.available || 0} / {totalYearlyPaidLeaves} available
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {currentEmployee.bankDetails && (
          <Collapsible open={isBankOpen} onOpenChange={setIsBankOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-2xs xs:text-xs sm:text-lg md:text-xl font-semibold text-body hover:text-accent transition-colors mt-2 xs:mt-3 sm:mt-6">
              Bank Details
              {isBankOpen ? <ChevronUp className="h-2.5 xs:h-3 w-3 sm:h-5 sm:w-5" /> : <ChevronDown className="h-2.5 xs:h-3 w-3 sm:h-5 sm:w-5" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 xs:mt-1.5 sm:mt-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 xs:gap-4 sm:gap-6">
                <div>
                  <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold">Account Number</Label>
                  <div className="flex items-center mt-0.5 xs:mt-1 sm:mt-2 group">
                    <p className="text-body text-xs xs:text-sm sm:text-base md:text-lg">{currentEmployee.bankDetails.accountNo || 'N/A'}</p>
                    {currentEmployee.bankDetails.accountNo && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CopyButton text={currentEmployee.bankDetails.accountNo} fieldId="accountNo" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-complementary text-body border-accent text-2xs xs:text-xs sm:text-base max-w-[75vw] xs:max-w-[85vw] sm:max-w-none" side="top">
                            Copy Account Number
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold">IFSC Code</Label>
                  <div className="flex items-center mt-0.5 xs:mt-1 sm:mt-2 group">
                    <p className="text-body text-xs xs:text-sm sm:text-base md:text-lg">{currentEmployee.bankDetails.ifscCode || 'N/A'}</p>
                    {currentEmployee.bankDetails.ifscCode && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CopyButton text={currentEmployee.bankDetails.ifscCode} fieldId="ifscCode" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-complementary text-body border-accent text-2xs xs:text-xs sm:text-base max-w-[75vw] xs:max-w-[85vw] sm:max-w-none" side="top">
                            Copy IFSC Code
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold">Bank Name</Label>
                  <div className="flex items-center mt-0.5 xs:mt-1 sm:mt-2 group">
                    <p className="text-body text-xs xs:text-sm sm:text-base md:text-lg">{currentEmployee.bankDetails.bankName || 'N/A'}</p>
                    {currentEmployee.bankDetails.bankName && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CopyButton text={currentEmployee.bankDetails.bankName} fieldId="bankName" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-complementary text-body border-accent text-2xs xs:text-xs sm:text-base max-w-[75vw] xs:max-w-[85vw] sm:max-w-none" side="top">
                            Copy Bank Name
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold">Account Holder</Label>
                  <div className="flex items-center mt-0.5 xs:mt-1 sm:mt-2 group">
                    <p className="text-body text-xs xs:text-sm sm:text-base md:text-lg">{currentEmployee.bankDetails.accountHolder || 'N/A'}</p>
                    {currentEmployee.bankDetails.accountHolder && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CopyButton text={currentEmployee.bankDetails.accountHolder} fieldId="accountHolder" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-complementary text-body border-accent text-2xs xs:text-xs sm:text-base max-w-[75vw] xs:max-w-[85vw] sm:max-w-none" side="top">
                            Copy Account Holder Name
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeProfileSection;