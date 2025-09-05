import { Toaster } from 'react-hot-toast';

const ToasterProvider = () => {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 5000,
        style: {
          background: '#ffffff',
          color: '#1a202c',
          border: '1px solid #e2e8f0',
          padding: '12px 16px',
          fontSize: '14px',
          maxWidth: '400px',
        },
        success: {
          style: {
            borderColor: '#28a745',
            background: '#f0fff4',
            color: '#1a202c',
          },
          iconTheme: {
            primary: '#28a745',
            secondary: '#f0fff4',
          },
        },
        error: {
          style: {
            borderColor: '#dc3545',
            background: '#fff1f2',
            color: '#1a202c',
          },
          iconTheme: {
            primary: '#dc3545',
            secondary: '#fff1f2',
          },
        },
      }}
    />
  );
};

export default ToasterProvider;