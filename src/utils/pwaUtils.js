export const isPWA = () => {
  // Check if running in standalone mode (installed PWA)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone ||
                      document.referrer.includes('android-app://');
  
  // Check if it's mobile viewport
  const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
  
  return isStandalone || isMobileViewport;
};
