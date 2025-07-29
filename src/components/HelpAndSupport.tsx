import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { HelpCircle } from "lucide-react";

/**
 * Renders a "Help & Support" button that triggers a dialog with support information.
 * This component provides a standardized way to offer help across the application.
 *
 * @returns {JSX.Element} A dialog component for help and support.
 */
export const HelpAndSupport = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hidden sm:flex items-center justify-center group">
          <HelpCircle className="mr-2 h-4 w-4 transition-transform group-hover:rotate-12" />
          Hjelp & Støtte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Help & Support</DialogTitle>
        </DialogHeader>
        <div>
          <p>If you need help or support, please contact us at:</p>
          <a href="mailto:support@example.com" className="text-primary">
            support@example.com
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 