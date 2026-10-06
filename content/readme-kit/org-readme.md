---
Date: 2026-10-06
Statut: actif — gabarit du README de l'organisation (zUrp-Astronomics/.github → profile/README.md), régénéré à chaque déploiement
Référencé par: scripts/readme-kit.mjs
Marqueurs: voir content/README.md — {{x}} échappé pour le HTML, {{{x}}} tel quel ; {{#badge}}libellé|message|couleur{{/badge}} = un badge shields.io ; {{> projects}} = le tableau de projects-table.md
---

<!-- zUrp-Astronomics/.github → profile/README.md — {{{generated}}}. Copy the whole file. -->
<div align="center">

<img src="{{{panelUrl}}}" alt="{{panelAlt}}" width="480">

# {{{name}}}

*{{{tagline}}}*

{{#badge}}status|work in progress|orange{{/badge}}
[{{#badge}}hardware|{{{licences.hardware.short}}}|blue{{/badge}}]({{{licences.hardware.url}}})
[{{#badge}}software|{{{licences.software.short}}}|blue{{/badge}}]({{{licences.software.url}}})
{{#badge}}tech|open hardware|informational{{/badge}}

<sub>{{{licence}}}</sub>

[**🌐 {{{siteHost}}}**]({{{siteUrl}}})

</div>

---

## 👋 Hi here

Welcome to DIY hell. {{{pitch}}}

## 🚀 Projects

### Work in Progress ⚠ NOT YET VALIDATED ⚠

{{#wipSections}}
#### {{{title}}}

{{> projects}}

{{/wipSections}}
{{#future}}
### {{{title}}} projects

{{> projects}}

{{/future}}
### Released ✅

{{#releasedSections}}
#### {{{title}}}

{{> projects}}

{{/releasedSections}}
{{^releasedSections}}
*Soon ©️*

{{/releasedSections}}
---

<div align="center">

*{{{signature}}}*

</div>
