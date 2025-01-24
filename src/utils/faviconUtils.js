// Base64 encoded SVG favicon for Jarvis
const jarvisFavicon = `data:image/svg+xml;base64,${btoa(`
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="6" fill="#1A73E8"/>
  <path d="M16 6C10.477 6 6 10.477 6 16C6 21.523 10.477 26 16 26C21.523 26 26 21.523 26 16C26 10.477 21.523 6 16 6ZM16 8C20.418 8 24 11.582 24 16C24 20.418 20.418 24 16 24C11.582 24 8 20.418 8 16C8 11.582 11.582 8 16 8Z" fill="white"/>
  <circle cx="16" cy="16" r="4" fill="white"/>
  <path d="M16 13C14.343 13 13 14.343 13 16C13 17.657 14.343 19 16 19C17.657 19 19 17.657 19 16C19 14.343 17.657 13 16 13ZM16 14C17.105 14 18 14.895 18 16C18 17.105 17.105 18 16 18C14.895 18 14 17.105 14 16C14 14.895 14.895 14 16 14Z" fill="#1A73E8"/>
</svg>
`)}`;

let originalFavicon = null;

export const setJarvisFavicon = () => {
  // Store the original favicon if not already stored
  if (!originalFavicon) {
    const existingFavicon = document.querySelector("link[rel*='icon']");
    originalFavicon = existingFavicon ? existingFavicon.href : null;
  }

  // Create or update favicon link element
  let link = document.querySelector("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = jarvisFavicon;
};

export const restoreOriginalFavicon = () => {
  if (originalFavicon) {
    const link = document.querySelector("link[rel*='icon']");
    if (link) {
      link.href = originalFavicon;
    }
  }
};
