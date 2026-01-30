import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

declare global {
  interface Window {
    swRegistration: ServiceWorkerRegistration | null;
  }
}

window.swRegistration = null;
const isProduction = import.meta.env.PROD;

if ('serviceWorker' in navigator && isProduction) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
        window.swRegistration = registration;
        
        registration.update();
        
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
} else if ('serviceWorker' in navigator && !isProduction) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
