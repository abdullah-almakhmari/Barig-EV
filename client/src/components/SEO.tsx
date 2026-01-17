import { Helmet } from "react-helmet-async";
import { useLanguage } from "./LanguageContext";

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
}

export function SEO({ title, description, path = "/" }: SEOProps) {
  const { language } = useLanguage();
  
  const baseTitle = language === "ar" ? "بارق" : "Bariq";
  const baseDescription = language === "ar" 
    ? "اعثر على محطات شحن السيارات الكهربائية في عُمان والخليج"
    : "Find EV charging stations in Oman and GCC";
  
  const fullTitle = title ? `${title} | ${baseTitle}` : baseTitle;
  const finalDescription = description || baseDescription;
  
  return (
    <Helmet>
      <html lang={language} dir={language === "ar" ? "rtl" : "ltr"} />
      <title>{fullTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={language === "ar" ? "ar_OM" : "en_US"} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDescription} />
    </Helmet>
  );
}
