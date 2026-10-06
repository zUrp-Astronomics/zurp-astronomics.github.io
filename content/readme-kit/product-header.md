---
Date: 2026-10-06
Statut: actif — gabarit de l'en-tête de README de chaque produit (zUrp-Astronomics/.github → readme-kit/repos/<slug>.md)
Référencé par: scripts/readme-kit.mjs
Marqueurs: name, slogan, tagline, posterAlt, basedOn, pageUrl, posterUrl, statusLabel, statusColor (catalog.yml), licence (licences/product-readme.md), begin / end (les marqueurs du bloc)
---

<!-- {{{begin}}} — {{{name}}} — {{{generated}}}. At the next update, replace everything from this line down to the {{{end}}} marker. -->
<div align="center">

<a href="{{{pageUrl}}}"><img src="{{{posterUrl}}}" alt="{{posterAlt}}" width="420"></a>

# [{{{name}}}]({{{pageUrl}}})

***{{{slogan}}}***

{{{tagline}}}

{{#badge}}status|{{{statusLabel}}}|{{{statusColor}}}{{/badge}}
[{{#badge}}hardware|{{{licences.hardware.short}}}|blue{{/badge}}]({{{licences.hardware.url}}})
[{{#badge}}software|{{{licences.software.short}}}|blue{{/badge}}]({{{licences.software.url}}})
{{#basedOn}}
{{#badge}}based on|{{{basedOn}}}|informational{{/badge}}
{{/basedOn}}

</div>

{{{licence}}}

<!-- {{{end}}} -->
