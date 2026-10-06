---
Date: 2026-10-06
Statut: actif — la phrase de licence de l'en-tête de README de chaque produit, en deux variantes
Référencé par: content/readme-kit/product-header.md (marqueur licence), scripts/readme-kit.mjs
Marqueurs: hardware.short / .url, software.short / .url (licences.yml) ; basedOn (le projet amont du produit)
Note: le bloc {{#basedOn}} sert aux produits dérivés d'un projet amont, le bloc {{^basedOn}} aux autres. Un produit dérivé suit la licence de son projet amont, jamais nommée ici (aucune n'a été vérifiée).
---

{{#basedOn}}
**Licence.** zUrp Astronomics publishes hardware (BOM, 3D/CAD files, PCB, mechanics) under [{{hardware.short}}]({{hardware.url}}), software and firmware under [{{software.short}}]({{software.url}}). This project is based on **{{basedOn}}**: it follows the licence of that upstream project, and the licence files of this repository have the final word.
{{/basedOn}}
{{^basedOn}}
**Licence.** This project publishes its hardware (BOM, 3D/CAD files, PCB, mechanics) under [{{hardware.short}}]({{hardware.url}}), software and firmware under [{{software.short}}]({{software.url}}).
{{/basedOn}}
