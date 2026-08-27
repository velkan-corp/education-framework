export const TAB_TAGS: Record<string, string> = {
  books: 'Books',
  anime: 'Anime',
  cinema: 'Film & TV',
  comics: 'Comics',
  game: 'Games',
  maker: 'Maker',
};

export const EXTRA_TAG_LABELS: Record<string, string> = {
  english: 'English',
  spanish: 'Spanish',
  french: 'French',
  japanese: 'Japanese',
  strategy: 'Strategy',
  classics: 'Classics',
  philosophy: 'Philosophy',
  stem: 'STEM',
};

export const ALL_TAG_LABELS: Record<string, string> = { ...TAB_TAGS, ...EXTRA_TAG_LABELS };

export const ALL_TAG_LABELS_ES: Record<string, string> = {
  books: 'Libros',
  anime: 'Anime',
  cinema: 'Cine y TV',
  comics: 'Cómics',
  game: 'Juegos',
  maker: 'Creación',
  english: 'Inglés',
  spanish: 'Español',
  french: 'Francés',
  japanese: 'Japonés',
  strategy: 'Estrategia',
  classics: 'Clásicos',
  philosophy: 'Filosofía',
  stem: 'CTIM',
  activity: 'Actividad',
  physical: 'Físico',
};
