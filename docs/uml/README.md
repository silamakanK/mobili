# Diagrammes UML - Mobili

Ce dossier contient les sources PlantUML des diagrammes demandés pour Mobili, une plateforme web responsive de réservation de billets de transport interurbain au Mali.

## Fichiers

- `mobili-use-case.puml` : diagramme de cas d'utilisation.
- `mobili-class-diagram.puml` : diagramme de classes métier.
- `mobili-traveler-sequence.puml` : séquence recherche trajet, réservation, paiement et génération e-ticket.
- `mobili-boarding-control-sequence.puml` : séquence de contrôle embarquement par QR code.
- `mobili-component-diagram.puml` : architecture globale React.js, Node.js/Express, PostgreSQL et services externes.

## Export

Ces fichiers peuvent être ouverts avec PlantUML, l'extension PlantUML de VS Code, IntelliJ, ou importés dans Draw.io/diagrams.net si l'option PlantUML est disponible.

Commande d'export typique :

```bash
plantuml -tpng docs/uml/*.puml
plantuml -tpdf docs/uml/*.puml
```

Fournis les diagrammes au format UML standard, avec une mise en page claire et exportable en PNG/PDF pour une soutenance.
