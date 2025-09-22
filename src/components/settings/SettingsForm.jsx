import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Calendar, 
  Info, 
  ChevronDown, 
  ChevronRight,
  Settings,
  MapPin,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

// Keep your existing schemas and helper functions...
const getExampleWorkingDays = (year, month, policy) => {
  if (!policy || !policy.policyType) return 'N/A';
  
  const daysInMonth = new Date(year, month, 0).getDate();
  
  switch (policy.policyType) {
    case 'all_days':
      return `${daysInMonth} days`;
    case 'custom_fixed':
      return `${Math.min(policy.fixedWorkingDays || 30, daysInMonth)} days`;
    case 'exclude_sundays':
    case 'exclude_weekends':
      let workingDays = 0;
      const excludeDays = policy.policyType === 'exclude_sundays' ? [0] : [0, 6];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        if (!excludeDays.includes(dayOfWeek)) {
          workingDays++;
        }
      }
      return `${workingDays} days`;
    default:
      return 'N/A';
  }
};

// Your existing schemas remain the same...
const locationLeaveSettingSchema = z.object({
  location: z.string().min(1, 'Please select a location'),
  paidLeavesPerYear: z
    .preprocess(
      (value) => {
        if (value === '' || value == null) return undefined;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? undefined : parsed;
      },
      z
        .number({
          required_error: 'Please enter a valid number for paid leaves per year',
          invalid_type_error: 'Please enter a valid number for paid leaves per year',
        })
        .int()
        .min(12, 'Paid leaves per year must be at least 12 days')
        .max(360, 'Paid leaves per year cannot exceed 360 days')
    ),
});

const workingDayPolicySchema = z.object({
  policyName: z.string().min(1, 'Policy name is required'),
  policyType: z.enum(['all_days', 'exclude_sundays', 'exclude_weekends', 'custom_fixed']),
  fixedWorkingDays: z
    .preprocess(
      (value) => {
        if (value === '' || value == null) return undefined;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? undefined : parsed;
      },
      z.number().int().min(20).max(31)
    )
    .optional(),
  excludeDays: z.array(z.number().min(0).max(6)).optional(),
  locations: z.array(z.string()).min(1, 'At least one location is required'),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

const holidaySchema = z.object({
  name: z.string().min(1, 'Holiday name is required'),
  date: z.preprocess((val) => {
    if (typeof val === 'string') return new Date(val);
    return val;
  }, z.date()),
  locations: z.array(z.string()).min(1, 'At least one location is required'),
  isRecurring: z.boolean().optional(),
  recurringType: z.enum(['yearly', 'monthly']).optional(),
  description: z.string().optional(),
});

const formSchema = z.object({
  paidLeavesPerYear: z
    .preprocess(
      (value) => {
        if (value === '' || value == null) return undefined;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? undefined : parsed;
      },
      z
        .number({
          required_error: 'Please enter a valid number for paid leaves per year',
          invalid_type_error: 'Please enter a valid number for paid leaves per year',
        })
        .int()
        .min(12, 'Paid leaves per year must be at least 12 days')
        .max(360, 'Paid leaves per year cannot exceed 360 days')
    )
    .optional(),
  locationLeaveSettings: z.array(locationLeaveSettingSchema).optional(),
  workingDayPolicies: z.array(workingDayPolicySchema).optional(),
  holidays: z.array(holidaySchema).optional(),
  updatePaidLeavesPerYear: z.boolean().optional(),
  updateLocationLeaveSettings: z.boolean().optional(),
  updateWorkingDayPolicies: z.boolean().optional(),
  updateHolidays: z.boolean().optional(),
  defaultWorkingDayPolicy: z.enum(['all_days', 'exclude_sundays', 'exclude_weekends', 'custom_fixed']).optional(),
  defaultFixedWorkingDays: z
    .preprocess(
      (value) => {
        if (value === '' || value == null) return undefined;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? undefined : parsed;
      },
      z.number().int().min(20).max(31)
    )
    .optional(),
  updateDefaultWorkingDays: z.boolean().optional(),
  halfDayDeduction: z
    .preprocess(
      (value) => {
        if (value === '' || value == null) return undefined;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? undefined : parsed;
      },
      z
        .number({
          required_error: 'Please enter a valid number for half-day deduction',
          invalid_type_error: 'Please enter a valid number for half-day deduction',
        })
        .min(0, 'Half-day deduction must be between 0 and 1')
        .max(1, 'Half-day deduction must be between 0 and 1')
    )
    .optional(),
  highlightDuration: z
    .preprocess(
      (value) => {
        if (value === '' || value == null) return undefined;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? undefined : parsed;
      },
      z
        .number({
          required_error: 'Please enter a valid number for highlight duration',
          invalid_type_error: 'Please enter a valid number for highlight duration',
        })
        .min(0.0167, 'Highlight duration must be at least 1 minute')
        .max(168, 'Highlight duration cannot exceed 7 days')
    )
    .optional(),
  updateHalfDayDeduction: z.boolean().optional(),
  updateHighlightDuration: z.boolean().optional(),
  applyLeaveChanges: z.boolean().optional(),
});

// Enhanced Settings Form Component
const SettingsForm = ({ 
  role, 
  settingsSelector, 
  fetchSettings, 
  updateSettings, 
  updateEmployeeLeaves, 
  fetchLocations,
  reset, 
  employeeCountEndpoint 
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { 
    settings, 
    locations, 
    loadingFetch, 
    loadingUpdate, 
    loadingLeaves, 
    loadingLocations,
    error, 
    successUpdate, 
    successLeaves 
  } = useSelector(settingsSelector);
  const { user } = useSelector((state) => state.auth);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [useLocationSettings, setUseLocationSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('leaves');
  const [expandedSections, setExpandedSections] = useState({
    workingDays: false,
    holidays: false,
    advanced: false
  });
  const formRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paidLeavesPerYear: 24,
      locationLeaveSettings: [],
      workingDayPolicies: [],
      holidays: [],
      updatePaidLeavesPerYear: false,
      updateLocationLeaveSettings: false,
      updateWorkingDayPolicies: false,
      updateHolidays: false,
      defaultWorkingDayPolicy: 'all_days',
      defaultFixedWorkingDays: 30,
      updateDefaultWorkingDays: false,
      halfDayDeduction: 0.5,
      updateHalfDayDeduction: false,
      highlightDuration: 24,
      updateHighlightDuration: false,
      applyLeaveChanges: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "locationLeaveSettings",
  });

  const { 
    fields: policyFields, 
    append: appendPolicy, 
    remove: removePolicy 
  } = useFieldArray({
    control: form.control,
    name: "workingDayPolicies",
  });

  const { 
    fields: holidayFields, 
    append: appendHoliday, 
    remove: removeHoliday 
  } = useFieldArray({
    control: form.control,
    name: "holidays",
  });

  const watchedCheckboxes = form.watch([
    'updatePaidLeavesPerYear',
    'updateLocationLeaveSettings',
    'updateWorkingDayPolicies',
    'updateHolidays',
    'updateDefaultWorkingDays',
    'updateHalfDayDeduction',
    'updateHighlightDuration',
  ]);

  const selectedCount = watchedCheckboxes.filter(Boolean).length;

  // Keep your existing useEffect hooks...
  useEffect(() => {
    if (!user || user.role !== role) {
      navigate('/login');
    }
    dispatch(fetchSettings());
    dispatch(fetchLocations());
  }, [dispatch, user, navigate, fetchSettings, fetchLocations, role]);

  useEffect(() => {
    if (settings && locations) {
      const hasLocationSettings = settings.locationLeaveSettings && settings.locationLeaveSettings.length > 0;
      setUseLocationSettings(hasLocationSettings);
      
      form.reset({
        paidLeavesPerYear: settings.paidLeavesPerYear || 24,
        locationLeaveSettings: hasLocationSettings ? settings.locationLeaveSettings.map(setting => ({
          location: setting.location._id,
          paidLeavesPerYear: setting.paidLeavesPerYear,
        })) : [],
        workingDayPolicies: settings.workingDayPolicies ? settings.workingDayPolicies.map(policy => ({
          policyName: policy.policyName,
          policyType: policy.policyType,
          fixedWorkingDays: policy.fixedWorkingDays || 30,
          excludeDays: policy.excludeDays || [],
          locations: policy.locations.map(loc => loc._id),
          description: policy.description || '',
          isDefault: policy.isDefault || false,
        })) : [],
        holidays: settings.holidays ? settings.holidays.map(holiday => ({
          name: holiday.name,
          date: new Date(holiday.date),
          locations: holiday.locations.map(loc => loc._id),
          isRecurring: holiday.isRecurring || false,
          recurringType: holiday.recurringType || 'yearly',
          description: holiday.description || '',
        })) : [],
        updatePaidLeavesPerYear: false,
        updateLocationLeaveSettings: false,
        updateWorkingDayPolicies: false,
        updateHolidays: false,
        defaultWorkingDayPolicy: settings.defaultWorkingDayPolicy || 'all_days',
        defaultFixedWorkingDays: settings.defaultFixedWorkingDays || 30,
        updateDefaultWorkingDays: false,
        halfDayDeduction: settings.halfDayDeduction,
        updateHalfDayDeduction: false,
        highlightDuration: settings.highlightDuration / (60 * 60 * 1000),
        updateHighlightDuration: false,
        applyLeaveChanges: false,
      });
    }
  }, [settings, locations, form]);

  // Enhanced helper functions
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const addLocationSetting = () => {
    append({ location: '', paidLeavesPerYear: 24 });
  };

  const removeLocationSetting = (index) => {
    remove(index);
  };

  const toggleLocationSettings = () => {
    setUseLocationSettings(!useLocationSettings);
    if (!useLocationSettings) {
      const locationSettings = locations.map(location => ({
        location: location._id,
        paidLeavesPerYear: settings?.paidLeavesPerYear || 24,
      }));
      form.setValue('locationLeaveSettings', locationSettings);
    } else {
      form.setValue('locationLeaveSettings', []);
    }
  };

  // Keep your existing form submission logic...
  const handleUpdateClick = async () => {
    try {
      const fieldsToUpdate = [
        { name: 'paidLeavesPerYear', checkbox: 'updatePaidLeavesPerYear' },
        { name: 'locationLeaveSettings', checkbox: 'updateLocationLeaveSettings' },
        { name: 'workingDayPolicies', checkbox: 'updateWorkingDayPolicies' },
        { name: 'holidays', checkbox: 'updateHolidays' },
        { name: 'defaultWorkingDays', checkbox: 'updateDefaultWorkingDays' },
        { name: 'halfDayDeduction', checkbox: 'updateHalfDayDeduction' },
        { name: 'highlightDuration', checkbox: 'updateHighlightDuration' },
      ].filter(field => form.getValues(field.checkbox));

      if (fieldsToUpdate.length === 0) {
        toast.error('Select at least one setting to update by checking the boxes above', {
          id: 'no-selection-error',
          duration: 5000,
          position: 'top-center',
        });
        return;
      }

      const isValid = await form.trigger();
      if (!isValid) {
        const errors = Object.entries(form.formState.errors).map(([field, error]) => ({
          field,
          message: error.message,
        }));

        const firstError = errors[0];
        if (firstError) {
          toast.error(firstError.message, {
            id: `settings-validation-error-${firstError.field}`,
            duration: 5000,
            position: 'top-center',
          });
        }
        return;
      }

      const needsEmployeeUpdate = (form.getValues('updatePaidLeavesPerYear') || 
                                 form.getValues('updateLocationLeaveSettings')) && 
                                form.getValues('applyLeaveChanges');

      if (needsEmployeeUpdate) {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No token found in localStorage');
        }

        const response = await fetch(employeeCountEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch employee count');
        }

        setEmployeeCount(data.count || 0);
        setIsDialogOpen(true);
      } else {
        await submitFields(fieldsToUpdate);
      }
    } catch (error) {
      const userFriendlyErrorMessage = error.message === 'No token found in localStorage'
        ? 'Your session has expired. Please log in again.'
        : 'Could not update settings. Please check your connection and try again.';
      
      toast.error(userFriendlyErrorMessage, {
        id: 'submit-error',
        duration: 5000,
        position: 'top-center',
      });
    }
  };

  const submitFields = (fieldsToUpdate) => {
    const data = form.getValues();
    const submissionData = {};

    fieldsToUpdate.forEach(field => {
      if (field.name === 'paidLeavesPerYear' && !useLocationSettings) {
        submissionData.paidLeavesPerYear = parseInt(data.paidLeavesPerYear, 10);
      } else if (field.name === 'locationLeaveSettings' && useLocationSettings) {
        submissionData.locationLeaveSettings = data.locationLeaveSettings.map(setting => ({
          location: setting.location,
          paidLeavesPerYear: parseInt(setting.paidLeavesPerYear, 10),
        }));
      } else if (field.name === 'workingDayPolicies') {
        submissionData.workingDayPolicies = data.workingDayPolicies.map(policy => ({
          policyName: policy.policyName,
          policyType: policy.policyType,
          fixedWorkingDays: policy.policyType === 'custom_fixed' ? parseInt(policy.fixedWorkingDays, 10) : undefined,
          excludeDays: policy.excludeDays || [],
          locations: policy.locations,
          description: policy.description,
          isDefault: policy.isDefault || false,
        }));
      } else if (field.name === 'holidays') {
        submissionData.holidays = data.holidays.map(holiday => ({
          name: holiday.name,
          date: holiday.date,
          locations: holiday.locations,
          isRecurring: holiday.isRecurring || false,
          recurringType: holiday.recurringType || 'yearly',
          description: holiday.description,
        }));
      } else if (field.name === 'defaultWorkingDays') {
        submissionData.defaultWorkingDayPolicy = data.defaultWorkingDayPolicy;
        submissionData.defaultFixedWorkingDays = parseInt(data.defaultFixedWorkingDays, 10);
      } else if (field.name === 'halfDayDeduction') {
        submissionData.halfDayDeduction = parseFloat(data.halfDayDeduction);
      } else if (field.name === 'highlightDuration') {
        submissionData.highlightDuration = parseFloat(data.highlightDuration) * 60 * 60 * 1000;
      }
    });

    dispatch(updateSettings(submissionData));
  };

  if (loadingFetch || loadingLocations) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="bg-complementary text-body shadow-sm">
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-body flex items-center gap-2">
            <Settings className="h-6 w-6" />
            System Settings
          </h1>
          <p className="text-body/60 mt-1">
            Configure system-wide settings for employee management
          </p>
        </div>
        
        {/* Status Overview */}
        <div className="flex items-center gap-2">
          <Badge variant={selectedCount > 0 ? "default" : "secondary"} className="px-3 py-1">
            {selectedCount} setting{selectedCount !== 1 ? 's' : ''} selected
          </Badge>
          {(loadingUpdate || loadingLeaves) && (
            <div className="flex items-center gap-2 text-sm text-body/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Card className="bg-complementary text-body shadow-sm animate-fade-in">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-accent/10">
              <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-transparent">
                <TabsTrigger value="leaves" className="flex items-center gap-2 py-3">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Leave Settings</span>
                  <span className="sm:hidden">Leaves</span>
                </TabsTrigger>
                <TabsTrigger value="workingdays" className="flex items-center gap-2 py-3">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Working Days</span>
                  <span className="sm:hidden">Days</span>
                </TabsTrigger>
                <TabsTrigger value="holidays" className="flex items-center gap-2 py-3">
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Holidays</span>
                  <span className="sm:hidden">Holidays</span>
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center gap-2 py-3">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Advanced</span>
                  <span className="sm:hidden">More</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <Form {...form}>
              <form ref={formRef} className="p-6 space-y-6">
                {/* Leave Settings Tab */}
                <TabsContent value="leaves" className="mt-0 space-y-6">
                  <div className="space-y-6">
                    {/* Location Settings Toggle */}
                    <Card className="border border-accent/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <MapPin className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <CardTitle className="text-base">Leave Configuration</CardTitle>
                              <p className="text-sm text-body/60">Choose between global or location-specific settings</p>
                            </div>
                          </div>
                          <Switch
                            checked={useLocationSettings}
                            onCheckedChange={toggleLocationSettings}
                            disabled={loadingUpdate}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-body/70">
                          {useLocationSettings 
                            ? "Different leave allocations will be set for each location"
                            : "Same leave allocation will apply to all locations"
                          }
                        </p>
                      </CardContent>
                    </Card>

                    {/* Leave Settings Content */}
                    {useLocationSettings ? (
                      <FormField
                        control={form.control}
                        name="updateLocationLeaveSettings"
                        render={({ field: checkboxField }) => (
                          <Card className="border border-accent/20">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={checkboxField.value}
                                    onCheckedChange={checkboxField.onChange}
                                    disabled={loadingUpdate || loadingLeaves}
                                  />
                                  <div>
                                    <CardTitle className="text-base">Location-Specific Leave Settings</CardTitle>
                                    <p className="text-sm text-body/60">Configure different leave allocations per location</p>
                                  </div>
                                </div>
                                {checkboxField.value && (
                                  <Badge variant="outline" className="text-green-600 border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Enabled
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            
                            {checkboxField.value && (
                              <CardContent className="space-y-4">
                                {fields.map((field, index) => {
                                  const location = locations.find(loc => loc._id === form.getValues(`locationLeaveSettings.${index}.location`));
                                  return (
                                    <div key={field.id} className="border border-accent/10 rounded-lg p-4 space-y-4 bg-accent/5">
                                      <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                          <div className="p-2 bg-blue-100 rounded">
                                            <MapPin className="h-3 w-3 text-blue-600" />
                                          </div>
                                          <div>
                                            <h4 className="font-medium text-sm">
                                              {location ? `${location.name}, ${location.city}` : 'Select Location'}
                                            </h4>
                                            <p className="text-xs text-body/60">Location #{index + 1}</p>
                                          </div>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeLocationSetting(index)}
                                          disabled={loadingUpdate}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                          control={form.control}
                                          name={`locationLeaveSettings.${index}.location`}
                                          render={({ field: locationField }) => (
                                            <FormItem>
                                              <FormLabel className="text-sm font-medium">Location</FormLabel>
                                              <FormControl>
                                                <select
                                                  {...locationField}
                                                  className="w-full p-2 border border-accent/20 rounded-md bg-complementary text-body text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                  disabled={loadingUpdate}
                                                >
                                                  <option value="">Select Location</option>
                                                  {locations.map((location) => (
                                                    <option key={location._id} value={location._id}>
                                                      {location.name}, {location.city}
                                                    </option>
                                                  ))}
                                                </select>
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                        
                                        <FormField
                                          control={form.control}
                                          name={`locationLeaveSettings.${index}.paidLeavesPerYear`}
                                          render={({ field: leavesField }) => (
                                            <FormItem>
                                              <FormLabel className="text-sm font-medium">Paid Leaves Per Year</FormLabel>
                                              <FormControl>
                                                <Input
                                                  type="number"
                                                  {...leavesField}
                                                  onChange={(e) => leavesField.onChange(e.target.value)}
                                                  disabled={loadingUpdate}
                                                  className="bg-complementary text-body border-accent/20 text-sm"
                                                  placeholder="24"
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                                
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={addLocationSetting}
                                  disabled={loadingUpdate}
                                  className="w-full border-dashed border-accent/30 hover:border-accent/50 text-body/70 hover:text-body h-10"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Location Setting
                                </Button>
                                
                                <Alert className="border-blue-200 bg-blue-50">
                                  <Info className="h-4 w-4 text-blue-600" />
                                  <AlertDescription className="text-blue-800 text-sm">
                                    <FormField
                                      control={form.control}
                                      name="applyLeaveChanges"
                                      render={({ field: applyField }) => (
                                        <div className="flex items-center space-x-2 mt-2">
                                          <Checkbox
                                            checked={applyField.value}
                                            onCheckedChange={applyField.onChange}
                                            disabled={loadingUpdate || loadingLeaves}
                                          />
                                          <span className="text-sm font-medium">Apply changes to all employees</span>
                                        </div>
                                      )}
                                    />
                                  </AlertDescription>
                                </Alert>
                              </CardContent>
                            )}
                          </Card>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="updatePaidLeavesPerYear"
                        render={({ field: checkboxField }) => (
                          <Card className="border border-accent/20">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={checkboxField.value}
                                    onCheckedChange={checkboxField.onChange}
                                    disabled={loadingUpdate || loadingLeaves}
                                  />
                                  <div>
                                    <CardTitle className="text-base">Global Leave Settings</CardTitle>
                                    <p className="text-sm text-body/60">Same leave allocation for all locations</p>
                                  </div>
                                </div>
                                {checkboxField.value && (
                                  <Badge variant="outline" className="text-green-600 border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Enabled
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            
                            {checkboxField.value && (
                              <CardContent className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="paidLeavesPerYear"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm font-medium">Paid Leaves Per Year</FormLabel>
                                      <FormControl>
                                        <div className="relative">
                                          <Input
                                            type="number"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            disabled={loadingUpdate || loadingLeaves}
                                            className="bg-complementary text-body border-accent/20 pr-16"
                                            placeholder="24"
                                          />
                                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-body/60">
                                            days
                                          </div>
                                        </div>
                                      </FormControl>
                                      <p className="text-xs text-body/60 flex items-center gap-1">
                                        <Info className="h-3 w-3" />
                                        Employees receive {Math.floor((form.getValues('paidLeavesPerYear') || 24) / 12)} leaves per month
                                      </p>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="applyLeaveChanges"
                                  render={({ field: applyField }) => (
                                    <Alert className="border-blue-200 bg-blue-50">
                                      <Info className="h-4 w-4 text-blue-600" />
                                      <AlertDescription className="text-blue-800">
                                        <div className="flex items-center space-x-2 mt-2">
                                          <Checkbox
                                            checked={applyField.value}
                                            onCheckedChange={applyField.onChange}
                                            disabled={loadingUpdate || loadingLeaves}
                                          />
                                          <span className="text-sm font-medium">Apply changes to all active employees</span>
                                        </div>
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                />
                              </CardContent>
                            )}
                          </Card>
                        )}
                      />
                    )}
                  </div>
                </TabsContent>

                {/* Working Days Tab */}
                <TabsContent value="workingdays" className="mt-0 space-y-6">
                  <div className="space-y-6">
                    {/* Default Working Days Policy */}
                    <FormField
                      control={form.control}
                      name="updateDefaultWorkingDays"
                      render={({ field: checkboxField }) => (
                        <Card className="border border-accent/20">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={checkboxField.value}
                                  onCheckedChange={checkboxField.onChange}
                                  disabled={loadingUpdate}
                                />
                                <div>
                                  <CardTitle className="text-base">Default Working Day Policy</CardTitle>
                                  <p className="text-sm text-body/60">Set the default policy for all locations</p>
                                </div>
                              </div>
                              {checkboxField.value && (
                                <Badge variant="outline" className="text-green-600 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Enabled
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          
                          {checkboxField.value && (
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="defaultWorkingDayPolicy"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm font-medium">Default Policy Type</FormLabel>
                                      <FormControl>
                                        <select
                                          {...field}
                                          className="w-full p-2 border border-accent/20 rounded-md bg-complementary text-body text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                          disabled={loadingUpdate}
                                        >
                                          <option value="all_days">All Calendar Days (varies by month)</option>
                                          <option value="exclude_sundays">Exclude Sundays (~26 days)</option>
                                          <option value="exclude_weekends">Exclude Weekends (~22 days)</option>
                                          <option value="custom_fixed">Fixed Count (same every month)</option>
                                        </select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                {form.watch('defaultWorkingDayPolicy') === 'custom_fixed' && (
                                  <FormField
                                    control={form.control}
                                    name="defaultFixedWorkingDays"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-sm font-medium">Fixed Working Days</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            {...field}
                                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                                            disabled={loadingUpdate}
                                            className="bg-complementary text-body border-accent/20"
                                            min={20}
                                            max={31}
                                            placeholder="30"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                )}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      )}
                    />

                    {/* Working Day Calculation Info */}
                    <Alert className="border-blue-200 bg-blue-50">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription>
                        <div className="text-blue-800">
                          <h4 className="font-semibold mb-2">How Working Days Are Calculated:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                              <strong>All Calendar Days:</strong>
                              <ul className="ml-4 space-y-0.5 text-xs">
                                <li>• Aug 2025: 31 days</li>
                                <li>• Sep 2025: 30 days</li>
                                <li>• Feb 2025: 28 days</li>
                              </ul>
                            </div>
                            <div className="space-y-1">
                              <strong>Exclude Weekends:</strong>
                              <ul className="ml-4 space-y-0.5 text-xs">
                                <li>• Aug 2025: 23 days</li>
                                <li>• Sep 2025: 22 days</li>
                                <li>• Feb 2025: 20 days</li>
                              </ul>
                            </div>
                          </div>
                          <p className="text-xs mt-3 font-medium">
                            <strong>Note:</strong> Working days only affect daily rate calculations. Employees always receive full monthly salary.
                          </p>
                        </div>
                      </AlertDescription>
                    </Alert>

                    {/* Location-Specific Policies */}
                    <FormField
                      control={form.control}
                      name="updateWorkingDayPolicies"
                      render={({ field: checkboxField }) => (
                        <Card className="border border-accent/20">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={checkboxField.value}
                                  onCheckedChange={checkboxField.onChange}
                                  disabled={loadingUpdate}
                                />
                                <div>
                                  <CardTitle className="text-base">Location-Specific Policies</CardTitle>
                                  <p className="text-sm text-body/60">Create custom policies for specific locations</p>
                                </div>
                              </div>
                              {checkboxField.value && (
                                <Badge variant="outline" className="text-green-600 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Enabled ({policyFields.length} policies)
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          
                          {checkboxField.value && (
                            <CardContent className="space-y-4">
                              {policyFields.map((field, index) => (
                                <div key={field.id} className="border border-accent/10 rounded-lg p-4 space-y-4 bg-accent/5">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                      <div className="p-2 bg-green-100 rounded">
                                        <Calendar className="h-3 w-3 text-green-600" />
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-sm">
                                          {form.watch(`workingDayPolicies.${index}.policyName`) || `Policy ${index + 1}`}
                                        </h4>
                                        <p className="text-xs text-body/60">Policy #{index + 1}</p>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removePolicy(index)}
                                      disabled={loadingUpdate}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                      control={form.control}
                                      name={`workingDayPolicies.${index}.policyName`}
                                      render={({ field: nameField }) => (
                                        <FormItem>
                                          <FormLabel className="text-sm font-medium">Policy Name</FormLabel>
                                          <FormControl>
                                            <Input
                                              {...nameField}
                                              placeholder="e.g., Hyderabad - Exclude Sundays"
                                              disabled={loadingUpdate}
                                              className="bg-complementary text-body border-accent/20 text-sm"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={form.control}
                                      name={`workingDayPolicies.${index}.policyType`}
                                      render={({ field: policyField }) => (
                                        <FormItem>
                                          <FormLabel className="text-sm font-medium">Policy Type</FormLabel>
                                          <FormControl>
                                            <select
                                              {...policyField}
                                              className="w-full p-2 border border-accent/20 rounded-md bg-complementary text-body text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                              disabled={loadingUpdate}
                                            >
                                              <option value="all_days">All Calendar Days</option>
                                              <option value="exclude_sundays">Exclude Sundays</option>
                                              <option value="exclude_weekends">Exclude Weekends</option>
                                              <option value="custom_fixed">Fixed Count</option>
                                            </select>
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  {form.watch(`workingDayPolicies.${index}.policyType`) === 'custom_fixed' && (
                                    <FormField
                                      control={form.control}
                                      name={`workingDayPolicies.${index}.fixedWorkingDays`}
                                      render={({ field: fixedDaysField }) => (
                                        <FormItem>
                                          <FormLabel className="text-sm font-medium">Fixed Working Days Per Month</FormLabel>
                                          <FormControl>
                                            <Input
                                              type="number"
                                              {...fixedDaysField}
                                              onChange={(e) => fixedDaysField.onChange(parseInt(e.target.value))}
                                              disabled={loadingUpdate}
                                              className="bg-complementary text-body border-accent/20 w-32 text-sm"
                                              min={20}
                                              max={31}
                                              placeholder="30"
                                            />
                                          </FormControl>
                                          <p className="text-xs text-body/60">
                                            This exact number will be used every month
                                          </p>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  )}

                                  <FormField
                                    control={form.control}
                                    name={`workingDayPolicies.${index}.locations`}
                                    render={({ field: locationsField }) => (
                                      <FormItem>
                                        <FormLabel className="text-sm font-medium">
                                          Applicable Locations ({locationsField.value?.length || 0} selected)
                                        </FormLabel>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-accent/10 rounded-md p-3 bg-complementary">
                                          {locations.map((location) => {
                                            const isChecked = locationsField.value?.includes(location._id) || false;
                                            return (
                                              <div key={location._id} className="flex items-center space-x-2">
                                                <Checkbox
                                                  checked={isChecked}
                                                  onCheckedChange={(checked) => {
                                                    const currentLocations = locationsField.value || [];
                                                    if (checked) {
                                                      locationsField.onChange([...currentLocations, location._id]);
                                                    } else {
                                                      locationsField.onChange(currentLocations.filter(id => id !== location._id));
                                                    }
                                                  }}
                                                  disabled={loadingUpdate}
                                                />
                                                <label className="text-xs font-medium leading-none cursor-pointer">
                                                  {location.name}, {location.city}
                                                </label>
                                              </div>
                                            );
                                          })}
                                        </div>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name={`workingDayPolicies.${index}.description`}
                                    render={({ field: descField }) => (
                                      <FormItem>
                                        <FormLabel className="text-sm font-medium">Description (Optional)</FormLabel>
                                        <FormControl>
                                          <Input
                                            {...descField}
                                            placeholder="e.g., Local practice of Sunday off"
                                            disabled={loadingUpdate}
                                            className="bg-complementary text-body border-accent/20 text-sm"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />

                                  {/* Example calculations */}
                                  <div className="p-3 bg-gray-50 rounded-lg border text-sm">
                                    <strong className="flex items-center gap-2 mb-2 text-xs">
                                      <Calendar className="h-3 w-3" />
                                      Example working days:
                                    </strong>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                      <div className="bg-white p-2 rounded text-center">
                                        <strong>Aug 2025</strong><br />
                                        {getExampleWorkingDays(2025, 8, form.watch(`workingDayPolicies.${index}`))}
                                      </div>
                                      <div className="bg-white p-2 rounded text-center">
                                        <strong>Sep 2025</strong><br />
                                        {getExampleWorkingDays(2025, 9, form.watch(`workingDayPolicies.${index}`))}
                                      </div>
                                      <div className="bg-white p-2 rounded text-center">
                                        <strong>Feb 2025</strong><br />
                                        {getExampleWorkingDays(2025, 2, form.watch(`workingDayPolicies.${index}`))}
                                      </div>
                                      <div className="bg-white p-2 rounded text-center">
                                        <strong>Feb 2024</strong><br />
                                        {getExampleWorkingDays(2024, 2, form.watch(`workingDayPolicies.${index}`))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => appendPolicy({
                                  policyName: '',
                                  policyType: 'all_days',
                                  fixedWorkingDays: 30,
                                  excludeDays: [],
                                  locations: [],
                                  description: '',
                                  isDefault: false
                                })}
                                disabled={loadingUpdate}
                                className="w-full border-dashed border-accent/30 hover:border-accent/50 text-body/70 hover:text-body h-10"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Working Day Policy
                              </Button>
                            </CardContent>
                          )}
                        </Card>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Holidays Tab */}
                <TabsContent value="holidays" className="mt-0 space-y-6">
                  <FormField
                    control={form.control}
                    name="updateHolidays"
                    render={({ field: checkboxField }) => (
                      <Card className="border border-accent/20">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={checkboxField.value}
                                onCheckedChange={checkboxField.onChange}
                                disabled={loadingUpdate}
                              />
                              <div>
                                <CardTitle className="text-base">Holiday Management</CardTitle>
                                <p className="text-sm text-body/60">Define holidays for different locations</p>
                              </div>
                            </div>
                            {checkboxField.value && (
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Enabled ({holidayFields.length} holidays)
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        
                        {checkboxField.value && (
                          <CardContent className="space-y-4">
                            <Alert className="border-blue-200 bg-blue-50">
                              <Info className="h-4 w-4 text-blue-600" />
                              <AlertDescription className="text-blue-800 text-sm">
                                Holidays are for reference only. Employees receive full monthly salary regardless of holidays.
                              </AlertDescription>
                            </Alert>
                            
                            {holidayFields.map((field, index) => (
                              <div key={field.id} className="border border-accent/10 rounded-lg p-4 space-y-4 bg-accent/5">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-2">
                                    <div className="p-2 bg-orange-100 rounded">
                                      <Calendar className="h-3 w-3 text-orange-600" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-sm">
                                        {form.watch(`holidays.${index}.name`) || `Holiday ${index + 1}`}
                                      </h4>
                                      <p className="text-xs text-body/60">Holiday #{index + 1}</p>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeHoliday(index)}
                                    disabled={loadingUpdate}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <FormField
                                    control={form.control}
                                    name={`holidays.${index}.name`}
                                    render={({ field: nameField }) => (
                                      <FormItem>
                                        <FormLabel className="text-sm font-medium">Holiday Name</FormLabel>
                                        <FormControl>
                                          <Input
                                            {...nameField}
                                            placeholder="e.g., Diwali, Christmas"
                                            disabled={loadingUpdate}
                                            className="bg-complementary text-body border-accent/20 text-sm"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name={`holidays.${index}.date`}
                                    render={({ field: dateField }) => (
                                      <FormItem>
                                        <FormLabel className="text-sm font-medium">Date</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="date"
                                            {...dateField}
                                            value={dateField.value ? new Date(dateField.value).toISOString().split('T')[0] : ''}
                                            onChange={(e) => dateField.onChange(new Date(e.target.value))}
                                            disabled={loadingUpdate}
                                            className="bg-complementary text-body border-accent/20 text-sm"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name={`holidays.${index}.isRecurring`}
                                    render={({ field: recurringField }) => (
                                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-6">
                                        <FormControl>
                                          <Checkbox
                                            checked={recurringField.value}
                                            onCheckedChange={recurringField.onChange}
                                            disabled={loadingUpdate}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-medium">Recurring Holiday</FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                
                                {form.watch(`holidays.${index}.isRecurring`) && (
                                  <FormField
                                    control={form.control}
                                    name={`holidays.${index}.recurringType`}
                                    render={({ field: typeField }) => (
                                      <FormItem>
                                        <FormLabel className="text-sm font-medium">Recurring Type</FormLabel>
                                        <FormControl>
                                          <select
                                            {...typeField}
                                            className="w-full p-2 border border-accent/20 rounded-md bg-complementary text-body text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            disabled={loadingUpdate}
                                          >
                                            <option value="yearly">Yearly (same date every year)</option>
                                            <option value="monthly">Monthly (same date every month)</option>
                                          </select>
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                )}
                                
                                <FormField
                                  control={form.control}
                                  name={`holidays.${index}.locations`}
                                  render={({ field: locationsField }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm font-medium">
                                        Applicable Locations ({locationsField.value?.length || 0} selected)
                                      </FormLabel>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-accent/10 rounded-md p-3 bg-complementary">
                                        {locations.map((location) => {
                                          const isChecked = locationsField.value?.includes(location._id) || false;
                                          return (
                                            <div key={location._id} className="flex items-center space-x-2">
                                              <Checkbox
                                                checked={isChecked}
                                                onCheckedChange={(checked) => {
                                                  const currentLocations = locationsField.value || [];
                                                  if (checked) {
                                                    locationsField.onChange([...currentLocations, location._id]);
                                                  } else {
                                                    locationsField.onChange(currentLocations.filter(id => id !== location._id));
                                                  }
                                                }}
                                                disabled={loadingUpdate}
                                              />
                                              <label className="text-xs font-medium leading-none cursor-pointer">
                                                {location.name}, {location.city}
                                              </label>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name={`holidays.${index}.description`}
                                  render={({ field: descField }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm font-medium">Description (Optional)</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...descField}
                                          placeholder="e.g., Festival of lights celebrated across India"
                                          disabled={loadingUpdate}
                                          className="bg-complementary text-body border-accent/20 text-sm"
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            ))}
                            
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => appendHoliday({
                                name: '',
                                date: new Date(),
                                locations: [],
                                isRecurring: false,
                                recurringType: 'yearly',
                                description: ''
                              })}
                              disabled={loadingUpdate}
                              className="w-full border-dashed border-accent/30 hover:border-accent/50 text-body/70 hover:text-body h-10"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Holiday
                            </Button>
                          </CardContent>
                        )}
                      </Card>
                    )}
                  />
                </TabsContent>

                {/* Advanced Tab */}
                <TabsContent value="advanced" className="mt-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Half Day Deduction */}
                    <FormField
                      control={form.control}
                      name="updateHalfDayDeduction"
                      render={({ field: checkboxField }) => (
                        <Card className="border border-accent/20">
                          <CardHeader>
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={checkboxField.value}
                                onCheckedChange={checkboxField.onChange}
                                disabled={loadingUpdate || loadingLeaves}
                              />
                              <div>
                                <CardTitle className="text-base">Half-Day Deduction</CardTitle>
                                <p className="text-sm text-body/60">Configure half-day leave deduction</p>
                              </div>
                            </div>
                          </CardHeader>
                          
                          {checkboxField.value && (
                            <CardContent>
                              <FormField
                                control={form.control}
                                name="halfDayDeduction"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm font-medium">Deduction Amount</FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <Input
                                          type="number"
                                          step="0.1"
                                          {...field}
                                          onChange={(e) => field.onChange(e.target.value)}
                                          disabled={loadingUpdate || loadingLeaves}
                                          className="bg-complementary text-body border-accent/20 pr-16"
                                          placeholder="0.5"
                                        />
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-body/60">
                                          days
                                        </div>
                                      </div>
                                    </FormControl>
                                    <p className="text-xs text-body/60 flex items-center gap-1">
                                      <Info className="h-3 w-3" />
                                      0.5 = half day, 1.0 = full day
                                    </p>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </CardContent>
                          )}
                        </Card>
                      )}
                    />

                    {/* Highlight Duration */}
                    <FormField
                      control={form.control}
                      name="updateHighlightDuration"
                      render={({ field: checkboxField }) => (
                        <Card className="border border-accent/20">
                          <CardHeader>
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={checkboxField.value}
                                onCheckedChange={checkboxField.onChange}
                                disabled={loadingUpdate || loadingLeaves}
                              />
                              <div>
                                <CardTitle className="text-base">Highlight Duration</CardTitle>
                                <p className="text-sm text-body/60">Duration for attendance highlights</p>
                              </div>
                            </div>
                          </CardHeader>
                          
                          {checkboxField.value && (
                            <CardContent>
                              <FormField
                                control={form.control}
                                name="highlightDuration"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm font-medium">Duration</FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <Input
                                          type="number"
                                          step="0.1"
                                          {...field}
                                          onChange={(e) => field.onChange(e.target.value)}
                                          disabled={loadingUpdate || loadingLeaves}
                                          className="bg-complementary text-body border-accent/20 pr-16"
                                          placeholder="24"
                                        />
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-body/60">
                                          hours
                                        </div>
                                      </div>
                                    </FormControl>
                                    <p className="text-xs text-body/60 flex items-center gap-1">
                                      <Info className="h-3 w-3" />
                                      How long to highlight recent changes
                                    </p>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </CardContent>
                          )}
                        </Card>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Fixed Action Button */}
                <div className="sticky bottom-0 bg-complementary border-t border-accent/10 p-4 -mx-6 -mb-6">
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="text-sm text-body/60">
                      {selectedCount > 0 ? (
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          {selectedCount} setting{selectedCount !== 1 ? 's' : ''} selected for update
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          Select settings to update by checking the boxes above
                        </span>
                      )}
                    </div>
                    
                    <Button
                      type="button"
                      onClick={handleUpdateClick}
                      size="lg"
                      className={cn(
                        'bg-accent text-body hover:bg-accent-hover transition-all duration-300 min-w-[180px]',
                        !selectedCount && 'opacity-50'
                      )}
                      disabled={!selectedCount || loadingUpdate || loadingLeaves}
                    >
                      {loadingUpdate || loadingLeaves ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Settings
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </Tabs>
        </CardContent>
      </Card>

      {/* Enhanced Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-complementary text-body border-accent max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Confirm Leave Balance Update
            </DialogTitle>
            <DialogDescription className="text-body/70">
              This will update leave balances for{' '}
              <strong className="text-body">{employeeCount} active employee{employeeCount !== 1 ? 's' : ''}</strong>{' '}
              based on their location-specific leave settings.
            </DialogDescription>
          </DialogHeader>
          
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 text-sm">
              <strong>Warning:</strong> This action cannot be undone. Employee leave balances will be recalculated immediately.
            </AlertDescription>
          </Alert>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-accent/30 text-body/70 hover:bg-accent/5"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const fieldsToUpdate = [
                  { name: 'paidLeavesPerYear', checkbox: 'updatePaidLeavesPerYear' },
                  { name: 'locationLeaveSettings', checkbox: 'updateLocationLeaveSettings' },
                  { name: 'workingDayPolicies', checkbox: 'updateWorkingDayPolicies' },
                  { name: 'holidays', checkbox: 'updateHolidays' },
                  { name: 'defaultWorkingDays', checkbox: 'updateDefaultWorkingDays' },
                  { name: 'halfDayDeduction', checkbox: 'updateHalfDayDeduction' },
                  { name: 'highlightDuration', checkbox: 'updateHighlightDuration' },
                ].filter(field => form.getValues(field.checkbox));
                
                submitFields(fieldsToUpdate);
                setIsDialogOpen(false);
              }}
              className="bg-orange-600 text-white hover:bg-orange-700"
              disabled={loadingLeaves}
            >
              {loadingLeaves ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Update
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsForm;
