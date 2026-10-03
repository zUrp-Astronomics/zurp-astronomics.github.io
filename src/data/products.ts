// SOURCE: zurp-astronomics-site — product catalog data (posters, alt texts, accents)
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

export type ProductStatus = 'wip' | 'future' | 'released';

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  repo: string;
  status: ProductStatus;
  description: string[];
  basedOn?: string;
  /** Square propaganda poster (1254×1254 source), shown uncropped. */
  poster: ImageMetadata;
  /** What the poster shows — used as the image's alt text. */
  posterAlt: string;
  /** The poster's accent colour, read off the artwork. Tints the product page. */
  accent: string;
}

export const products: Product[] = [
  {
    slug: 'kaiju',
    name: 'Kaiju',
    tagline: 'Fully integrated harmonic alt-az mount for DSLR, like a SeeStar on steroids.',
    category: 'Mount',
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
  },
  {
    slug: 'berserker',
    name: 'Berserker',
    tagline: 'State-of-the-art harmonic equatorial mount, 3D printed with CNC machined core.',
    category: 'Mount',
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
  },
  {
    slug: 'unicorn',
    name: 'Unicorn',
    tagline: 'Small but effective controller for astronomical mount, in a Tic-Tac box size.',
    category: 'Controller',
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
  },
  {
    slug: 'kraken',
    name: 'Kraken',
    tagline: 'Compact but efficient powerbox, in a Raspberry Pi case.',
    category: 'Powerbox',
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
  },
  {
    slug: 'maelstrom',
    name: 'Maelstrom',
    tagline: 'APS-C cooled astronomical camera, with Nikon D40 CCD sensor.',
    category: 'Camera',
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
  },
  {
    slug: 'wraith',
    name: 'Wraith',
    tagline: 'All-in-One mount controller with a Compute Module 5.',
    category: 'Controller',
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
  },
  {
    slug: 'basilisk',
    name: 'Basilisk',
    tagline:
      'Sleek but deadly Sony E adapter for astro cameras, bending glass to your will without leaving the warm room.',
    category: 'Adapter',
    repo: 'https://github.com/zUrp-Astronomics/basilisk',
    status: 'wip',
    basedOn: 'Pinefeat',
    description: [
      'Basilisk is a Sony E adapter for astro cameras: put a Sony E lens on your astro camera and drive it remotely. The glass bends to your will, and you never leave the warm room.',
      'Based on the Pinefeat project, with the zUrp treatment. Open hardware like the rest of the catalog, under GPL-3.0.',
    ],
    poster: basiliskPoster,
    posterAlt:
      'Basilisk poster: a green-scaled mechanical serpent with glowing eyes and bared fangs rises from the clouds in a riveted porthole against the stars, under the slogan “Bend the glass to your will”.',
    accent: '#1fb814',
  },
];
