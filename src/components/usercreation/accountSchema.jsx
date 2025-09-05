import { z } from 'zod';

// Base schema for shared fields
const baseAccountSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  name: z
    .string({ required_error: 'Full name is required' })
    .min(1, 'Please enter your full name')
    .trim(),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || (val.length === 10 && /^\d{10}$/.test(val)),
      'Please enter a valid 10-digit phone number'
    ),
  locations: z.array(z.string()).optional(),
});

// Schema factory function to handle both Super Admin and Admin cases
export const accountSchema = (fixedRole = null) =>
  baseAccountSchema
    .extend({
      // Add role field only if fixedRole is not provided (Super Admin case)
      ...(fixedRole
        ? {}
        : {
            role: z.enum(['admin', 'siteincharge'], { 
              required_error: 'Please select a role',
              invalid_type_error: 'Please select a valid role'
            }),
          }),
    })
    .refine(
      (data) => {
        const role = fixedRole || data.role;
        if (role === 'siteincharge') {
          return data.locations && data.locations.length > 0;
        }
        return true;
      },
      {
        message: 'Please select at least one location for Site Incharge',
        path: ['locations'],
      }
    )
    .refine(
      (data) => {
        const role = fixedRole || data.role;
        if (role === 'admin') {
          return !data.locations || data.locations.length === 0;
        }
        return true;
      },
      {
        message: 'Locations cannot be assigned to Admin accounts',
        path: ['locations'],
      }
    );
