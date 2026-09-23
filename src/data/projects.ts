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
    // The tile's actual cover is always the 3D model (coverModels() takes
    // priority), so this is never shown — it only exists so coverImage()'s
    // fallback doesn't pick 'strawberry-flat' (used on two different steps
    // below) as the "cover", which would suppress it on whichever step
    // isn't shown first.
    cover: 'final-design',
    gallery: [{ src: 'final-design', alt: 'Dimensioned CAD drawing of the final cooling cart design' }],
    steps: [
      {
        label: 'What?',
        bulletsCollapsed: true,
        bulletsSummary: [
          'A mobile, battery-electric pre-cooling cart for farms without cold storage.',
          'Cools berries from *30.5 °C to 1 °C* right at the field to stop spoilage before it starts.',
        ],
        bullets: [
          'Designed a mobile, *battery-electric forced-air pre-cooling cart* that brings refrigeration directly to the harvest site for small-scale Ontario strawberry farms without fixed cold storage.',
          'Aimed to cool freshly picked berries from *30.5 °C to 1 °C* within the harvest window, eliminating the 2–4 hour ambient delay that drives *Botrytis cinerea* (grey mould) growth. Each hour of delay costs roughly one day of shelf life.',
        ],
        model: { src: 'models/cooling-unit.glb', title: 'Rotatable 3D model of the cooling unit assembly' },
        image: { src: 'strawberry-flat', alt: 'CAD of a standard 16 × 12 × 4 in vented strawberry flat, empty and loaded' },
      },
      {
        label: 'How?',
        embed: { src: 'animations/cart-section.html?v=10', title: 'Animated section view: airflow over the strawberry flats and the R-290 refrigeration loop' },
        image: { src: 'refrigeration-cutaway', alt: 'Labelled section view: mechanical compartment with R-290 compressor and condenser, evaporator coil and fan, and airflow over six strawberry flats' },
        cards: [
          {
            title: 'Refrigeration Cycle',
            preview: [
              { label: 'Refrigerant', value: 'R-290 (propane)' },
              { label: 'Evaporator temperature', value: '−9 °C' },
              { label: 'Capacity', value: '~2,010 W' },
              { label: 'Design load', value: '1,640 W' },
            ],
            bullets: [
              'Engineered a *vapour-compression refrigeration cycle* using *R-290 (propane) refrigerant (GWP = 3)* driven by a *variable-speed Secop SLVE18CN compressor*. It is rated at ~2,010 W at −9 °C, giving *23% capacity headroom* over the 1,640 W design load.',
              'Performed a full *thermal load analysis* covering forced convection, wall conduction, and lid infiltration. This showed that strawberry field heat accounts for *96.9%* of the load, and every downstream component was sized from that figure.',
              'Sized a *fin-and-tube evaporator coil* (83 fins at 5 fins/cm, 32.0 m² vs. 22.41 m² required) and verified a −9 °C evaporator temperature analytically. Heat is rejected through *twin fan-assisted microchannel condensers* at 40 °C.',
              'Specified *1.6 in PIR foam insulation* (k = 0.023 W/m·K) over PUR, limiting wall and infiltration losses to only *3.1%* of the total load.',
            ],
          },
          {
            title: 'Battery and Power System',
            preview: [
              { label: 'Battery', value: '48 V, 80 Ah LiFePO₄' },
              { label: 'Startup surge', value: '28% below inverter rating' },
              { label: 'Runtime', value: '5.70 hours per charge' },
            ],
            bullets: [
              'Designed the *off-grid power system*: a *48 V, 80 Ah LiFePO₄ battery* paired with a *4,000 W inverter*.',
              'Sized for a 4-hour session at 60% duty cycle with a *43% capacity margin* — the *2,890 W compressor startup surge* stays comfortably below the inverter rating.',
            ],
          },
          {
            title: 'Validation',
            preview: [{ label: 'Method', value: 'ANSYS CFD airflow simulation' }],
            bullets: [
              'Validated cooling performance with *ANSYS CFD*, showing berry surface temperatures of ~13 °C at 30 minutes and ~1 °C at 2 hours. This agreed with the analytical cooling-time prediction.',
              'Modelled the enclosure around *standard vented strawberry flats* in SolidWorks. It uses a wagon-style chassis with front-wheel steering and thick-tread tires to move with pickers over rough field terrain.',
            ],
          },
        ],
      },
      {
        // No heading: continues the "How?" section above with a second visual.
        label: '',
        image: { src: 'strawberry-flat', alt: 'CAD of the standard vented strawberry flat, empty and loaded' },
      },
      {
        label: 'What It Achieved',
        stats: [
          { value: '2.2 hr', label: '30.5 → 1 °C' },
          { value: '1600 W', label: 'Cooling load' },
          { value: '6 hours', label: 'Off-grid runtime' },
          { value: '$6,500', label: 'Capital cost' },
          { value: '2 years', label: 'Payback' },
        ],
        bulletsCollapsed: true,
        bullets: [
          'Cools a full *109 kg load (6 flats)* to 1 °C in *2.17 hours*, with *5.70 hours* of battery runtime per charge, enough for two full loads.',
          'Achieved a real system *COP of 2.09*, with the variable-speed compressor running at *81.6% partial load (~786 W)*.',
          'Recovers an estimated *$5,292 annually* in spoilage losses (base case), against a total annual ownership cost of just *$865*.',
          'Delivered a *6.3 benefit-to-cost ratio* with a *2-year discounted payback* on a *$6,515* capital investment.',
          'Projected a *+$45,690 10-year cumulative net benefit* (7.0× return).',
          'Avoids a net *461 kg CO₂e annually* through reduced food waste, roughly equivalent to powering an Ontario home for 18 days.',
          'Removes the cold-chain access barrier for small farms by acting as a dedicated pre-cooler at the point of harvest.',
        ],
      },
    ],
  },
  {
    id: 'conveyor-cart',
    title: 'Detachable Conveyor Belt Cart',
    context: 'Linamar · Co-op',
    featured: true,
    summary: 'A transfer cart that docks between production conveyors, cutting operator handling time by 70%.',
    steps: [
      {
        label: 'What?',
        bullets: [
          'Designed a *detachable transfer cart* to move parts between conveyor belts, replacing manual lifting and carrying with a wheeled, quick-attach handoff.',
          'Goal: reduce manual part handling and stay compatible with varying conveyor setups without permanent fixtures.',
        ],
        image: { src: 'cart-cad', alt: 'SolidWorks model of the conveyor transfer cart on casters' },
      },
      {
        label: 'How?',
        bullets: [
          'Reverse-engineered the existing conveyors on the floor to capture dimensions, materials, and interface points.',
          'Built the frame from *T-slot aluminum extrusion*, mounted on casters for mobility across the shop floor.',
        ],
        model: {
          src: 'models/conveyor-cart.glb',
          title: 'Animated 3D model of the conveyor transfer cart',
          animation: 'conveyor-shaft',
        },
        image: { src: 'shaft-assembly-render', alt: 'Render of the cart frame with drive shaft and mounting plate' },
      },
      {
        // No heading: continues the "How?" section above with a second visual.
        label: '',
        bullets: [
          'Designed a *drive shaft mechanism* letting the operator attach and detach the cart from the conveyor system, paired with *locking profile plates* that lower and lock the pallet in place so parts don’t shift or fall in transit.',
          'Produced detailed technical drawings in SolidWorks incorporating *ASME Y14.5 GD&T* standards.',
        ],
        image: { src: 'drive-shaft-exploded', alt: 'Exploded view of the drive shaft coupling, handle and mounting flange' },
      },
      {
        label: 'Results',
        stats: [{ value: '70%', label: 'Less operator handling time' }],
        bullets: [
          'Cart mated seamlessly with the existing conveyor lines on the assembly floor.',
          'Reduced operator handling time by *70%*.',
        ],
        image: { src: 'cart-on-line', alt: 'The finished cart on the production floor' },
      },
    ],
  },
  {
    id: 'fixtures-tooling',
    title: 'Assembly Line Fixtures & Tooling',
    context: 'Co-op',
    featured: false,
    summary: 'Three shop-floor tools: a shaft puller, a two-cut saw fixture and a one-pass oiling fixture.',
    steps: [
      {
        label: 'Shaft Removal Tool',
        bullets: [
          'Designed a *2-piece interlocking tool* that clamps onto a shaft while a hammer puller threads into the top, pulling the shaft cleanly from its ring.',
          'Enabled quick, repeatable shaft removal while cutting manual effort and the risk of damaging surrounding components.',
        ],
        image: { src: 'shaft-puller-photo', alt: 'Shaft removal tool fitted to a splined shaft' },
        model: {
          src: 'models/shaft-adapter.glb',
          title: 'Animated 3D model of the shaft removal tool',
          brightness: 0.5,
          animation: 'shaft-puller',
        },
      },
      {
        label: 'Saw-Cut Fixture',
        bullets: [
          'Built a fixture that holds a part stable for an initial saw cut, then *rotates to align the first cut with the second*, combining both passes into a clean triangular section.',
          'Produced stable, accurate cuts with both passes consistently aligned.',
        ],
        image: { src: 'saw-fixture-photo', alt: 'Saw-cut fixture clamped on a milling table' },
        model: {
          src: 'models/ptu-gear-cutting-fixture.glb',
          title: 'Animated 3D model of the saw-cut fixture',
          brightness: 0.5,
          animation: 'ptu-gear-cutting',
        },
      },
      {
        label: 'Oiling Fixture',
        bullets: [
          'Designed a tool to oil the full circumference of a part — inside, outside, and the O-ring — in one pass with no manual brushing, plus a fixture that collects excess oil at the base for easy cleanup.',
          'Delivered full, even oil coverage while eliminating manual brushing.',
        ],
        image: { src: 'oil-fixture-photo', alt: 'Oiling fixture with a part seated in it' },
        model: {
          src: 'models/oiling-assembly.glb',
          title: 'Animated 3D model of the oiling fixture',
          margin: 1.35,
          brightness: 0.5,
          animation: 'oiling-sensor',
        },
      },
    ],
  },
  {
    id: 'coffee-cup-gripper',
    title: 'Coffee Cup Gripper',
    context: 'Machine Design',
    featured: true,
    summary: 'A single-motor machine that grips a cup and moves it 20 cm up and 30 cm across.',
    steps: [
      {
        label: 'What?',
        bullets: [
          'Designed and fabricated a *single-motor machine* to grip a coffee cup and move it 20 cm vertically and 30 cm horizontally onto a platform.',
          'Goal: efficient, precise pick-and-place motion off just one motor.',
        ],
        image: { src: 'gripper-cad', alt: 'SolidWorks model of the wooden gripper frame with pulleys and motor' },
        model: { src: 'models/coffee-cup-gripper.glb', title: '3D model of the coffee cup gripper', margin: 1.25 },
      },
      {
        label: 'How?',
        bullets: [
          'Converted single-motor RPM into *linear gripper motion* using a pulley train with an overall *1:8 ratio* to boost torque and control speed.',
          'Modeled the drivetrain and motion path in SolidWorks, then fabricated the parts in the *university shop on standard machinery*, iterating for fit.',
        ],
        image: { src: 'pulley-train', alt: 'Close-up render of the pulley train with 1, 2 and 4 inch pulleys labelled' },
      },
      {
        label: 'Results',
        stats: [
          { value: '4 s', label: 'Cycle time' },
          { value: '98%', label: 'Grade' },
        ],
        bullets: [
          'Achieved smooth, repeatable transport with a *5-second* cycle time.',
          'Earned a *98% grade* for performance and design quality.',
        ],
        image: { src: 'built-gripper', alt: 'The built gripper holding a red cup' },
        video: {
          src: 'animations/coffee-cup-gripper.mp4',
          poster: 'animations/coffee-cup-gripper-poster.webp',
          title: 'Video of the built gripper transporting a cup',
        },
      },
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
        label: 'What?',
        bullets: [
          'Designed a tool to fully oil a part’s inside and outside surfaces, including the O-ring on its stem, durable enough for *300 uses per shift*.',
        ],
        model: {
          src: 'models/oiling-tool.glb',
          title: 'Animated 3D model of the spring-loaded oiling tool, the coil lowering into the sponge',
          animation: 'oiling-tool-coil',
          margin: 1.4,
          transparentParts: ['Holder'],
        },
        image: { src: 'oiling-tool-photo', alt: 'Oiling tool on a workbench with a part in place' },
      },
      {
        label: 'How?',
        bullets: [
          'Sized a spring for the right rate to give smooth linear motion, guided by shoulder bolts to keep it from bending sideways, and waterjet-cut sponges to the part’s exact dimensions for full-surface contact.',
        ],
        model: {
          src: 'models/oiling-tool.glb',
          title: 'Exploded 3D model of the spring-loaded oiling tool: the coil, the fixed sponge assembly, the moving plate and the holder, top to bottom',
          margin: 1.15,
          // Pulled apart along Y (this model's own vertical axis — see the
          // 'oiling-tool-coil' comment in modelAnimations.ts) into the
          // requested top-to-bottom order, each part offset just enough to
          // clear the one above it by a consistent gap, worked out from
          // this model's own part heights, not eyeballed:
          //   Coil   Y 0.0403–0.0883 (h 0.0480)    -> top slot,    offset +0.0114
          //   Fixed  Y 0.0142–0.0364 (h 0.0222)    -> 2nd slot,    offset −0.0102
          //   Moving Plate Y −0.0368–0.0292 (h 0.0660) -> 3rd slot, offset −0.0498
          //   Holder Y −0.0508–0.0367 (h 0.0875)   -> bottom slot, offset −0.1487
          // (each slot's top = the slot above's bottom minus a 0.025 gap; this
          // export's parts sit at the same relative heights as the previous
          // one — re-verified against this file's own geometry, not assumed —
          // so the same offsets still land the stack within half a millimetre
          // of a consistent 0.025 m gap)
          explode: [
            { part: 'ASM_Coil', offset: [0, 0.0114, 0] },
            { part: 'Fixed', offset: [0, -0.0102, 0] },
            { part: 'Moving_Plate', offset: [0, -0.0498, 0] },
            { part: 'Holder', offset: [0, -0.1487, 0] },
          ],
        },
        image: { src: 'spring-mechanism', alt: 'Exploded CAD of the spring-loaded plate and shoulder bolts' },
      },
      {
        label: 'Results',
        stats: [{ value: '93%', label: 'Cycle time cut' }],
        bullets: [
          'Spring compressed under light force while still supporting the part’s weight; sponges fully lubricated the inside/outside walls and O-ring.',
          'Cut oiling cycle time by *93%*.',
        ],
        image: { src: 'oiling-tool-cad', alt: 'CAD of the oiling tool with the part seated' },
      },
    ],
  },
  {
    id: 'ansys-stress',
    title: 'ANSYS Stress Analysis',
    context: 'Finite Element Analysis',
    featured: false,
    summary: 'Validated stress-concentration factors in 1060-H12 aluminium plates to within 2% of theory.',
    cover: 'stress-render',
    gallery: [{ src: 'stress-render', alt: 'ANSYS stress contour render of the plate with a central hole' }],
    steps: [
      {
        label: 'What?',
        bullets: [
          'Investigated stress distribution and deformation in *1060-H12 aluminum* plates with holes, validating theoretical stress concentration factors (K-values) against simulation.',
        ],
        image: { src: 'plate-hole-stress', alt: 'Stress contour around a hole in a meshed plate' },
      },
      {
        label: 'How?',
        bullets: [
          'Applied real-world boundary conditions in ANSYS, refining mesh size from *0.05 m down to 0.00425 m* with targeted refinement in high-stress zones around the holes, balancing accuracy against computational cost.',
        ],
        image: { src: 'bracket-mesh', alt: 'Meshed bracket model in ANSYS' },
      },
      {
        label: 'Results',
        stats: [{ value: '<2%', label: 'Error vs. theory' }],
        bullets: [
          'Validated simulated K-values against theory within *<2% error*.',
        ],
        image: { src: 'hole-stress-detail', alt: 'Detailed stress contour near a hole' },
      },
    ],
  },
  {
    id: 'reef-rover',
    title: 'Autonomous Reef Rover',
    context: 'Guelph Engineering Competition · 3rd place',
    featured: false,
    summary: 'A rover prototype that sorts orange balls from white ones — a stand-in for collecting algae off coral reefs.',
    cover: 'rover-chassis-render',
    gallery: [{ src: 'rover-chassis-render', alt: 'CAD render of the rover chassis with wheels, battery and electronics' }],
    steps: [
      {
        label: 'What?',
        bullets: [
          'Designed and built a rover to collect orange balls among white ones and deposit them into a box, modeling a rover collecting algae off coral reefs.',
        ],
        image: { src: 'rover-prototype', alt: 'Wired rover prototype with a collection arm' },
      },
      {
        label: 'How?',
        bullets: [
          'Modeled a functional digital assembly in SolidWorks; built the collection/deposit mechanism around a *color sensor*, servo motors, and a slider mechanism, in a 5-person team split by strengths.',
        ],
        image: { src: 'rover-cad', alt: 'SolidWorks render of the rover' },
      },
      {
        label: 'Results',
        stats: [{ value: '3rd', label: 'Place' }],
        bullets: [
          'Functioning prototype completed the task and secured *3rd place*.',
        ],
        image: { src: 'collection-mechanism', alt: 'Hand-held test of the servo collection mechanism' },
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
        label: 'What?',
        bullets: [
          'Designed a *reconfigurable 3D-printed toy plane* for toddlers that collapses to fit inside a Kinder Surprise egg and self-propels forward using *zero stored energy input* once wound.',
        ],
        image: { src: 'plane-photo', alt: 'Assembled 3D-printed toy plane' },
        model: {
          src: 'models/toy-plane.glb',
          title: 'Animated 3D model of the toy plane, propeller spinning',
          animation: 'propeller-spin',
        },
      },
      {
        label: 'How?',
        bullets: [
          'Modeled a lightweight design in SolidWorks with aerofoil-shaped wings and a rubber-band-powered propeller, a push-pin trigger to hold the propeller after winding, and snap joints for tool-free assembly.',
        ],
        image: { src: 'plane-exploded', alt: 'Exploded view of the toy plane parts' },
        video: {
          src: 'animations/toy-plane.mp4',
          poster: 'animations/toy-plane-poster.webp',
          title: 'Animated assembly of the toy plane, part by part',
        },
      },
      {
        label: 'Results',
        bullets: [
          'Met all toddler safety and project constraints; presented as a consumer product covering design, material cost, manufacturing cost, and marketing strategy.',
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
        label: 'What?',
        bullets: [
          'Designed a Meccano-based vehicle with forward/reverse drive and a ball-launching mechanism to hit a target.',
        ],
        image: { src: 'car-photo', alt: 'Finished Meccano car with decorative flames' },
        model: {
          src: 'models/meccano-launcher.glb',
          title: '3D model of the Meccano car ball launcher',
          // The export was saved on its side; this rotates it upright so the
          // car stands on its 4 wheels — see handoff.md §7, "Meccano car
          // orientation" for how it was worked out.
          rotation: [68.83, 27.793, 39.712],
        },
      },
      {
        label: 'How?',
        bullets: [
          'Drove the wheels with a *motorized axle via an elastic band*, controlled through an Arduino and breadboard circuit; built a 3D-printed ping-pong-ball holder integrated with a catapult, released by a manual clip mechanism.',
        ],
        image: { src: 'exploded-view', alt: 'Exploded view of the Meccano car' },
      },
      {
        label: 'Results',
        stats: [{ value: '2nd', label: 'Place' }],
        bullets: ['Successfully launched the ball onto target; placed *2nd* in the competitive evaluation.'],
        image: { src: 'chassis-wiring', alt: 'Car chassis with Arduino wiring' },
      },
    ],
  },
  {
    id: 'hydraulic-hand',
    title: 'Reverse-Engineered Hydraulic Hand',
    context: 'Engineering Design II · Team of 5',
    featured: false,
    summary: 'Took apart a 200+ part toy hydraulic arm and rebuilt it as a full SolidWorks assembly.',
    cover: 'hand-render',
    gallery: [{ src: 'hand-render', alt: 'CAD render of the reverse-engineered hydraulic hand assembly' }],
    steps: [
      {
        label: 'What?',
        bullets: [
          'Reverse-engineered a *200+ part toy hydraulic arm*, fully disassembling and recreating it as a working digital model.',
        ],
        image: { src: 'hand-assembly', alt: 'Full SolidWorks assembly of the hydraulic hand' },
      },
      {
        label: 'How?',
        bullets: [
          'Worked in a 5-person team to dissect each part’s role, took accurate measurements, modeled the full assembly in SolidWorks, and produced individual 2D drawings for every part.',
        ],
        image: { src: 'hand-exploded', alt: 'Exploded view of the hydraulic hand' },
      },
      {
        label: 'Results',
        stats: [{ value: '200+', label: 'Parts modeled' }],
        bullets: [
          'Successfully replicated the toy hydraulic hand in SolidWorks, demonstrating strong understanding of hydraulic systems and complex assemblies.',
        ],
        image: { src: 'part-drawing', alt: 'Engineering drawing of one hand component' },
      },
    ],
  },
];
