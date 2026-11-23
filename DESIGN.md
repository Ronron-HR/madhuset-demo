# DESIGN.md — Madhuset Løgten (demo)

Gælder den udgivne version på https://ronron-hr.github.io/madhuset-logten-demo/. Læs denne fil, før du ændrer noget visuelt. Opdatér den, når designet ændres, så den kun beskriver det, der faktisk er implementeret.

## 1. Visuel retning: "Fra døråbningen til jeres bord"
Gæsten ser først det rigtige rum, som når man træder ind til en opdækket fest, og derefter sit eget selskab tage form i bordplanen. Stedets materialer styrer designet: hvid dug, træstole, glas, lys fra vinduerne og gule blomster.
- **Palette** (tokens i `css/tokens.css`): ink `#231C15`, paper `#FBF9F4` (hvid dug), surface `#EFE8DA`, accent `#7B4A20` (træ, kun knapper og totalpris), line `#D8CFBE`, sun `#E9B824` (gule blomster, kun små markeringer), oak `#A9743A` (stole i 3D). Ingen gradienter, glød, pilleknapper, parallax, scroll-effekter eller automatisk bevægelse.
- **Typografi** (selv-hostet, OFL 1.1): Young Serif til overskrifter, Public Sans til tekst. Skala 14/16/20/28/44/72, spacing 4/8/16/24/40/64/104, radius 0.
- **Komposition**: forsiden er et stort foto med en kompakt flade; Lokalet er billeder og bordplan; Menu er mad; Bestil mad er produktkort; Pris og Kontakt er værktøj. Sider må ikke se ens ud.
- Kontrast målt efter WCAG AA, alle tekst/baggrund-par over 7:1.

## 2. Billedvalg og kilder
Research startede på Madhusets Instagram (https://www.instagram.com/madhusetloegten/). Profilen kan åbnes uden login i en browser. 12 opslag (11 billedopslag og 1 reel) og 14 billeder i fuld størrelse blev gennemgået. **Der findes ikke et bredt foto af den tomme, opdækkede sal på Instagram.** Eneste salbillede (opslag DATrEWEMB3g, billede 2) viser mange gæster ved bordene og bruges ikke uden samtykke. Resten er madfotos, plakater og skærmbilleder fra DR (ikke brugbare). Derfor kommer sal- og bordfotoene fra Madhusets side på mondrups.com, og to madfotos kommer fra Instagram. Alle billeder er hentet, optimeret til webp og ligger lokalt i `img/`. De bruges i demoen og fjernes, hvis stedet ønsker det.

| Side | Placering | Lokal fil | Kilde (direkte link) | Karrusel | Beskæring mobil / desktop |
|---|---|---|---|---|---|
| Forside | Hero, salfoto | `img/sal-m-720.webp`, `sal-m-1080.webp` (mobil), `sal-960/1440/1920.webp` (desktop) | https://mondrups.com/wp-content/uploads/2026/03/Loegten_RAISFOTO_C1__0176-1.webp (RAISFOTO). Instagram har intet bredt salfoto. | – | Mobil: 4:3-udsnit (1708×1281 fra x=160) om bordene. Desktop: hele billedet, `object-position 50% 68%`, højde = skærmen minus header |
| Forside | Kort "Hold fest i Madhuset", indgang til 3D | `img/bord-640.webp`, `bord-1000.webp` | https://mondrups.com/wp-content/uploads/2026/03/Bryllup-scaled-1.webp (RAISFOTO) | – | 2:3 stående, `object-fit: cover` |
| Forside, Bestil mad | Kort "Bestil mad" og sidens øverste foto | `img/ig-nytaar-bord-720.webp`, `ig-nytaar-bord-1280.webp` | Instagram-opslag https://www.instagram.com/madhusetloegten/p/C1XH8D6o8w9/ (27.12.2023, nytårsmenu) | billede 1 af 2 | Mobil 3:2 uændret. Desktop 21:8-udsnit |
| Forside, Lokalet | "Plads til at samle dem", sal ved vinduerne | `img/sal-vindue.webp` | https://mondrups.com/wp-content/uploads/2026/03/Loegten_RAISFOTO_C1__0210.webp | – | Uændret / 4:5 udsnit |
| Lokalet | Stort foto øverst | samme som forsidens hero | se forsiden | – | Som forsiden, men 16:7 på desktop |
| Lokalet | Reol med glas | `img/sal-bar.webp` | https://mondrups.com/wp-content/uploads/2026/03/Logten_RAISFOTO_C1__1424-1-1.webp | – | 4:5 udsnit |
| Menu | Øverste foto | `img/ig-blomkaal-720.webp`, `ig-blomkaal-1280.webp` | Instagram-opslag https://www.instagram.com/madhusetloegten/p/CKKcVubjTAp/ (17.1.2021) | enkelt billede | Mobil 16:9. Desktop 16:7-udsnit |
| Menu | Små retter | `img/forretter.webp` | https://mondrups.com/wp-content/uploads/2026/03/Loegten_RAISFOTO_C1__0246-scaled-1.jpg | – | Stående |
| Bestil mad | Juleand | `img/juleand-640.webp`, `juleand-900.webp` | https://mondrups.com/wp-content/uploads/2026/10/juleand-parteret-med-tilbehoer.webp (produktsiden https://mondrups.com/product/juleand-2026/) | – | 4:3 udsnit |
| Bestil mad | Nytårsmenu | `img/nytaar-640.webp`, `nytaar-1000.webp` | https://mondrups.com/wp-content/uploads/2026/09/nytaarsmenu-2026-oksemoerbrad.jpg (produktsiden https://mondrups.com/product/nytaarsmenu-2026/) | – | 4:3 udsnit |
| 3D-dialog | "Foto af lokalet" ved siden af bordplanen | `img/sal-960.webp` | som forsidens hero | – | `object-position 50% 70%` |

Ikke brugt: produktfoto til fællesspisning (filnavnet siger "Vegetarisk", menuen er nakkesteg, så det kunne vildlede). Ingen fotos med genkendelige personer. Ingen stockfotos eller genererede billeder.
**Regel:** Ved fremtidige visuelle ændringer starter billedarbejdet med Madhusets officielle billedmateriale og Instagram. Vælg konkrete billeder, notér direkte kilde, hent og optimér lokalt, og kontrollér dem på skærmbilleder af den udgivne side.

## 3. Forside
- **Første skærm:** salfotoet i fuld bredde og højde (desktop: skærmhøjde minus header, mellem 520 og 860 px). En kompakt hvid flade (bredde max 27 rem og 47 % af skærmen) ligger over reolen øverst til venstre, så bordene stadig ses. Mobil: foto først, derefter fladen.
- **Overskrift:** "Hele huset til jeres fest" (44 px), kicker "Selskabslokale i Løgten · 25–60 gæster", én linje under ("3-retters buffet og huset i 7 timer").
- **Knapper:** "Beregn jeres pris" (primær) og "Bestil mad" (sekundær) i fladen. "Se jeres bord i 3D" ligger på selve fotoet nederst til højre. På mobil (390 px) ender alle tre over bunden af første skærm.
- **905 px:** kontrolleret specifikt. Fotoet fylder hele bredden og er ikke klemt til en stribe. Navigationen står på én linje.
- **To veje ind** lige under nøgletallene: "Hold fest i Madhuset" (foto af dækket bord = indgang til 3D, pris og link til menuen) og "Bestil mad" (foto fra Instagram, kort om nytårsmenu, juleand og fællesspisning). Selskabskortet siger, at buffet er med i pakken og linker til "Læs om maden".
- Derefter: sal ved vinduerne, bordplan for 30 og 55 gæster, priseksempler (30: 19.470 kr., 40: 21.460 kr., 55: 28.945 kr.).

## 4. 3D som signatur: "Se bordet blive dækket"
Mærket "Illustreret bordplan". Mål, vinduer og indretning er ikke fra stedet. Der findes intet 360°-foto. Three.js r160 (MIT) ligger i `js/vendor/` og hentes først, når gæsten åbner dialogen.
- **Startvinkel "Ved bordet":** gæstehøjde (kamera ca. 1,7 m) i gangen ved siden af langbordet, med blik langs bordet mod buffetten. **"Ovenfra"** viser hele opstillingen, gange og buffet (mærket "Buffet"). Skift mellem vinklerne glider kort. "Nulstil udsyn" vender tilbage til den valgte vinkel. Gæsten kan også dreje med finger, mus, knapper eller piletaster (Home nulstiller).
- **Model:** lyse duge, træstole, tallerkener, glas, lys i glas og gule blomster som lette, genbrugte former (stole, tallerkener og glas er instanced). Blødt sidelys og diskrete skygger. Ingen bevægelse, før gæsten gør noget.
- **30 → 55 gæster:** 30 er en del af 55. De tre midterste borde er fælles og står stille. Ved 55 glider to nye borde ind fra siderne, og hvert fælles bord får én ekstra stol. Kameraet står stille. Hvert møbel har et mål og en fremgang, så hurtige skift frem og tilbage aldrig efterlader møbler fra den forrige opstilling. Det valgte antal vises straks ("55 gæster · 5 borde"). Ved reduceret bevægelse skifter alt straks.
- **Prisberegner:** knappen i dialogen hedder "Beregn pris for 30 gæster" eller "…55 gæster" og åbner `pris.html?gaester=N`. Desktop: bordplan og "Foto af lokalet" side om side. Mobil: valgfri fane. Uden 3D eller WebGL vises den valgte plantegning ovenfra, og man kan stadig skifte antal og gå videre til prisen.

## 5. Pris, Lokalet, Menu, Kontakt
- **Pris:** gæstetal og grundpris med obligatorisk rengøring først (40 gæster: 21.460 kr.). "Spørg om jeres dato" ligger ved totalen. Ekstra timer, dug og servering ligger under "Tilvalg". Rengøring og tilvalg på hver sin linje. Mailknappen åbner en udfyldt mail i gæstens eget program og sender intet. Kopiér-boks og telefonlink. Satser: 499 kr. ved 35–60 gæster, 599 kr. ved 25–34, rengøring 1.500 kr., dug 25 kr., servering 275 kr./time, ekstra time 1.500 kr. Kilde: https://mondrups.com/madhuset/.
- **Lokalet:** foto, bordplan (to tegninger + 3D), praktisk, samarbejdspartnere. **Menu:** 3-retters buffet; retterne er ikke offentliggjort og skrives ikke ind. **Kontakt:** dato og antal samlet i en udfyldt mail, telefon, adresse og vejvisning.

## 6. Bestil mad (regler)
Madbestilling holdes adskilt fra Madhusets pris for lokale og buffet. Siden (`bestil.html`) har to dele:
1. **Bestil direkte hos Mondrups.** Varer fra Mondrups' webshop (https://mondrups.com/shop/), hentet 23.11.2026: Juleand 500 kr. pr. and til 4–6 kuverter, afhentning 23.12 kl. 14–16, sidste bestilling 20.12. Nytårsmenu 2026 500 kr. pr. kuvert, mindst 2, afhentning 31.12 kl. 10–12, sidste bestilling 30.12, ingen vegetar- eller specialkost. Fællesspisning onsdag 2.12 kl. 17:15, 199 kr. voksen og 99 kr. barn under 10. Hvert kort viser pris, indhold, afhentning, frist (beregnes mod dags dato) og et overslag efter antal. Knappen går til den rigtige produktside på mondrups.com. Antal overføres ikke, fordi webshoppen ikke dokumenterer det. Der bestilles og betales intet fra demoen.
2. **Få et tilbud på maden** (fest, reception, bryllup, konfirmation, fødselsdag). Mondrups har ikke offentliggjort priser. Siden samler anledning, antal kuverter, dato og ønsker i en mail til info@mondrups.com (kan åbnes eller kopieres) og linker til Mondrups' tilbudsformular og telefon. Der står tydeligt, at det er en forespørgsel. Fra 30 kuverter er hentet fra Mondrups' fest- og receptionssider.
- Hvis et officielt bestillingssystem ændrer sig, opdatér data-attributterne i `bestil.html`. Vis aldrig en ordre som betalt eller bekræftet.

## 7. Regler der gælder fortsat
- Opfind ikke fakta, priser, anmeldelser, retter eller billeder. Ukendt står som ukendt.
- Stockfoto kun til stemning og aldrig som stedets egne. Intet foto uden kilde. Genkendelige personer kræver samtykke.
- Demoen er markeret ("Demo af OviaSpecs · ikke Madhusets egen side"), er noindex, og fotos fjernes efter ønske.
- Alle farver og størrelser kommer fra tokens. Ingen nye farver uden at opdatere denne fil.

## 8. Gennemgang før udgivelse
Tag skærmbilleder af forside, Lokalet, Menu og Bestil mad ved 390, 905 og 1440 px. Kontrollér, at billederne faktisk vises og ikke er klemt, at 3D → 55 gæster → pris virker, og at Bestil mad → produkt/forespørgsel virker. Test mail uden at sende.
