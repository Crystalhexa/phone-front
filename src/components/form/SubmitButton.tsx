import Image from "next/image";
import { Loader2 } from "lucide-react"
import { Button } from "../ui/button";

interface ButtonProps {
  isLoading: boolean;
  className?: string;
  children: React.ReactNode;
}

const SubmitButton = ({ isLoading, className, children }: ButtonProps) => {
  return (
    <Button
      type="submit"
      disabled={isLoading}
      className={className ?? "shad-primary-btn w-full"}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
    {children}
    </Button>
  );
};

export default SubmitButton;
