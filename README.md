# Kookboek (static HTML)

Een superlichte recepten-app zonder framework. Host 'm gratis via **GitHub Pages** en laat iedereen met repo-toegang online wijzigen.

## Snel starten
1. Maak een lege GitHub-repo, bijvoorbeeld `kookboek`.
2. Upload alle bestanden uit deze map naar de hoofdfolder van de repo.
3. Zet **GitHub Pages** aan: *Settings → Pages → Build and deployment → Deploy from branch* en kies de `main`-branch en de `/(root)` map. Sla op.  
4. Na het builden staat je site live op `https://<jouw-account>.github.io/kookboek/`.

## Samenwerken / online aanpassen
- Nodig anderen uit als **Collaborator** of gebruik Pull Requests.
- Je kunt direct in de browser bewerken: open een bestand en klik op **Edit** (pennetje). Opslaan commit automatisch.
- Elke wijziging is meteen zichtbaar na de volgende Pages-build.

## Inhoud toevoegen
De recepten staan in `recipes.json`. Voor elk recept:
```json
{
  "slug": "unieke-url-naam",
  "title": "Naam van het recept",
  "description": "Korte teaser",
  "image": "images/voorbeeld.png",
  "time": "30 min",
  "servings": "4",
  "tags": ["tag1", "tag2"],
  "ingredients": ["..."],
  "steps": ["..."]
}
```
- Voeg een plaatje toe in de map `images/` en verwijs ernaar in het recept.
- De detailpagina staat op `recipe.html?slug=<slug>`.
- De zoekbalk filtert op titel, tags en beschrijving.

## Tip: een vriendelijke editor (optioneel)
Als je liever een CMS-interface wilt in plaats van JSON te bewerken, kun je later **Decap (Netlify) CMS** of **TinaCMS** toevoegen zodat wijzigingen nog steeds in GitHub belanden. Laat me weten als je die setup wilt; dan lever ik de config-bestanden.

## Licentie
MIT — gebruik en pas alles vrij aan.
