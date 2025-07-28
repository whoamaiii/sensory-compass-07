import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ValidationError {
  field: string;
  message: string;
}

interface FormValidationFeedbackProps {
  errors?: ValidationError[];
  warnings?: ValidationError[];
  success?: string;
  className?: string;
}

export const FormValidationFeedback: React.FC<FormValidationFeedbackProps> = ({
  errors = [],
  warnings = [],
  success,
  className = ""
}) => {
  if (!errors.length && !warnings.length && !success) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {success && (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {errors.map((error, index) => (
        <Alert key={`error-${index}`} variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{error.field}:</strong> {error.message}
          </AlertDescription>
        </Alert>
      ))}

      {warnings.map((warning, index) => (
        <Alert key={`warning-${index}`} className="border-orange-200 bg-orange-50">
          <Info className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>{warning.field}:</strong> {warning.message}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};