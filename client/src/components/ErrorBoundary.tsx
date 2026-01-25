import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, WifiOff, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isOffline: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isOffline: !navigator.onLine };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidMount() {
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
  }

  handleOnline = () => {
    this.setState({ isOffline: false });
    if (this.state.hasError) {
      this.handleReload();
    }
  };

  handleOffline = () => {
    this.setState({ isOffline: true });
  };

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, isOffline } = this.state;

    if (hasError || isOffline) {
      const isArabic = document.documentElement.dir === "rtl" || 
                       localStorage.getItem("bariq-language") === "ar";

      return (
        <div className="fixed inset-0 bg-background flex items-center justify-center p-6 z-50">
          <div className="text-center max-w-sm">
            <div className="mb-6">
              {isOffline ? (
                <WifiOff className="w-16 h-16 mx-auto text-muted-foreground" />
              ) : (
                <AlertTriangle className="w-16 h-16 mx-auto text-warning" />
              )}
            </div>
            
            <h1 className="text-xl font-bold mb-2">
              {isOffline 
                ? (isArabic ? "لا يوجد اتصال بالإنترنت" : "No Internet Connection")
                : (isArabic ? "حدث خطأ غير متوقع" : "Something went wrong")
              }
            </h1>
            
            <p className="text-muted-foreground mb-6">
              {isOffline
                ? (isArabic 
                    ? "يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى" 
                    : "Please check your internet connection and try again")
                : (isArabic 
                    ? "لا تقلق، يمكنك إعادة تحميل التطبيق لحل المشكلة" 
                    : "Don't worry, you can reload the app to fix this")
              }
            </p>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={this.handleReload} 
                className="w-full gap-2"
                data-testid="button-reload-app"
              >
                <RefreshCw className="w-4 h-4" />
                {isArabic ? "إعادة تحميل التطبيق" : "Reload App"}
              </Button>

              {!isOffline && (
                <Button 
                  variant="outline" 
                  onClick={this.handleRetry}
                  className="w-full"
                  data-testid="button-try-again"
                >
                  {isArabic ? "حاول مرة أخرى" : "Try Again"}
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              {isArabic ? "بارق - محطات شحن السيارات الكهربائية" : "Bariq - EV Charging Stations"}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
