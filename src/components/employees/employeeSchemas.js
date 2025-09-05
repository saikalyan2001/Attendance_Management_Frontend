import { z } from 'zod';

export const updateEmployeeSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters and spaces'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'),
  designation: z
    .string()
    .min(1, 'Designation is required')
    .max(50, 'Designation cannot exceed 50 characters'),
  department: z
    .string()
    .min(1, 'Department is required')
    .max(50, 'Department cannot exceed 50 characters'),
  salary: z
    .string()
    .min(1, 'Salary is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1000, 'Salary must be at least ₹1000'),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{10}$/.test(val), 'Phone number must be 10 digits'),
  dob: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid date format'),
  bankDetails: z
    .object({
      accountNo: z.string().min(1, 'Account number is required'),
      ifscCode: z.string().min(1, 'IFSC code is required'),
      bankName: z.string().min(1, 'Bank name is required'),
      accountHolder: z.string().min(1, 'Account holder name is required'),
    })
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const { accountNo, ifscCode, bankName, accountHolder } = val;
        return accountNo && ifscCode && bankName && accountHolder;
      },
      { message: 'All bank details fields are required if any are provided' }
    ),
  paidLeaves: z
    .object({
      available: z
        .number()
        .min(0, 'Available leaves cannot be negative')
        .max(24, 'Available leaves cannot exceed 24'),
      used: z.number().min(0, 'Used leaves cannot be negative'),
      carriedForward: z.number().min(0, 'Carried forward leaves cannot be negative'),
    })
    .optional(),
});

export const siteInchargeEditEmployeeSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters and spaces'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'),
  designation: z
    .string()
    .min(1, 'Designation is required')
    .max(50, 'Designation cannot exceed 50 characters'),
  department: z
    .string()
    .min(1, 'Department is required')
    .max(50, 'Department cannot exceed 50 characters'),
  salary: z
    .string()
    .min(1, 'Salary is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1000, 'Salary must be at least ₹1000'),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{10}$/.test(val), 'Phone number must be 10 digits'),
  dob: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid date format'),
  bankDetails: z
    .object({
      accountNo: z.string().min(1, 'Account number is required'),
      ifscCode: z.string().min(1, 'IFSC code is required'),
      bankName: z.string().min(1, 'Bank name is required'),
      accountHolder: z.string().min(1, 'Account holder name is required'),
    })
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const { accountNo, ifscCode, bankName, accountHolder } = val;
        return accountNo && ifscCode && bankName && accountHolder;
      },
      { message: 'All bank details fields are required if any are provided' }
    ),
  paidLeaves: z
    .object({
      available: z
        .number()
        .min(0, 'Available leaves cannot be negative')
        .max(24, 'Available leaves cannot exceed 24'),
      used: z.number().min(0, 'Used leaves cannot be negative'),
      carriedForward: z.number().min(0, 'Carried forward leaves cannot be negative'),
    })
    .optional(),
});

export const transferEmployeeSchema = z.object({
  location: z.string().min(1, 'Please select a location').refine((val) => /^[0-9a-fA-F]{24}$/.test(val), 'Invalid location ID'),
  transferTimestamp: z.string().min(1, 'Transfer date is required').refine((val) => !isNaN(Date.parse(val)), 'Invalid transfer date'),
});

export const addDocumentsSchema = z.object({
  documents: z
    .array(
      z.object({
        file: z
          .any()
          .refine((file) => file instanceof File, 'Please upload a file')
          .refine(
            (file) => {
              if (!(file instanceof File)) return false;
              const filetypes = /pdf|doc|docx|jpg|jpeg|png/;
              const extname = filetypes.test(file.name.toLowerCase().split('.').pop());
              const mimetype = filetypes.test(file.type.toLowerCase().split('/')[1] || '');
              return extname && mimetype;
            },
            'File must be PDF, DOC, DOCX, JPG, JPEG, or PNG'
          )
          .refine(
            (file) => {
              if (!(file instanceof File)) return false;
              return file.size <= 5 * 1024 * 1024; // 5MB limit
            },
            'File size must be less than 5MB'
          ),
      })
    )
    .max(5, 'Cannot upload more than 5 documents')
    .optional(),
});

export const updateAdvanceSchema = z.object({
  advance: z
    .string()
    .min(1, 'Advance is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Advance must be a non-negative number'),
  month: z
    .string()
    .min(1, 'Month is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1 && Number(val) <= 12, 'Invalid month'),
  year: z
    .string()
    .min(1, 'Year is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 2000, 'Invalid year'),
});

export const rejoinSchema = z.object({
  rejoinDate: z
    .string()
    .min(1, 'Please select a rejoin date')
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid rejoin date')
    .refine((val) => new Date(val) > new Date(), 'Rejoin date must be in the future'),
});