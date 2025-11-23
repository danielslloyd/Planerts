# Space RTS - Essence Edition

A minimalist real-time strategy game that distills the RTS genre down to its core mechanics. Control photons, colonize planets, and dominate space!

## How to Play

1. Open `index.html` in a web browser
2. The game starts immediately with 3 teams (Red, Green, Blue) and randomly generated planets

## Game Mechanics

### Planets
- **Sizes**: 1, 2, or 3 (determines radius and photon emission rate)
- **HP System**:
  - Max HP = Size × 100 (Size 1: 100 HP, Size 2: 200 HP, Size 3: 300 HP)
  - Planet at 279 HP = Size 2, 79% upgraded to Size 3
  - Smaller planets capped at their max HP
  - 0 HP = uninhabited (gray) until reaching 100 HP
- **Pulse**: Every 2 seconds, controlled planets emit 1/2/3 photons based on size
- **Team Colors**: Red, Green, Blue, Gray (uninhabited)

### Photons
- Emitted from controlled planets
- Can be selected and directed by players
- Have different behaviors based on proximity to planets

### Controls
- **Drag**: Click and drag to create a selection circle around photons
- **Click**: Click anywhere to send selected photons to that location
- Selected photons show a subtle halo

### Photon Behaviors

1. **Orbital Mechanics**: Photons near friendly planets (within orbit radius) get pulled into orbit
2. **Planet Interaction**:
   - **Empty Planet**: Colonize when HP reaches 100
   - **Enemy Planet**: Attack (-1 HP per photon)
   - **Friendly Planet**: Heal/Upgrade (+1 HP if below max)
3. **Enemy Attraction**: Enemy photons within ~large planet diameter attract and neutralize each other on collision

### Strategy Tips
- Build up your planets to size 3 for maximum photon production
- Use orbital mechanics to stockpile photons before an assault
- Enemy photons will collide - use this to your advantage
- Capture neutral planets early to expand your empire

## Technical Details

- Built with HTML5 Canvas and vanilla JavaScript
- No external dependencies
- Runs entirely in the browser
- Real-time physics and collision detection

## Configuration

You can adjust game parameters in `game.js`:
- `PULSE_INTERVAL`: Time between photon emissions (default: 2000ms)
- `PLANET_MIN_DISTANCE`: Minimum distance between planets (default: 150px)
- `PLANET_COUNT`: Total number of planets (default: 12)
- `ATTRACTION_RANGE`: Range for enemy photon attraction (default: 80px)
- And more...

## Features

✅ Random planet generation with minimum distance constraint
✅ 3 teams with home planets
✅ Photon emission system with pulse timing
✅ Drag-to-select mechanics with visual feedback
✅ Click-to-move photon control
✅ Orbital mechanics for friendly photons
✅ Enemy photon attraction and neutralization
✅ Full HP system with colonization, attack, and upgrade
✅ Real-time strategy gameplay

Enjoy the essence of RTS in space!
