import {
  Circle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export const parseServerError = (error) => {
  if (!error) {
    return { message: "Unknown error occurred", fields: {} };
  }
  if (typeof error === "string") {
    return { message: error, fields: {} };
  }
  if (error.message && typeof error.message === "string") {
    return {
      message: error.message,
      fields: error.fields || {},
    };
  }
  return { message: "Unknown error occurred", fields: {} };
};

export const getStatusIcon = (status) => {
  switch (status.toLowerCase()) {
    case "present":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "absent":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "half-day":
      return <Circle className="h-4 w-4 text-yellow-500" />;
    case "leave":
      return <Circle className="h-4 w-4 text-blue-500" />;
    default:
      return null;
  }
};