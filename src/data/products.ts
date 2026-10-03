// SOURCE: zurp-astronomics-site — product catalog data (posters, alt texts, accents, catalog sections, poster slogans)
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active

import type { ImageMetadata } from 'astro';

import kaijuPoster from '../assets/posters/kaiju.webp';
import berserkerPoster from '../assets/posters/berserker.webp';
import unicornPoster from '../assets/posters/unicorn.webp';
import krakenPoster from '../assets/posters/kraken.webp';
import maelstromPoster from '../assets/posters/maelstrom.webp';
import wraithPoster from '../assets/posters/wraith.webp';
import basiliskPoster from '../assets/posters/basilisk.webp';

// Series 2 posters (worn enamel-plate style), used by the main site (v2, at `/`) only.
// The `poster2` / `poster2Alt` / `accent2` field names predate the swap that made v2 the main site
// (v1 is archived under /alternate/). They are kept on purpose: renaming them would be churn.
import kaijuPoster2 from '../assets/posters-2/2_kaiju.webp';
import berserkerPoster2 from '../assets/posters-2/2_berserker.webp';
import unicornPoster2 from '../assets/posters-2/2_unicorn.webp';
import krakenPoster2 from '../assets/posters-2/2_kraken.webp';
import maelstromPoster2 from '../assets/posters-2/2_maelstrom.webp';
import wraithPoster2 from '../assets/posters-2/2_wraith.webp';
import basiliskPoster2 from '../assets/posters-2/2_basilisk.webp';

export type ProductStatus = 'wip' | 'future' | 'released';

/**
 * Catalog sections of the main site's home page, in display order. Taken from the README of the
 * zUrp-Astronomics GitHub organisation; the next ticket generates the READMEs back from here, so
 * this list (and each product's `section`) is the single source. Inside a section, products keep
 * their order in `products` below. The v1 archive ignores sections (one flat grid, frozen).
 */
export const sections = [
  { id: 'mounts', title: 'Mounts' },
  { id: 'cameras', title: 'Cameras' },
  { id: 'gadgets', title: 'Gadgets' },
  { id: 'future', title: 'Future' },
] as const;

export type ProductSection = (typeof sections)[number]['id'];

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  /**
   * The slogan printed on the series 2 poster, transcribed from the artwork (the poster sets it in
   * capitals). Used by the README kit (scripts/readme-kit.mjs) and the GitHub social preview cards.
   */
  slogan: string;
  category: string;
  /** Catalog section on the main site's home page (see `sections`). */
  section: ProductSection;
  repo: string;
  status: ProductStatus;
  description: string[];
  basedOn?: string;
  /** Square propaganda poster (1254×1254 source), shown uncropped. v1 archive (/alternate/) only. */
  poster: ImageMetadata;
  /** What the poster shows — used as the image's alt text. */
  posterAlt: string;
  /** The poster's accent colour, read off the artwork. Tints the v1 archive's product page. */
  accent: string;
  /** Series 2 poster (1254×1254 source, worn plate with near-black opaque corners), main site (v2) only. */
  poster2: ImageMetadata;
  /** What the series 2 poster shows — its own creature and slogan. */
  poster2Alt: string;
  /** Series 2 accent, read off the poster's rays. Tints the main site's (v2) product page. */
  accent2: string;
}

export const products: Product[] = [
  {
    slug: 'kaiju',
    name: 'Kaiju',
    tagline: 'Fully integrated harmonic alt-az mount for DSLR, like a SeeStar on steroids.',
    slogan: 'Over-engineered by principle',
    category: 'Mount',
    section: 'mounts',
    repo: 'https://github.com/zUrp-Astronomics/kaiju',
    status: 'wip',
    description: [
      'Kaiju is a fully integrated harmonic alt-azimuth mount, designed for DSLR imaging with the ease of a SeeStar — but scaled up, printable, and hackable end-to-end.',
      'Harmonic drives replace traditional worm gears: zero backlash, silent tracking, holding torque without gravity compensation tricks. Everything in one sealed head, no separate controller box to carry.',
    ],
    poster: kaijuPoster,
    posterAlt:
      'Kaiju poster: a red-armoured mechanical kaiju roars out of the clouds in a riveted porthole against a starry sky, under the slogan “Over-engineered by principle”.',
    accent: '#c8141a',
    poster2: kaijuPoster2,
    poster2Alt:
      'Kaiju poster on a worn, chipped cream plate: a red-and-steel armoured mechanical kaiju with glowing red eyes roars in front of a pale full moon, one clawed hand thrust forward, between red rays and blueprint sketches of itself, above the slogan “Over-engineered by principle”.',
    accent2: '#d81f15',
  },
  {
    slug: 'berserker',
    name: 'Berserker',
    tagline: 'State-of-the-art harmonic equatorial mount, 3D printed with CNC machined core.',
    slogan: 'Forward to the stars',
    category: 'Mount',
    section: 'mounts',
    repo: 'https://github.com/zUrp-Astronomics/berserker',
    status: 'wip',
    description: [
      'Berserker is a state-of-the-art harmonic equatorial mount. 3D printed outer body, CNC machined structural core. Meant for heavier payloads than Kaiju — SCT, astrographs, long focal lengths.',
      'The design mixes FDM for the accessible parts and machined alu for the precision and rigidity surfaces. Open hardware all the way down — BOM, STEP, G-code, firmware.',
    ],
    poster: berserkerPoster,
    posterAlt:
      'Berserker poster: an orange-plated mechanical centaur archer with antlers and a mane of flames looses a laser arrow at the stars, its hooves on shattered rocks, in a riveted porthole, under the slogan “Forward to the stars”.',
    accent: '#f25a0a',
    poster2: berserkerPoster2,
    poster2Alt:
      'Berserker poster on a worn, chipped cream plate: an orange-plated mechanical centaur archer with antlers, glowing eyes and a mane of orange flames draws its bow and looses a laser arrow, hooves on rocky ground, in front of the full moon, orange rays and blueprint sketches, above the slogan “Forward to the stars”.',
    accent2: '#f75404',
  },
  {
    slug: 'unicorn',
    name: 'Unicorn',
    tagline: 'Small but effective controller for astronomical mount, in a Tic-Tac box size.',
    slogan: 'Small but effective',
    category: 'Controller',
    section: 'gadgets',
    repo: 'https://github.com/zUrp-Astronomics/unicorn',
    status: 'wip',
    basedOn: 'TeenAstro',
    description: [
      'Unicorn is a pocket-sized controller for astronomical mounts, fitting in a Tic-Tac box. Based on the TeenAstro project, adapted for minimal footprint and maximal portability.',
      'Full-featured despite the size: dual-axis stepper control, ST4 autoguide, WiFi/Bluetooth, INDI/ASCOM compatible. A Tic-Tac box that outperforms most commercial hand controllers.',
    ],
    poster: unicornPoster,
    posterAlt:
      'Unicorn poster: a rearing mechanical unicorn with violet armour plates and a flowing mane in a riveted porthole against the stars, under the slogan “Small but effective”.',
    accent: '#8a12c8',
    poster2: unicornPoster2,
    poster2Alt:
      'Unicorn poster on a worn, chipped cream plate: a rearing mechanical unicorn with cream armour plates, brass gears, a spiralled violet horn, a glowing violet eye and a flowing magenta-and-violet mane, in front of the full moon, violet rays and a blueprint sketch of a horse head, above the slogan “Small but effective”.',
    accent2: '#bd13ae',
  },
  {
    slug: 'kraken',
    name: 'Kraken',
    tagline: 'Compact but efficient powerbox, in a Raspberry Pi case.',
    slogan: 'Power to the people',
    category: 'Powerbox',
    section: 'gadgets',
    repo: 'https://github.com/zUrp-Astronomics/kraken',
    status: 'wip',
    basedOn: 'NAFAbox / Astralim',
    description: [
      'Kraken is a compact powerbox the size of a Raspberry Pi case. Based on the NAFAbox and Astralim projects, with zUrp opinions on layout and bring-up sequencing.',
      'Multiple 12V regulated outputs, PWM dew heaters, current monitoring, temperature/humidity sensors, all exposed over a simple protocol. Fits in the footprint of an RPi 4, plugs into your scope saddle.',
    ],
    poster: krakenPoster,
    posterAlt:
      'Kraken poster: a teal mechanical kraken with a golden eye coils its riveted tentacles through the clouds in a porthole against the stars and a moon, under the slogan “Power to the people”.',
    accent: '#094a47',
    poster2: krakenPoster2,
    poster2Alt:
      'Kraken poster on a worn, chipped cream plate: a teal-plated mechanical kraken with a golden eye coils its riveted tentacles, lined with steel suckers, out of crashing waves in front of the full moon, teal rays and blueprint sketches, above the slogan “Power to the people”.',
    accent2: '#0d7268',
  },
  {
    slug: 'maelstrom',
    name: 'Maelstrom',
    tagline: 'APS-C cooled astronomical camera, with Nikon D40 CCD sensor.',
    slogan: 'Freeze the noise!',
    category: 'Camera',
    section: 'cameras',
    repo: 'https://github.com/zUrp-Astronomics/maelstrom',
    status: 'wip',
    basedOn: 'Cam86 / Cam87',
    description: [
      'Maelstrom is an APS-C cooled astronomical camera, built around the CCD sensor salvaged from a Nikon D40. Based on the Cam86/Cam87 projects, which pioneered the DSLR-sensor-reborn-as-astrocam approach.',
      'Active TEC cooling with condensation control, 16-bit ADC path, INDI driver. The only way to get an APS-C CCD astrocam for under the price of a new CMOS — cannibalize a 2006 DSLR and do the electronics yourself.',
    ],
    poster: maelstromPoster,
    posterAlt:
      'Maelstrom poster: an ice-blue mechanical dragon spirals out of a swirling vortex of clouds in a riveted porthole against the stars, under the slogan “Freeze the noise!”.',
    accent: '#0a96f0',
    poster2: maelstromPoster2,
    poster2Alt:
      'Maelstrom poster on a worn, chipped cream plate: a steel mechanical sea dragon bristling with ice-blue crystal spikes, its eye glowing blue, bursts out of a churning wave in front of the full moon, ice-blue rays and blueprint sketches, above the slogan “Freeze the noise!”.',
    accent2: '#04b8fd',
  },
  {
    slug: 'wraith',
    name: 'Wraith',
    tagline: 'All-in-One mount controller with a Compute Module 5.',
    slogan: 'Ghost in the sky',
    category: 'Controller',
    section: 'future',
    repo: 'https://github.com/zUrp-Astronomics',
    status: 'future',
    description: [
      'Wraith is the future all-in-one controller: Raspberry Pi Compute Module 5 inside, full mount control stack + imaging pipeline + astrometry solver + web UI on one board.',
      'Replaces the usual mount controller + mini PC combo with a single compact unit. Status: design phase — no public repo yet.',
    ],
    poster: wraithPoster,
    posterAlt:
      'Wraith poster: a hooded steel-grey mechanical spectre with a glowing-eyed mask, a frame of gears and tubes, skeletal arms and floating armour plates dissolves into mist in a riveted porthole against the stars and a moon, under the slogan “Ghost in the sky”.',
    accent: '#8c8c8c',
    poster2: wraithPoster2,
    poster2Alt:
      'Wraith poster on a worn, chipped cream plate: a hooded mechanical spectre with glowing white eyes, a skeletal clawed arm and floating curved armour plates dissolves into swirling mist in front of the full moon, grey rays and blueprint sketches of its mask, above the slogan “Ghost in the sky”.',
    accent2: '#85878a',
  },
  {
    slug: 'basilisk',
    name: 'Basilisk',
    tagline:
      'Sleek but deadly Sony E adapter for astro cameras, bending glass to your will without leaving the warm room.',
    slogan: 'Bend the glass to your will',
    category: 'Adapter',
    section: 'gadgets',
    repo: 'https://github.com/zUrp-Astronomics/basilisk',
    status: 'wip',
    basedOn: 'Pinefeat',
    description: [
      'Basilisk is a Sony E adapter for astro cameras: put a Sony E lens on your astro camera and drive it remotely. The glass bends to your will, and you never leave the warm room.',
      'Based on the Pinefeat project, with the zUrp treatment. Open hardware like the rest of the catalog.',
    ],
    poster: basiliskPoster,
    posterAlt:
      'Basilisk poster: a green-scaled mechanical serpent with glowing eyes and bared fangs rises from the clouds in a riveted porthole against the stars, under the slogan “Bend the glass to your will”.',
    accent: '#1fb814',
    poster2: basiliskPoster2,
    poster2Alt:
      'Basilisk poster on a worn, chipped cream plate: a mechanical serpent with segmented steel coils and green crystal spines, a glowing green eye and a forked tongue, rears with fangs bared in front of the full moon, green rays and blueprint sketches of its head, above the slogan “Bend the glass to your will”.',
    accent2: '#05b40e',
  },
];
