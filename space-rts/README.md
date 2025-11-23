# Space RTS - Essence Edition

A minimalist real-time strategy game that distills the RTS genre down to its core mechanics. Control photons, colonize planets, and dominate space!

## How to Play

1. Open `index.html` in a web browser
2. The game starts immediately with 3 teams (Red, Green, Blue) and randomly generated planets

## Game Mechanics

### Planets
- **Sizes**: 1, 2, or 3 (determines radius and photon emission rate)
- **Colored HP System**:
  - Each team has **separate HP** on every planet (Red HP, Green HP, Blue HP)
  - Planet is controlled by the team with the **highest HP ≥ 100**
  - When controlling team's HP drops below 100, planet becomes neutral (gray)
  - Max HP per team: 300 (achieves size 3)
  - Multiple colored HP bars show each team's progress on contested planets
  - Prevents "sniping" - you can't steal a planet with 1 photon if enemy has 99 HP
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
   - **Any Planet**: Photon always adds +1 HP to its own team's pool
   - **Enemy Planet**: Also subtracts -1 HP from the controlling team
   - **Example**: Red photon hits Green-controlled planet (Green 150 HP, Red 0 HP)
     - Result: Green 149 HP, Red 1 HP
   - **Colonization**: First team to reach 100 HP controls the planet
   - **Contested Planet**: If Green has 99 HP and Red sends 1 photon → Red gets 1 HP, planet stays neutral
3. **Enemy Attraction**: Enemy photons within ~large planet diameter attract and neutralize each other on collision

### Strategy Tips
- Build up your planets to size 3 for maximum photon production
- Use orbital mechanics to stockpile photons before an assault
- Set up planet-to-planet routes to automate resource flow
- Create supply lines from safe planets to frontline positions
- Enemy photons will collide - use this to your advantage
- Capture neutral planets early to expand your empire
- Watch for contested planets - multiple colored HP bars indicate ongoing battles
- Attacking reduces enemy HP AND builds your HP on that planet
- A planet at 0 HP for the controlling team reverts to neutral
- Coordinate attacks to reach 100 HP before enemies can defend

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
✅ **Colored HP system** - each team has separate HP on every planet
✅ Multi-colored HP bars showing contested planet status
✅ Orbital mechanics for friendly photons
✅ Enemy photon attraction and neutralization
✅ Dynamic planet control based on HP thresholds
✅ Real-time strategy gameplay

Enjoy the essence of RTS in space!
