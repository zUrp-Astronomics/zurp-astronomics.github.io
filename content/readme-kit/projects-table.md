---
Date: 2026-10-06
Statut: actif — le tableau d'une liste de projets du README de l'organisation (une ligne par produit)
Référencé par: content/readme-kit/org-readme.md ({{> projects}}), scripts/readme-kit.mjs
Marqueurs: par produit — name, tagline, basedOn, pageUrl, posterUrl, repo, hasRepo (faux pour un produit sans dépôt dédié)
Note: la miniature et le nom mènent à la page du produit sur le site ; le petit badge GitHub, et lui seul, mène au dépôt.
---

<table>
{{#products}}
<tr>
<td width="112"><a href="{{{pageUrl}}}"><img src="{{{posterUrl}}}" alt="{{name}} poster" width="100"></a></td>
<td><b><a href="{{{pageUrl}}}">{{name}}</a></b> — {{tagline}}{{#hasRepo}} <a href="{{{repo}}}"><img src="https://img.shields.io/badge/-GitHub-181717?logo=github" alt="GitHub repository"></a>{{/hasRepo}}{{#basedOn}}<br><sub>Based on {{basedOn}}</sub>{{/basedOn}}</td>
</tr>
{{/products}}
</table>
