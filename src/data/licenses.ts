// SOURCE: zurp-astronomics-site — licence rule shown on every product page (main site and v1 archive)
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active
//
// The human's rule (spec, section Licences): hardware (BOM, 3D/CAD files, PCB, mechanics) under
// OCL v1.1, software / firmware under GPL-3.0 by default, and a project derived from an upstream
// project follows the upstream licence. The site states the RULE only: it never names the licence
// of an upstream project (TeenAstro, NAFAbox / Astralim, Cam86 / Cam87, Pinefeat): none has been
// checked, and the repositories are not necessarily up to date. The project's repository is the
// reference. Rendered by src/components/LicenseText.astro (the sentence) and by both product pages
// (the badges), so the main site and the v1 archive cannot drift apart on a legal statement.

export const licenses = {
  hardware: {
    badge: 'Hardware · OCL v1.1',
    short: 'OCL v1.1',
    name: 'Open Community License v1.1 (Prusa Research)',
    url: 'https://github.com/OpenCommunityLicence/OpenCommunityLicence',
  },
  software: {
    badge: 'Software · GPL-3.0',
    short: 'GPL-3.0',
    name: 'GNU General Public License v3.0',
    url: 'https://www.gnu.org/licenses/gpl-3.0.html',
  },
} as const;
