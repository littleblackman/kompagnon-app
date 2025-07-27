export const useImages = () => {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBase.replace('/api', '');

  /**
   * Convertir une URL relative en URL complète
   */
  const getImageUrl = (imagePath: string | null | undefined): string | null => {
    if (!imagePath) return null;
    
    // Si l'URL est déjà complète, on la retourne
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Sinon on ajoute le baseUrl
    return `${baseUrl}/${imagePath.replace(/^\//, '')}`;
  };

  /**
   * Convertir un tableau d'URLs relatives en URLs complètes
   */
  const getImagesUrls = (images: any): string[] => {
    if (!images) return [];
    
    let imageArray = images;
    
    // Si c'est une chaîne JSON, on la parse
    if (typeof images === 'string') {
      try {
        imageArray = JSON.parse(images);
      } catch {
        return [];
      }
    }
    
    // Si c'est un tableau, on traite chaque image
    if (Array.isArray(imageArray)) {
      return imageArray.map(img => getImageUrl(img)).filter(Boolean) as string[];
    }
    
    return [];
  };

  return {
    getImageUrl,
    getImagesUrls
  };
};