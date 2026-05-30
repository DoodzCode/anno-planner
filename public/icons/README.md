# Building Icons

Drop extracted Anno 1800 building icon files here.

Filename format matches the `iconFile` field in `src/data/buildings-1800.json`.
Example: `A7_wood_log.png`, `A7_potatoes.png`

Canvas will automatically load `<img src="/icons/{building.iconFile}">` and fall back
to the colored rectangle if the file is missing.
