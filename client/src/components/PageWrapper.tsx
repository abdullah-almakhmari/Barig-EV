import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className = "" }: PageWrapperProps) {
  const [location] = useLocation();
  const [key, setKey] = useState(location);

  useEffect(() => {
    setKey(location);
  }, [location]);

  return (
    <div key={key} className={`page-transition ${className}`}>
      {children}
    </div>
  );
}
