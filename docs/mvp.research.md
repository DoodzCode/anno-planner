### Action Items

- [ ]  Set up basic React app foundation with three-panel layout
- [ ]  Create left sidebar with building blocks of different grid sizes (4x3, 2x3)
- [ ]  Implement center canvas for blueprint placement
- [ ]  Build drag-and-drop functionality to move blocks from sidebar to canvas
- [ ]  Add empty placeholder for right panel

### Building Mechanics Discussion

- Team discussed whether building proximity and influence mechanics (pig farms, warehouses) should affect gameplay
- Concluded that influence from certain building types may not be significant enough to implement

### Building Types and Upgrade System

- Buildings have upgrade paths - farmer's houses can be upgraded to artisan's homes, worker's homes, or engineer's homes
- Some building types cannot be placed directly and must be reached through upgrades
- Question raised about whether visual sprites exist for all building upgrade levels
- Blueprint system should allow placing any building type that exists in the game, even those typically reached through upgrades
- Additional building types mentioned: colonial houses and arctic homes
- Team considered whether blueprints should account for specific upgrade levels or exclude certain stages

### Technical Implementation

- Decision made to build the application in React
- UI will use three-panel layout: left sidebar for building selection, center canvas for blueprint design, and right panel (empty for now)
- Initial implementation will use simple shapes as placeholders for building types
- Left panel will display blocks in various grid sizes to represent different building footprints
- Primary goal is to create actionable foundation demonstrating basic drag-and-drop interaction