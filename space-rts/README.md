# Space RTS - Essence Edition

A minimalist real-time strategy game that distills the RTS genre down to its core mechanics. Control photons, colonize planets, and dominate space!

## How to Play

1. Open `index.html` in a web browser
2. The game starts immediately with 3 teams (Red, Green, Blue) and randomly generated planets

## Game Mechanics

### Planets
- **Sizes**: 1, 2, or 3 (determines radius and photon emission rate)
- **Colored HP System**:
  - Each planet tracks HP separately for each team, but **only one team can have HP > 0 at a time**
  - Planet is controlled by the team with **HP ≥ 100**
  - When controlling team's HP drops below 100, planet becomes neutral (gray)
  - When defender reaches 0 HP, attacker starts building their HP on that planet
  - Max HP: 300 (achieves size 3)
  - Colored HP bar shows which team owns the planet and their progress
  - Prevents "sniping" - you must reduce enemy to 0 before building your HP
- **Pulse**: Every 2 seconds, controlled planets emit 1/2/3 photons based on size
- **Team Colors**: Red, Green, Blue, Gray (uninhabited)

### Photons
- Emitted from controlled planets
- Can be selected and directed by players
- Have different behaviors based on proximity to planets

### Controls
- **Drag (from empty space)**: Click and drag to create a selection circle around photons
- **Drag (from planet to planet)**: Click on a planet and drag to another planet to set up automatic photon routing
- **Click**: Click anywhere to send selected photons to that location, or click on a source planet to clear its route
- Selected photons show a subtle halo
- Active routes shown with dashed lines and arrows

### Photon Behaviors

1. **Orbital Mechanics**: Photons near friendly planets (within orbit radius) get pulled into orbit
2. **Planet Interaction** (Colored HP):
   - **Neutral Planet** (all teams at 0 HP): Photon adds +1 HP to its team
   - **Friendly Planet**: Photon adds +1 HP to your team
   - **Enemy Planet**: Photon subtracts -1 HP from enemy team (does NOT add to attacker)
   - **Takeover**: When defender reaches 0 HP, next attacker photon adds +1 HP to attacker's team
   - **Examples**:
     - Green 150 HP, Red photon hits → Green 149 HP, Red 0 HP
     - Green 1 HP, Red photon hits → Green 0 HP, Red 1 HP (takeover begins!)
     - Green 99 HP, Red photon hits → Green 98 HP, Red 0 HP (Green still building)
   - **Colonization**: First team to reach 100 HP controls the planet
3. **Enemy Attraction**: Enemy photons within ~large planet diameter attract and neutralize each other on collision

### Strategy Tips
- Build up your planets to size 3 for maximum photon production
- Use orbital mechanics to stockpile photons before an assault
- Set up planet-to-planet routes to automate resource flow
- Create supply lines from safe planets to frontline positions
- Enemy photons will collide - use this to your advantage
- Capture neutral planets early to expand your empire
- Attacking only reduces enemy HP - you must bring them to 0 before building your own
- A sustained attack is needed to take over enemy planets (can't snipe with 1 photon)
- Defend planets under attack before enemy reduces you to 0 HP
- Coordinate massive attacks to overwhelm enemy defenses

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
✅ Planet-to-planet routing for automated photon flow
✅ Visual route indicators with arrows
✅ **Colored HP system** - only one team can have HP on a planet at a time
✅ Visual HP bars showing which team controls each planet
✅ Orbital mechanics for friendly photons
✅ Enemy photon attraction and neutralization
✅ Dynamic planet control based on HP thresholds
✅ Real-time strategy gameplay

Enjoy the essence of RTS in space!
