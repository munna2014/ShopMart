import { useState } from "react";

const AdminProductImage = ({ 
  src, 
  alt, 
  className = "", 
  fallbackSrc = "/images/default-product.svg",
  onError = null 
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = (e) => {
    if (!hasError && currentSrc !== fallbackSrc) {
      console.warn(`Admin: Failed to load image: ${currentSrc}`);
      setHasError(true);
      setCurrentSrc(fallbackSrc);
      e.target.src = fallbackSrc;
    }
    
    if (onError) {
      onError(e);
    }
  };

  const handleLoad = () => {
    // Reset error state if image loads successfully
    if (hasError && currentSrc === src) {
      setHasError(false);
    }
  };

  return (
    <img
      src={currentSrc || fallbackSrc}
      alt={alt}
      className={className}
      onError={handleError}
      onLoad={handleLoad}
      loading="lazy"
    />
  );
};

export default AdminProductImage;