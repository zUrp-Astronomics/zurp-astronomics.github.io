---
Date: 2026-10-20
Statut: actif — gabarit du pied de page de README des produits (zUrp-Astronomics/.github → readme-kit/footer.md), le même pour tous, collé une fois à la fin du README de chaque dépôt, à la place de la signature écrite à la main, et jamais recollé
Référencé par: scripts/readme-kit.mjs
Marqueurs: footer.begin, footer.end, footer.notice, footer.plateAlt, footer.signatureAlt, footer.siteLabel, footer.orgLabel (kit.yml) ; siteUrl (le site, sans `/` final), orgUrl (l'organisation GitHub), plateUrl (la plaque émaillée, servie par le site), signatureUrl (la signature, dessinée par le site depuis content/site.yml)
Note: aucun nom de produit, aucun texte de la signature ici — le bloc n'est jamais recollé, un tel texte se périmerait. Dans l'ordre : la plaque (lien vers le site), la signature, les deux liens en texte.
---

<!-- {{{footer.begin}}} — {{{footer.notice}}} -->
<p align="center"><a href="{{{siteUrl}}}/"><img src="{{{plateUrl}}}" alt="{{footer.plateAlt}}" width="400"></a></p>

<p align="center"><img src="{{{signatureUrl}}}" alt="{{footer.signatureAlt}}" width="400"></p>

<p align="center"><a href="{{{siteUrl}}}/">{{footer.siteLabel}}</a> · <a href="{{{orgUrl}}}">{{footer.orgLabel}}</a></p>
<!-- {{{footer.end}}} -->
