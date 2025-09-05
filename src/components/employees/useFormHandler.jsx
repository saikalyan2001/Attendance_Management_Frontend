import { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { parseServerError } from '@/utils/errorUtils';

const useFormHandler = (form, dispatchAction, onSuccess, successMessage = null, resetAction) => {
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef(null);

  const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const isValid = await form.trigger();
      if (!isValid) {
        return;
      }

      // Check if dispatchAction returns a promise with .unwrap (Redux Toolkit async thunk)
      const result = dispatchAction(data);
      let customSuccessMessage = null;
      if (result && typeof result.unwrap === 'function') {
        // Handle async thunk
        const actionResult = await result.unwrap();
        if (actionResult && actionResult.message) {
          customSuccessMessage = actionResult.message;
        }
      } else if (result && result.then) {
        // Handle regular promise (non-thunk async action)
        const actionResult = await result;
        if (actionResult && actionResult.message) {
          customSuccessMessage = actionResult.message;
        }
      } else {
        // Handle synchronous action
        dispatchAction(data);
      }

      // Display toast with custom message if provided, otherwise use successMessage
      const finalMessage = customSuccessMessage || successMessage;
      if (finalMessage) {
        toast.success(finalMessage, { position: 'top-center', duration: 5000 });
      }

      onSuccess();
      form.reset();
      if (resetAction) resetAction();
    } catch (error) {
      const parsedError = parseServerError(error);
      setServerError(parsedError);
      toast.error(parsedError.message, { id: 'form-submit-error', position: 'top-center', duration: 5000 });
      Object.entries(parsedError.fields).forEach(([field, message], index) => {
        setTimeout(() => {
          toast.error(message, { id: `server-error-${field}-${index}`, position: 'top-center', duration: 5000 });
        }, (index + 1) * 500);
      });
      const firstErrorFieldName = Object.keys(parsedError.fields)[0];
      if (firstErrorFieldName) {
        const fieldElement = document.querySelector(`[name="${firstErrorFieldName}"]`);
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          fieldElement.focus();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitClick = async () => {
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        const errors = [];
        const fieldOrder = Object.keys(form.formState.errors).flatMap((field) => {
          if (form.formState.errors[field]?.type === 'object') {
            return Object.keys(form.formState.errors[field]).map((subField) => `${field}.${subField}`);
          }
          return field;
        });

        for (const field of fieldOrder) {
          const errorMessage = field.includes('.')
            ? form.formState.errors[field.split('.')[0]]?.[field.split('.')[1]]?.message
            : form.formState.errors[field]?.message;
          if (errorMessage && !errors.some((e) => e.field === field)) {
            errors.push({ field, message: errorMessage });
          }
        }

        if (errors.length > 0) {
          const firstError = errors[0];
          toast.error(firstError.message, {
            id: `validation-error-${firstError.field}`,
            position: 'top-center',
            duration: 5000,
          });
          const firstErrorField = document.querySelector(`[name="${firstError.field}"]`) || formRef.current;
          if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorField.focus();
          }
          return;
        }
      }

      await form.handleSubmit(handleSubmit)();
    } catch (error) {
      toast.error('Error submitting form, please try again', {
        id: 'form-submit-error',
        position: 'top-center',
        duration: 5000,
      });
    }
  };

  return { handleSubmitClick, isSubmitting, serverError, formRef };
};

export default useFormHandler;