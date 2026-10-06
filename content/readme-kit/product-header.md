---
Date: 2026-10-06
Dernière révision: 2026-10-06 (ticket #75 : les badges de licence logicielle et matérielle, dessinés par le site, après le badge de statut)
Statut: actif — gabarit de l'en-tête de README de chaque produit (zUrp-Astronomics/.github → readme-kit/repos/<slug>.md), collé une fois en tête du README du dépôt et jamais recollé
Référencé par: scripts/readme-kit.mjs
Marqueurs: header.begin, header.end, header.notice, header.posterAlt, header.statusAlt, header.softwareAlt, header.hardwareAlt (kit.yml) ; pageUrl, posterUrl, statusBadgeUrl (le badge shields.io « endpoint » du JSON de statut), softwareBadgeUrl, hardwareBadgeUrl (les badges de licence, SVG dessinés par le site, vides quand le dépôt ne déclare pas la licence)
Note: aucun texte de la fiche ici (nom, slogan, accroche, « based on », alt de l'affiche) — le bloc n'est jamais recollé, un tel texte se périmerait. Le texte du README s'écrit à la main, sous le bloc. Dans l'ordre : l'affiche, le badge de statut, le badge logiciel, le badge matériel.
---

<!-- {{{header.begin}}} — {{{header.notice}}} -->
<div align="center">

<a href="{{{pageUrl}}}"><img src="{{{posterUrl}}}" alt="{{header.posterAlt}}" width="420"></a>

![{{{header.statusAlt}}}]({{{statusBadgeUrl}}})
![{{{header.softwareAlt}}}]({{{softwareBadgeUrl}}})
![{{{header.hardwareAlt}}}]({{{hardwareBadgeUrl}}})

</div>

<!-- {{{header.end}}} -->
