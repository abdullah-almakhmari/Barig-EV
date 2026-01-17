import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Simple translation resources
const resources = {
  en: {
    translation: {
      "app.title": "Oman EV Charge",
      "nav.map": "Map View",
      "nav.list": "Stations",
      "nav.add": "Add Station",
      "common.loading": "Loading...",
      "common.error": "Something went wrong",
      "common.save": "Save",
      "common.cancel": "Cancel",
      "station.status.operational": "Operational",
      "station.status.maintenance": "Maintenance",
      "station.status.offline": "Offline",
      "station.type.ac": "AC Charger",
      "station.type.dc": "DC Fast Charger",
      "station.type.both": "AC & DC Available",
      "station.power": "Power",
      "station.price.free": "Free Charging",
      "station.price.paid": "Paid",
      "station.report.title": "Report Status",
      "station.report.working": "Working Well",
      "station.report.broken": "Not Working",
      "filter.all": "All Stations",
      "filter.fast": "Fast Charging Only",
      "add.title": "Add New Station",
      "add.name": "Station Name (English)",
      "add.nameAr": "Station Name (Arabic)",
      "add.city": "City (English)",
      "add.cityAr": "City (Arabic)",
      "add.submit": "Submit Station",
      "hero.title": "Find EV Charging Stations in Oman",
      "hero.subtitle": "Locate, report, and add charging points seamlessly.",
    }
  },
  ar: {
    translation: {
      "app.title": "شحن المركبات عمان",
      "nav.map": "الخريطة",
      "nav.list": "المحطات",
      "nav.add": "أضف محطة",
      "common.loading": "جاري التحميل...",
      "common.error": "حدث خطأ ما",
      "common.save": "حفظ",
      "common.cancel": "إلغاء",
      "station.status.operational": "يعمل",
      "station.status.maintenance": "تحت الصيانة",
      "station.status.offline": "خارج الخدمة",
      "station.type.ac": "شاحن عادي (AC)",
      "station.type.dc": "شاحن سريع (DC)",
      "station.type.both": "متوفر AC و DC",
      "station.power": "القدرة",
      "station.price.free": "شحن مجاني",
      "station.price.paid": "مدفوع",
      "station.report.title": "الإبلاغ عن الحالة",
      "station.report.working": "يعمل جيداً",
      "station.report.broken": "لا يعمل",
      "filter.all": "كل المحطات",
      "filter.fast": "شحن سريع فقط",
      "add.title": "إضافة محطة جديدة",
      "add.name": "اسم المحطة (إنجليزي)",
      "add.nameAr": "اسم المحطة (عربي)",
      "add.city": "المدينة (إنجليزي)",
      "add.cityAr": "المدينة (عربي)",
      "add.submit": "إضافة المحطة",
      "hero.title": "اعثر على محطات شحن المركبات الكهربائية في عمان",
      "hero.subtitle": "تحديد المواقع، الإبلاغ، وإضافة نقاط شحن بسهولة.",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ar", // Default to Arabic
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
