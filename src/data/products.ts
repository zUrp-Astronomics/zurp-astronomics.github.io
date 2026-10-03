// SOURCE: zurp-astronomics-site — product catalog data (posters, alt texts, accents, catalog sections, poster slogans)
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active

import type { ImageMetadata } from 'astro';

// Series 2 posters (worn enamel-plate style, 1254×1254 RGB WebP q90 effort 6 from the workshop's
// ready-room PNGs). The only poster series since the v1 archive was deleted (ticket #35).
import kaijuPoster from '../assets/posters/kaiju.webp';
import berserkerPoster from '../assets/posters/berserker.webp';
import unicornPoster from '../assets/posters/unicorn.webp';
import krakenPoster from '../assets/posters/kraken.webp';
import maelstromPoster from '../assets/posters/maelstrom.webp';
import cyclopsPoster from '../assets/posters/cyclops.webp';
import wraithPoster from '../assets/posters/wraith.webp';
import basiliskPoster from '../assets/posters/basilisk.webp';

export type ProductStatus = 'wip' | 'future' | 'released';

/**
 * Catalog sections of the main site's home page, in display order. Taken from the README of the
 * zUrp-Astronomics GitHub organisation; the next ticket generates the READMEs back from here, so
 * this list (and each product's `section`) is the single source. Inside a section, products keep
 * their order in `products` below.
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
  /** Series 2 poster (1254×1254 source, worn plate with near-black opaque corners). */
  poster: ImageMetadata;
  /** What the poster shows — its creature and slogan. Used as the image's alt text. */
  posterAlt: string;
  /** Accent, read off the poster's rays. Tints the product page (badge fill nudged to ≥ 4.5:1). */
  accent: string;
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
      'Kaiju poster on a worn, chipped cream plate: a red-and-steel armoured mechanical kaiju with glowing red eyes roars in front of a pale full moon, one clawed hand thrust forward, between red rays and blueprint sketches of itself, above the slogan “Over-engineered by principle”.',
    accent: '#d81f15',
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
      'Berserker poster on a worn, chipped cream plate: an orange-plated mechanical centaur archer with antlers, glowing eyes and a mane of orange flames draws its bow and looses a laser arrow, hooves on rocky ground, in front of the full moon, orange rays and blueprint sketches, above the slogan “Forward to the stars”.',
    accent: '#f75404',
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
      'Unicorn poster on a worn, chipped cream plate: a rearing mechanical unicorn with cream armour plates, brass gears, a spiralled violet horn, a glowing violet eye and a flowing magenta-and-violet mane, in front of the full moon, violet rays and a blueprint sketch of a horse head, above the slogan “Small but effective”.',
    accent: '#bd13ae',
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
      'Kraken poster on a worn, chipped cream plate: a teal-plated mechanical kraken with a golden eye coils its riveted tentacles, lined with steel suckers, out of crashing waves in front of the full moon, teal rays and blueprint sketches, above the slogan “Power to the people”.',
    accent: '#0d7268',
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
      'Maelstrom poster on a worn, chipped cream plate: a steel mechanical sea dragon bristling with ice-blue crystal spikes, its eye glowing blue, bursts out of a churning wave in front of the full moon, ice-blue rays and blueprint sketches, above the slogan “Freeze the noise!”.',
    accent: '#04b8fd',
  },
  {
    // In Cameras despite its `future` status: the human's explicit call (ticket #35).
    slug: 'cyclops',
    name: 'Cyclops',
    tagline: 'Autonomous embedded astrometry finder: one eye on the sky, so your visual scope always knows where it points.',
    slogan: 'One eye to find them all',
    category: 'Camera',
    section: 'cameras',
    repo: 'https://github.com/zUrp-Astronomics',
    status: 'future',
    basedOn: 'diofinder',
    description: [
      'Cyclops is an autonomous astrometry finder: a Raspberry Pi Zero 2 W and an HQ camera behind a telephoto lens, riding on the tube and plate-solving the sky to know exactly where your telescope is pointing.',
      'Based on the diofinder project. It talks to the mount and to your phone, so a purely visual telescope gets precise pointing with no imaging camera and no laptop in the field. Status: design phase — no public repo yet.',
    ],
    poster: cyclopsPoster,
    posterAlt:
      'Cyclops poster on a worn, chipped cream plate: a hulking mechanical giant in yellow and steel armour plates bristling with spikes, a single glowing yellow lens for an eye, looms in front of the full moon, yellow rays and blueprint sketches of itself, above the slogan “One eye to find them all”.',
    accent: '#fbd102',
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
      'Wraith poster on a worn, chipped cream plate: a hooded mechanical spectre with glowing white eyes, a skeletal clawed arm and floating curved armour plates dissolves into swirling mist in front of the full moon, grey rays and blueprint sketches of its mask, above the slogan “Ghost in the sky”.',
    accent: '#85878a',
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
      'Basilisk poster on a worn, chipped cream plate: a mechanical serpent with segmented steel coils and green crystal spines, a glowing green eye and a forked tongue, rears with fangs bared in front of the full moon, green rays and blueprint sketches of its head, above the slogan “Bend the glass to your will”.',
    accent: '#05b40e',
  },
];
