import type { Project } from './types';

/**
 * Project config — the single source of truth for every project.
 * Add, remove or reorder projects here; no animation code needs to change.
 * Field meanings are documented in ./types.ts.
 *
 * Photos live in content/photos/<project id>/ — run `npm run images` after adding
 * them, then refer to a photo by its file name without extension or size,
 * e.g. 'final-design' for content/photos/cooling-unit/final-design.png.
 */
export const projects: Project[] = [
  {
    id: 'cooling-unit',
    title: 'Mobile Harvest Buffer Cooling Unit',
    context: 'Engineering Design III · Team of 5 · 11 weeks',
    featured: true,
    summary:
      'A battery-electric, towable pre-cooler that chills strawberries to 1 °C right at the field.',
    visual: { type: 'photos' },
    steps: [
      {
        label: 'The problem',
        body:
          'Small Ontario strawberry farms have no cooling at the point of harvest, so fruit sits at 30.5 °C for 2–4 hours and loses 20–37% of its marketability.',
        bullets: [
          'Goal: cool fruit to 0–2 °C in the field, before it ever reaches cold storage.',
          'Off-grid, six vented flats, towable by one worker, keeps fruit dry, low-GWP refrigerant.',
        ],
        model: { src: 'models/cooling-unit.glb', title: 'Rotatable 3D model of the cooling unit assembly' },
        image: { src: 'strawberry-flat', alt: 'CAD of a standard 16 × 12 × 4 in vented strawberry flat, empty and loaded' },
      },
      {
        label: 'Choosing a concept',
        bullets: [
          'Ranked 7 concepts with weighted decision matrices.',
          'A why-why analysis showed the interim design fell short, so the team pivoted.',
        ],
        image: { src: 'interim-concept', alt: 'Annotated interim concept: solar-lid cooling cart with evaporator coil, DC compressor, battery and insulated compartment' },
      },
      {
        label: 'How it works',
        bullets: [
          'SolidWorks model of the cart, enclosure and flats with a 12 m/s forced-air cooling path.',
          'R-290 refrigeration cycle analysed on a P-h diagram; variable-speed compressor selected.',
          '48 V LiFePO₄ battery and inverter sized from a duty-cycle energy analysis.',
        ],
        embed: { src: 'animations/cart-section.html?v=3', title: 'Animated section view: airflow over the strawberry flats and the R-290 refrigeration loop' },
        image: { src: 'refrigeration-cutaway', alt: 'Labelled section view: mechanical compartment with R-290 compressor and condenser, evaporator coil and fan, and airflow over six strawberry flats' },
      },
      {
        label: 'Validation',
        bullets: [
          'ANSYS CFD confirmed the load cools from 30.5 °C to 1 °C in 2.17 hours — well inside the 4-hour window.',
          'SolidWorks FEA on the structure, plus a 10-year cost and carbon model.',
          'Built-in margins: +43% battery runtime, +43% evaporator area, +23% compressor capacity.',
        ],
        image: { src: 'flat-simulation', alt: 'Simulation contour plot on a vented strawberry flat' },
      },
      {
        label: 'What it achieved',
        stats: [
          { value: '2.17 hr', label: '30.5 → 1 °C' },
          { value: '1,640 W', label: 'Cooling load' },
          { value: '5.7 hr', label: 'Off-grid runtime' },
          { value: '$6,515', label: 'Capital cost' },
          { value: '~2 yr', label: 'Payback' },
        ],
        bullets: [
          '7× return over 10 years, at a fraction of the $15–30k cost of commercial units.',
          '461 kg CO₂e/yr avoided (R-290 GWP of 3 vs 1,430 for R-134a).',
          'Met every design criterion; recommended for prototype fabrication.',
        ],
        image: { src: 'final-design', alt: 'Final towable cooling cart design with overall dimensions' },
      },
    ],
  },
  {
    id: 'conveyor-cart',
    title: 'Detachable Conveyor Belt Cart',
    context: 'Linamar · Co-op',
    featured: true,
    summary: 'A transfer cart that docks between production conveyors, cutting operator handling time by 70%.',
    visual: { type: 'photos' },
    steps: [
      {
        label: 'The goal',
        body:
          'Move parts from one conveyor line to another without permanent fixtures. The cart had to attach and detach easily, stay stable in operation, and work with different conveyor setups.',
        image: { src: 'cart-cad', alt: 'SolidWorks model of the conveyor transfer cart on casters' },
      },
      {
        label: 'Reverse engineering the line',
        bullets: [
          'Measured the existing conveyors on the floor for dimensions, materials and compatibility.',
          'Produced detailed SolidWorks drawings with ASME Y14.5 GD&T.',
        ],
        image: { src: 'shaft-assembly-render', alt: 'Render of the cart frame with drive shaft and mounting plate' },
      },
      {
        label: 'How it works',
        bullets: [
          'A drive-shaft mechanism lets the operator couple and uncouple the cart from the conveyor drive.',
          'Locking profile plates lower and lock the pallet so the cart can be moved without the part falling off.',
        ],
        image: { src: 'drive-shaft-exploded', alt: 'Exploded view of the drive shaft coupling, handle and mounting flange' },
      },
      {
        label: 'What it achieved',
        stats: [{ value: '70%', label: 'Less operator handling time' }],
        bullets: ['The finished cart fit the existing assembly-line conveyors seamlessly.'],
        image: { src: 'cart-on-line', alt: 'The finished cart on the production floor' },
      },
    ],
  },
  {
    id: 'coffee-cup-gripper',
    title: 'Coffee Cup Gripper',
    context: 'Machine Design',
    featured: true,
    summary: 'A single-motor machine that grips a cup and moves it 20 cm up and 30 cm across.',
    visual: { type: 'photos' },
    steps: [
      {
        label: 'The challenge',
        body:
          'Design and build a machine that grips a coffee cup and moves it 20 cm vertically and 30 cm horizontally onto a platform — using only one motor.',
        image: { src: 'gripper-cad', alt: 'SolidWorks model of the wooden gripper frame with pulleys and motor' },
      },
      {
        label: 'How it works',
        bullets: [
          'A pulley train with an overall 1:8 ratio turns motor rotation into linear gripper motion, trading speed for torque.',
          'Drivetrain and motion path modelled in SolidWorks, then parts were CNC-fabricated and iterated for fit.',
        ],
        image: { src: 'pulley-train', alt: 'Close-up render of the pulley train with 1, 2 and 4 inch pulleys labelled' },
      },
      {
        label: 'What it achieved',
        stats: [
          { value: '4 s', label: 'Cycle time' },
          { value: '98%', label: 'Grade' },
        ],
        bullets: ['Smooth, repeatable transport, recognised for performance and design quality.'],
        image: { src: 'built-gripper', alt: 'The built gripper holding a red cup' },
      },
    ],
  },

  // ---------- More projects (grid cards) ----------
  {
    id: 'ansys-stress',
    title: 'ANSYS Stress Analysis',
    context: 'Finite Element Analysis',
    featured: false,
    summary: 'Validated stress-concentration factors in 1060-H12 aluminium plates to within 2% of theory.',
    steps: [
      {
        label: 'Idea',
        bullets: [
          'Study stress and deformation in 1060-H12 aluminium with FEA.',
          'Validate theoretical stress-concentration factors (K) for plates with different hole diameters.',
        ],
        image: { src: 'plate-hole-stress', alt: 'Stress contour around a hole in a meshed plate' },
      },
      {
        label: 'Process',
        bullets: [
          'Applied real-world boundary conditions in ANSYS.',
          'Refined mesh size from 0.05 m to 0.00425 m, targeting high-stress zones.',
          'Compared 2r/D and K-values against theory.',
        ],
        image: { src: 'bracket-mesh', alt: 'Meshed bracket model in ANSYS' },
      },
      {
        label: 'Results',
        bullets: [
          'K-values matched theory within 2%.',
          'Mesh convergence gave accurate stresses at low computational cost.',
        ],
        image: { src: 'hole-stress-detail', alt: 'Detailed stress contour near a hole' },
      },
    ],
  },
  {
    id: 'fixtures-tooling',
    title: 'Small Fixtures & Tooling',
    context: 'Co-op',
    featured: false,
    summary: 'Three shop-floor tools: a shaft puller, a two-cut saw fixture and a one-pass oiling fixture.',
    steps: [
      {
        label: 'Shaft removal tool',
        bullets: [
          'Two-piece interlocking tool grips the shaft while a slide hammer threads into the top.',
          'Faster shaft removal with less manual effort and less risk of damaging parts.',
          'Detailed SolidWorks drawings with GD&T.',
        ],
        image: { src: 'shaft-puller-photo', alt: 'Shaft removal tool fitted to a splined shaft' },
      },
      {
        label: 'Saw-cut fixture',
        bullets: [
          'Holds the part for a saw cut, then rotates to line up the second cut and produce a triangular section.',
          'Rotation angle and a tight fit calculated so the part still slides along the slot.',
          'Stable, accurate, efficient cuts.',
        ],
        image: { src: 'saw-fixture-photo', alt: 'Saw-cut fixture clamped on a milling table' },
      },
      {
        label: 'Oiling fixture',
        bullets: [
          'Oils the full circumference of the part in one go, with no manual brushing.',
          'Collects excess oil at the bottom for easy cleaning and maintenance.',
        ],
        image: { src: 'oil-fixture-photo', alt: 'Oiling fixture with a part seated in it' },
      },
    ],
    gallery: [
      { src: 'shaft-puller-cad', alt: 'CAD of the shaft removal tool on the part' },
      { src: 'shaft-puller-drawing', alt: 'Engineering drawing of the shaft removal tool' },
      { src: 'saw-fixture-cad', alt: 'CAD of the saw-cut fixture holding the part' },
      { src: 'oil-fixture-cad', alt: 'Transparent CAD of the oiling fixture' },
    ],
  },
  {
    id: 'oiling-tool',
    title: 'Spring-Loaded Inside-Out Oiling Tool',
    context: 'Co-op',
    featured: false,
    summary: 'A spring-loaded sponge tool that oils a part inside and out, cutting cycle time by 93%.',
    steps: [
      {
        label: 'Idea',
        bullets: [
          'Fully oil the inside and outside of a part and the O-ring on its stem.',
          'Easy enough for an operator to use 300 times per shift.',
        ],
        image: { src: 'oiling-tool-photo', alt: 'Oiling tool on a workbench with a part in place' },
      },
      {
        label: 'Process',
        bullets: [
          'Selected springs by spring rate and mounted them to a plate for linear motion.',
          'Shoulder bolts guide the springs so they cannot buckle sideways.',
          'Waterjet-cut sponges to the part’s dimensions.',
        ],
        image: { src: 'spring-mechanism', alt: 'Exploded CAD of the spring-loaded plate and shoulder bolts' },
      },
      {
        label: 'Results',
        bullets: [
          'Supports the part’s weight yet compresses under light force.',
          'Sponges oil the inner and outer walls and the O-ring.',
          'Oiling cycle time reduced by 93%.',
        ],
        image: { src: 'oiling-tool-cad', alt: 'CAD of the oiling tool with the part seated' },
      },
    ],
  },
  {
    id: 'reef-rover',
    title: 'Autonomous Reef Rover',
    context: 'Guelph Engineering Competition · 3rd place',
    featured: false,
    summary: 'A rover prototype that sorts orange balls from white ones — a stand-in for collecting algae off coral reefs.',
    steps: [
      {
        label: 'Idea',
        bullets: [
          'Build a prototype that collects orange balls from among white ones and deposits them in a box.',
          'Represents a rover collecting algae from coral reefs; needs both a collection and a deposit mechanism.',
        ],
        image: { src: 'rover-prototype', alt: 'Wired rover prototype with a collection arm' },
      },
      {
        label: 'Process',
        bullets: [
          'Team of five, splitting the work by each member’s strengths.',
          'Functional digital assembly in SolidWorks.',
          'Colour sensor, servo motors and a slider mechanism.',
        ],
        image: { src: 'rover-cad', alt: 'SolidWorks render of the rover' },
      },
      {
        label: 'Results',
        bullets: [
          'Working prototype that completed the task.',
          'Presented the design process to the judges and placed 3rd.',
        ],
        image: { src: 'collection-mechanism', alt: 'Hand-held test of the servo collection mechanism' },
      },
    ],
  },
  {
    id: 'hydraulic-hand',
    title: 'Reverse-Engineered Hydraulic Hand',
    context: 'Engineering Design II · Team of 5',
    featured: false,
    summary: 'Took apart a 200+ part toy hydraulic arm and rebuilt it as a full SolidWorks assembly.',
    steps: [
      {
        label: 'Idea',
        body: 'Reverse engineer a toy hydraulic arm with over 200 parts by disassembling, analysing and recreating it in SolidWorks.',
        image: { src: 'hand-assembly', alt: 'Full SolidWorks assembly of the hydraulic hand' },
      },
      {
        label: 'Process',
        bullets: [
          'Worked out each part’s role in the mechanism.',
          'Measured every part and built a functional digital assembly.',
          'Produced a 2D drawing for each part.',
        ],
        image: { src: 'hand-exploded', alt: 'Exploded view of the hydraulic hand' },
      },
      {
        label: 'Results',
        bullets: [
          'Fully replicated the hydraulic hand in SolidWorks.',
          'Strong teamwork and a detailed understanding of hydraulic systems and complex assemblies.',
        ],
        image: { src: 'part-drawing', alt: 'Engineering drawing of one hand component' },
      },
    ],
  },
  {
    id: 'toy-plane',
    title: 'Kinder Toy Plane',
    context: 'Engineering Design II',
    featured: false,
    summary: 'A snap-together, rubber-band-powered toy plane that packs into a Kinder Surprise egg.',
    steps: [
      {
        label: 'Idea',
        bullets: [
          'A reconfigurable 3D-printed toy for toddlers that fits inside a Kinder Surprise egg when taken apart.',
          'Moves forward on its own with a mechanism that uses zero stored potential energy.',
        ],
        image: { src: 'plane-photo', alt: 'Assembled 3D-printed toy plane' },
      },
      {
        label: 'Process',
        bullets: [
          'Lightweight SolidWorks design with aerofoil-shaped wings and a rubber-band propeller.',
          'Push-pin trigger holds the propeller once wound.',
          'Split into parts that pack into the egg, joined with snap fits.',
        ],
        image: { src: 'plane-exploded', alt: 'Exploded view of the toy plane parts' },
      },
      {
        label: 'Results',
        bullets: [
          'Met all project constraints and toddler safety criteria.',
          'Pitched as a product: design, material and manufacturing cost, and marketing.',
        ],
        image: { src: 'egg-packaging', alt: 'Plane parts packed inside a transparent egg' },
      },
    ],
  },
  {
    id: 'meccano-launcher',
    title: 'Meccano Car Ball Launcher',
    context: 'Engineering Design I · 2nd place',
    featured: false,
    summary: 'An Arduino-driven Meccano car with a catapult that hits a target with a ping-pong ball.',
    steps: [
      {
        label: 'Idea',
        bullets: [
          'Build a Meccano vehicle with motors, a breadboard circuit and an Arduino for forward and reverse motion.',
          'Add a launcher that shoots a ping-pong ball at a target.',
        ],
        image: { src: 'car-photo', alt: 'Finished Meccano car with decorative flames' },
      },
      {
        label: 'Process',
        bullets: [
          'Motor drives the axle through an elastic band.',
          '3D-printed ball holder integrated with a catapult.',
          'Manual clip-release mechanism to fire.',
        ],
        image: { src: 'exploded-view', alt: 'Exploded view of the Meccano car' },
      },
      {
        label: 'Results',
        bullets: ['Hit the target directly and placed 2nd in the competitive evaluation.'],
        image: { src: 'chassis-wiring', alt: 'Car chassis with Arduino wiring' },
      },
    ],
  },
];
