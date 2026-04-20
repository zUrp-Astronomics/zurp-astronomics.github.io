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
  },
];
