---
Date: 2026-10-06
Dernière révision: 2026-10-06 (ticket #53 : collé une fois, que des URL)
Statut: actif — gabarit de l'en-tête de README de chaque produit (zUrp-Astronomics/.github → readme-kit/repos/<slug>.md), collé une fois en tête du README du dépôt et jamais recollé
Référencé par: scripts/readme-kit.mjs
Marqueurs: header.begin, header.end, header.notice, header.posterAlt, header.statusAlt, header.licenceAlt (kit.yml) ; pageUrl, posterUrl, statusBadgeUrl (le badge shields.io « endpoint » du JSON de statut), licenceBadgeUrl (le badge de licence GitHub, absent pour un produit sans dépôt)
Note: aucun texte de la fiche ici (nom, slogan, accroche, « based on », alt de l'affiche) — le bloc n'est jamais recollé, un tel texte se périmerait. Le texte du README s'écrit à la main, sous le bloc.
---

<!-- {{{header.begin}}} — {{{header.notice}}} -->
<div align="center">

<a href="{{{pageUrl}}}"><img src="{{{posterUrl}}}" alt="{{header.posterAlt}}" width="420"></a>

![{{{header.statusAlt}}}]({{{statusBadgeUrl}}})
{{#licenceBadgeUrl}}
![{{{header.licenceAlt}}}]({{{licenceBadgeUrl}}})
{{/licenceBadgeUrl}}

</div>

<!-- {{{header.end}}} -->
