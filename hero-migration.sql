USE digital_art_space;

ALTER TABLE artworks ADD COLUMN hero_order INT NULL;

UPDATE artworks SET hero_order = 1 WHERE slug = 'night-city';
UPDATE artworks SET hero_order = 2 WHERE slug = 'japantown';

SELECT slug, hero_order FROM artworks WHERE hero_order IS NOT NULL ORDER BY hero_order;