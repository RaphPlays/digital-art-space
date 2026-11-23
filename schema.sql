USE digital_art_space;

CREATE TABLE IF NOT EXISTS artists (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  slug         VARCHAR(80)  NOT NULL UNIQUE,
  name         VARCHAR(120) NOT NULL,
  role_label   VARCHAR(120) NOT NULL,
  bio          TEXT         NOT NULL,
  portrait_url VARCHAR(500) NOT NULL,
  portrait_alt VARCHAR(200) NOT NULL DEFAULT '',
  user_id      INT NULL UNIQUE,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS artworks (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  slug         VARCHAR(80)  NOT NULL UNIQUE,
  artist_id    INT          NOT NULL,
  card_title   VARCHAR(160) NOT NULL,
  dialog_title VARCHAR(200) NOT NULL,
  meta         VARCHAR(255) NOT NULL,
  description  TEXT         NOT NULL,
  category     VARCHAR(40)  NOT NULL,
  orientation  ENUM('landscape','portrait') NOT NULL DEFAULT 'portrait',
  is_wide      TINYINT(1)   NOT NULL DEFAULT 0,
  image_url    VARCHAR(500) NOT NULL,
  image_alt    VARCHAR(300) NOT NULL DEFAULT '',
  hero_order   INT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  created_by   INT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_artworks_artist (artist_id),
  KEY idx_artworks_category (category)
);

INSERT IGNORE INTO artists (slug, name, role_label, bio, portrait_url, portrait_alt, sort_order) VALUES ('bungie', 'Bungie', 'Game studio', 'Building worlds for Guardians and their legends.', 'Bungie.jpg', 'Bungie logo', 1);
INSERT IGNORE INTO artists (slug, name, role_label, bio, portrait_url, portrait_alt, sort_order) VALUES ('sunrise', 'Sunrise', 'Animation studio', 'Mecha stories brought to life through animation.', 'Sunrise_Logo.png', 'Sunrise logo', 2);
INSERT IGNORE INTO artists (slug, name, role_label, bio, portrait_url, portrait_alt, sort_order) VALUES ('square-enix', 'Square Enix', 'Game studio', 'Expansive worlds shaped by character and journey.', 'Square-Enix.jpg', 'Square Enix logo', 3);
INSERT IGNORE INTO artists (slug, name, role_label, bio, portrait_url, portrait_alt, sort_order) VALUES ('riot', 'Riot Games', 'Game studio', 'Distinctive champions and stories across imagined worlds.', 'Riot-Games.png', 'Riot Games logo', 4);
INSERT IGNORE INTO artists (slug, name, role_label, bio, portrait_url, portrait_alt, sort_order) VALUES ('cd-projekt-red', 'CD Projekt Red', 'Game studio', 'Creating story-driven role-playing games built around memorable characters and richly detailed worlds.', 'CDPR.jpg', 'CD Projekt Red logo', 5);

INSERT IGNORE INTO artworks (slug, artist_id, card_title, dialog_title, meta, description, category, orientation, is_wide, image_url, image_alt, sort_order)
  VALUES ('final-shape', (SELECT id FROM artists WHERE slug = 'bungie'), 'The Final Shape', 'The last light', 'Destiny 2: The Final Shape / Key art', 'A meeting of shadow and brilliance: a distant world caught between its history and what comes next.', 'worlds', 'landscape', 1, 'Destiny-2-Epic-Saga.jpeg', 'A group of Guardians framed by warm shadow and pale light', 1);
INSERT IGNORE INTO artworks (slug, artist_id, card_title, dialog_title, meta, description, category, orientation, is_wide, image_url, image_alt, sort_order)
  VALUES ('hunter-vanguard', (SELECT id FROM artists WHERE slug = 'bungie'), 'The Hunter Vanguard', 'A reluctant legend', 'Cayde-6 / Character art', 'A portrait of a quick-witted wanderer, rendered in metal, worn edges, and a watchful blue glow.', 'characters', 'portrait', 0, 'Cayde-6.jpeg', 'Close-up portrait of a hooded science-fiction character', 2);
INSERT IGNORE INTO artworks (slug, artist_id, card_title, dialog_title, meta, description, category, orientation, is_wide, image_url, image_alt, sort_order)
  VALUES ('build-burning', (SELECT id FROM artists WHERE slug = 'sunrise'), 'Build Burning', 'Determination and sheer willpower', 'BG-011B Build Burning Gundam / Mecha illustration', 'A machine built at monumental scale, wrapped in the flames of fury.', 'machines', 'portrait', 0, 'BG-011B.jpg', 'Red and white mobile suit surrounded by fire', 3);
INSERT IGNORE INTO artworks (slug, artist_id, card_title, dialog_title, meta, description, category, orientation, is_wide, image_url, image_alt, sort_order)
  VALUES ('unbreakable-spear', (SELECT id FROM artists WHERE slug = 'riot'), 'The Unbreakable Spear', 'The weight of a vow', 'Dragonslayer Pantheon / Character art', 'A solitary champion stands against a weathered world, carrying the weight of an unfinished story.', 'characters', 'landscape', 1, 'Pantheon_DragonslayerSkin.jpg', 'Armored warrior standing with a shield and spear in a fiery landscape', 4);
INSERT IGNORE INTO artworks (slug, artist_id, card_title, dialog_title, meta, description, category, orientation, is_wide, image_url, image_alt, sort_order)
  VALUES ('lucis-caelum', (SELECT id FROM artists WHERE slug = 'square-enix'), 'Lucis Caelum', 'The long way home', 'Final Fantasy XV / Environment art', 'A band of travelers pauses at the edge of a vast landscape, where the road seems to keep going beyond the image.', 'worlds', 'portrait', 0, 'FFXV.jpg', 'Travelers gathered beneath a wide, cloud-filled sky', 5);
INSERT IGNORE INTO artworks (slug, artist_id, card_title, dialog_title, meta, description, category, orientation, is_wide, image_url, image_alt, sort_order)
  VALUES ('full-armor', (SELECT id FROM artists WHERE slug = 'sunrise'), 'Full Armor', 'Armor for another age', 'FA-78 Full Armor Gundam / Mecha illustration', 'A close study of layered armor and engineered detail, where every surface suggests motion and purpose.', 'machines', 'portrait', 0, 'Full-Armor.jpg', 'Detailed science-fiction mecha armor against a dark background', 6);
INSERT IGNORE INTO artworks (slug, artist_id, card_title, dialog_title, meta, description, category, orientation, is_wide, image_url, image_alt, sort_order)
  VALUES ('night-city', (SELECT id FROM artists WHERE slug = 'cd-projekt-red'), 'Night City', 'Night City', 'Cyberpunk 2077 / Environment art', 'A rain-dark urban skyline glows with electric signs and impossible height.', 'worlds', 'landscape', 1, 'Night-City.jpg', 'Night City skyline illuminated by neon signs', 7);
INSERT IGNORE INTO artworks (slug, artist_id, card_title, dialog_title, meta, description, category, orientation, is_wide, image_url, image_alt, sort_order)
  VALUES ('japantown', (SELECT id FROM artists WHERE slug = 'cd-projekt-red'), 'Japantown', 'Japantown', 'Cyberpunk 2077 / Capture', 'V rides into Japantown, surrounded by the blue and magenta glow of the city after dark.', 'worlds', 'landscape', 1, 'V-in-Japantown.png', 'V looking across Japantown''s neon-lit skyline at night', 8);

UPDATE artworks SET hero_order = 1 WHERE slug = 'night-city' AND hero_order IS NULL;
UPDATE artworks SET hero_order = 2 WHERE slug = 'japantown' AND hero_order IS NULL;

SELECT (SELECT COUNT(*) FROM artists) AS artists, (SELECT COUNT(*) FROM artworks) AS artworks;