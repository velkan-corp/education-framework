export interface UniversePhase {
  phaseId: string;
  phaseLabel: string;
  tier: 'foundational' | 'core' | 'recommended';
  title: string;
  description: string;
}

export interface Universe {
  id: string;
  label: string;
  tags: string[];
  phases: UniversePhase[];
}

export const TAG_LABELS: Record<string, string> = {
  'narrative': 'Narrative',
  'anime': 'Anime',
  'game': 'Game',
  'cinema': 'Cinema',
  'spanish': 'Spanish',
  'maker': 'Maker',
  'comics': 'Comics',
  'strategy': 'Strategy',
  'classics': 'Classics',
};

export const universes: Universe[] = [
  // ── TOLKIEN ──────────────────────────────────────────────
  {
    id: 'tolkien',
    label: 'Tolkien',
    tags: ['narrative', 'cinema', 'maker'],
    phases: [
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'core',
        title: 'The Hobbit',
        description: 'Entry point to Middle-earth. A children\'s adventure that prepares the ground for LOTR. Read aloud together — Bilbo\'s transformation from comfort to courage. Maps ≠ Territory: the Shire\'s map doesn\'t prepare you for the journey.',
      },
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'foundational',
        title: 'The Lord of the Rings (book + extended films)',
        description: 'The deepest work on corruption of power, weight of responsibility, and the survivorship bias of history in all fantasy literature. Feedback Loops (the Ring\'s corruption accelerates), Path Dependence (one decision at Rauros reshapes everything), Emergence (the Fellowship as system).',
      },
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'core',
        title: 'The Silmarillion + Children of Húrin',
        description: 'Middle-earth becomes theology and creation mythology. Where LOTR is moral philosophy, the Silmarillion is cosmogony — how a world is made, how evil enters through pride. Children of Húrin is pure tragedy: Path Dependence incarnate.',
      },
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'core',
        title: 'Unfinished Tales + Letters + linguistic dimension',
        description: 'The Letters reveal how a mind builds a world. For language-apt children: Quenya and Sindarin are built from phonological roots — genuine linguistics, not fantasy props. Tolkien was a professional philologist; this is where fiction meets scholarship.',
      },
    ],
  },
  // ── STAR WARS ────────────────────────────────────────────
  {
    id: 'star-wars',
    label: 'Star Wars',
    tags: ['narrative', 'cinema', 'game'],
    phases: [
      {
        phaseId: 'age-4-7', phaseLabel: '4–7', tier: 'core',
        title: 'Clone Wars (animated series)',
        description: 'Entry point to the Star Wars universe. Moral complexity scales across seasons. Leads naturally to the Original Trilogy at 8-10.',
      },
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'core',
        title: 'Original Trilogy + LEGO Star Wars game',
        description: 'Political decay (Republic → Empire), second-order consequences, the seduction of power. LEGO Star Wars: The Skywalker Saga as accessible interactive entry. John Williams scores as music education.',
      },
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'core',
        title: 'Knights of the Old Republic (KOTOR)',
        description: 'One of the greatest RPGs ever made. Moral choice architecture where light/dark isn\'t simple good/evil — it\'s competing philosophical positions about power, freedom, and order. The twist reframes everything.',
      },
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'recommended',
        title: 'Jedi: Fallen Order / Survivor',
        description: 'Soulslike combat in the Star Wars universe. Exploration, puzzle-solving, Force philosophy. Bridges Star Wars and FromSoftware difficulty philosophy.',
      },
    ],
  },
  // ── DON QUIJOTE ──────────────────────────────────────────
  {
    id: 'don-quijote',
    label: 'Don Quijote',
    tags: ['narrative', 'spanish', 'classics'],
    phases: [
      {
        phaseId: 'age-4-7', phaseLabel: '4–7', tier: 'foundational',
        title: 'Don Quijote contado a los niños (adapted)',
        description: 'The foundational Spanish-language anchor. A funny man who confuses stories with reality — Maps ≠ Territory at its most human. Read in Spanish. A child in Madrid grows up in Quijote\'s landscape.',
      },
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'foundational',
        title: 'Don Quijote (fuller adaptation)',
        description: 'Continues from 4-7 at greater depth. The comedy becomes philosophical — why does he persist? What does it mean to choose your own reality? The windmills are Maps ≠ Territory made iconic.',
      },
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'core',
        title: 'Cervantes — Don Quijote (original, in Spanish)',
        description: 'The full novel. Models vs reality deepened. The first modern novel — self-aware, meta-fictional, structurally innovative. In Spanish.',
      },
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'core',
        title: 'Don Quijote (selections, scholarly)',
        description: 'Same intellectual weight as the English canon. The second part\'s awareness of the first is proto-postmodern. Cervantes invented the unreliable narrator and the novel-within-a-novel.',
      },
    ],
  },
  // ── DUNE ─────────────────────────────────────────────────
  {
    id: 'dune',
    label: 'Dune',
    tags: ['narrative', 'cinema'],
    phases: [
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'foundational',
        title: 'Dune (Frank Herbert, book 1)',
        description: 'Political ecology, religion as technology, prescience as trap. Emergence (ecology as politics), Feedback Loops (prescience trap), Via Negativa (Bene Gesserit training is removal), Incentives (spice economy).',
      },
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'foundational',
        title: 'Dune books 2–6 (full hexalogy)',
        description: 'God Emperor is a philosophical treatise on stagnation vs chaos. Books 5-6 are about escaping prescience — whether perfect information helps or destroys. The deepest SF treatment of prediction, determinism, and free will.',
      },
    ],
  },
  // ── AVATAR ───────────────────────────────────────────────
  {
    id: 'avatar',
    label: 'Avatar',
    tags: ['anime', 'narrative'],
    phases: [
      {
        phaseId: 'age-4-7', phaseLabel: '4–7', tier: 'foundational',
        title: 'Avatar: The Last Airbender',
        description: 'The four nations as interdependent system. Zuko\'s redemption arc. Consequence and responsibility. Feedback Loops, Incentives, Emergence through accessible storytelling.',
      },
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'core',
        title: 'Legend of Korra',
        description: 'Each season is a different political system: democracy (S1), theocracy (S2), anarchy (S3), fascism (S4). Directly teaches Incentives, Emergence, Feedback Loops.',
      },
    ],
  },
  // ── GHIBLI ───────────────────────────────────────────────
  {
    id: 'ghibli',
    label: 'Studio Ghibli',
    tags: ['anime', 'cinema'],
    phases: [
      {
        phaseId: 'age-4-7', phaseLabel: '4–7', tier: 'core',
        title: 'Totoro → Kiki → Spirited Away',
        description: 'Japanese audio, subtitles. Interdependence with nature, ambiguity, beauty. No villains — complexity without evil.',
      },
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'core',
        title: 'Princess Mononoke',
        description: 'Moral ambiguity, no villain. Nature vs civilization without easy answers. Japanese audio, subtitles.',
      },
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'recommended',
        title: 'Nausicaä + Porco Rosso',
        description: 'Nausicaä: ecology + leadership. Porco Rosso: disillusionment + grace. Deeper Miyazaki for the child who loved Spirited Away.',
      },
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'recommended',
        title: 'The Wind Rises',
        description: 'Is it ethical to create beautiful things that will be used for destruction? The central question of technology ethics. Miyazaki\'s most philosophically complex film.',
      },
    ],
  },
  // ── POKÉMON ──────────────────────────────────────────────
  {
    id: 'pokemon',
    label: 'Pokémon',
    tags: ['anime', 'game', 'strategy'],
    phases: [
      {
        phaseId: 'age-4-7', phaseLabel: '4–7', tier: 'core',
        title: 'Pokémon anime + card game basics',
        description: 'Entry-level anime (Japanese audio, L3 exposure). Type system is basic combinatorics. Card game introduces counting, turn structure, probability.',
      },
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'core',
        title: 'Pokémon competitive (TCG + VGC)',
        description: 'Deck-building deepens into combinatorics and probability. Video game team composition = optimisation. Direct engagement toward competitive VGC — genuinely deep strategy.',
      },
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'recommended',
        title: 'Competitive VGC / TCG tournaments',
        description: 'VGC damage calculation is applied probability. Metagame reading is game theory. Tournament experience. Alternative to chess as competitive strategy vehicle.',
      },
    ],
  },
  // ── WARHAMMER 40K ────────────────────────────────────────
  {
    id: 'warhammer',
    label: 'Warhammer 40K',
    tags: ['game', 'maker', 'strategy'],
    phases: [
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'core',
        title: 'Kill Team + miniature painting + 3D printing',
        description: 'Kill Team (4-10 models per side). Probability systems (dice, wound rolls), list-building (resource allocation). Assembly, painting, terrain building. 3D printing terrain begins. Bridges Building & Making with Knowledge & Thinking.',
      },
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'recommended',
        title: 'Full 40K + tournament + STL design',
        description: 'Full army building, tournament circuit, custom STL design in Blender/ZBrush, resin printing. Lore becomes political philosophy: the Imperium as satire of bureaucratic authoritarianism, religious fanaticism, technological stagnation. Horus Heresy novels.',
      },
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'recommended',
        title: 'Commission painting + STL entrepreneurship',
        description: 'The hobby becomes commercial: selling painted minis, designing/selling STL files, commission services. Fabrication pipeline becomes entrepreneurship. Lore at its deepest is genuine political philosophy.',
      },
    ],
  },
  // ── D&D ──────────────────────────────────────────────────
  {
    id: 'dnd',
    label: 'D&D',
    tags: ['game', 'narrative', 'strategy'],
    phases: [
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'recommended',
        title: 'D&D simplified (Young Adventurer\'s Guides)',
        description: 'Introduction to collaborative storytelling. Simplified ruleset. Dice rolls introduce probability. Roleplay introduces improvised speaking.',
      },
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'core',
        title: 'D&D full rules, first campaign',
        description: 'The ONLY universe where speaking and improvisation are the core activities. Dice systems teach probability. Roleplay teaches communication mastery. Group dynamics teach relational intelligence.',
      },
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'recommended',
        title: 'Dungeon Mastering',
        description: 'DM-ing a campaign is: writing narrative, managing a group, probability math, real-time improvisation, and world creation. Leadership training disguised as a game.',
      },
    ],
  },
  // ── ENDER ────────────────────────────────────────────────
  {
    id: 'ender',
    label: 'Ender\'s Game',
    tags: ['narrative'],
    phases: [
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'core',
        title: 'Ender\'s Game (book 1)',
        description: 'Strategy, empathy, moral weight of violence. Maps ≠ Territory: the simulation IS real. Save Speaker for the Dead for 11-13.',
      },
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'foundational',
        title: 'Ender\'s Game + Speaker for the Dead',
        description: 'Speaker directly serves Relational Intelligence and Empathy: xenology as applied empathy, understanding radical otherness. One of the great novels about what it means to truly understand another being.',
      },
    ],
  },
  // ── GAIMAN ───────────────────────────────────────────────
  {
    id: 'gaiman',
    label: 'Neil Gaiman',
    tags: ['narrative', 'comics'],
    phases: [
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'core',
        title: 'Coraline + The Graveyard Book',
        description: 'Coraline: courage and identity. The Graveyard Book: belonging and otherness. Gaiman\'s through-line is that stories are how humans make meaning.',
      },
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'core',
        title: 'Norse Mythology',
        description: 'Primary source myth retold accessibly. Bridges to Tolkien\'s sources (he drew from the same Norse material). Leads to American Gods at 16.',
      },
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'core',
        title: 'Sandman (complete)',
        description: 'Mythology, storytelling, identity, the nature of narrative. The most literary comic series. Stories about stories — Maps ≠ Territory at the meta level.',
      },
    ],
  },
  // ── ASIMOV ───────────────────────────────────────────────
  {
    id: 'asimov',
    label: 'Asimov',
    tags: ['narrative'],
    phases: [
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'core',
        title: 'I, Robot + Caves of Steel',
        description: 'Robot stories teach systems thinking: three laws, simple rules, emergent consequences. What happens when rules conflict? Every robot story is a thought experiment about Incentives and Emergence.',
      },
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'core',
        title: 'Foundation trilogy',
        description: 'Psychohistory IS emergence + probability as a science. Complex systems have predictable aggregate behavior even when individual actions are unpredictable. Seldon crises are feedback loops by design.',
      },
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'core',
        title: 'Foundation\'s Edge + Forward the Foundation',
        description: 'The psychohistory project questioned from within: what happens when the predictor becomes part of the prediction? Emergence, Probability, Maps ≠ Territory.',
      },
    ],
  },
  // ── LE GUIN ──────────────────────────────────────────────
  {
    id: 'le-guin',
    label: 'Le Guin',
    tags: ['narrative'],
    phases: [
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'core',
        title: 'A Wizard of Earthsea (begins trilogy)',
        description: 'The shadow Ged chases IS himself — Via Negativa: you defeat it by accepting, not fighting. Earthsea\'s entire metaphysics is Complementary Opposites: balance is the law.',
      },
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'core',
        title: 'The Dispossessed',
        description: 'The best novel about political philosophy ever written. Anarchism vs capitalism, through a physicist who lives in both systems. Complements Heinlein\'s libertarianism.',
      },
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'core',
        title: 'Left Hand of Darkness + Tehanu',
        description: 'Left Hand: gender as construct, culture as lens — Maps ≠ Territory applied to identity itself. Tehanu: power, aging, and what matters when the hero\'s journey is over.',
      },
    ],
  },
  // ── HEINLEIN ─────────────────────────────────────────────
  {
    id: 'heinlein',
    label: 'Heinlein',
    tags: ['narrative'],
    phases: [
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'recommended',
        title: 'Have Space Suit — Will Travel',
        description: 'Entry-level Heinlein. Young adult adventure with science baked in. Self-reliance, problem-solving under pressure, competence matters.',
      },
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'core',
        title: 'Starship Troopers + The Moon Is a Harsh Mistress',
        description: 'The individualist/meritocratic counterweight to Le Guin. Starship Troopers is deliberately provocative — the debate about whether it\'s fascist IS the lesson. Moon teaches revolution and AI consciousness. TANSTAAFL is Via Negativa as political principle.',
      },
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'core',
        title: 'Stranger in a Strange Land',
        description: 'Cultural assimilation, what it means to be human, language shapes thought. The counterweight to Le Guin\'s Left Hand — both question human nature from opposite positions.',
      },
    ],
  },
  // ── PRATCHETT ────────────────────────────────────────────
  {
    id: 'pratchett',
    label: 'Pratchett',
    tags: ['narrative'],
    phases: [
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'core',
        title: 'Tiffany Aching series',
        description: 'Pratchett\'s entry point. Tiffany teaches resilient self-efficacy — "First Sight and Second Thoughts." Humor as philosophical scalpel.',
      },
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'recommended',
        title: 'Night Watch + Small Gods',
        description: 'Night Watch: what makes a good person in an unjust system. Small Gods: the best 300-page treatment of how religions form and corrupt.',
      },
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'recommended',
        title: 'Hogfather + Thud!',
        description: '"Humans need fantasy to be human." Thud!: prejudice, tribal violence, what holds a city together. The culmination of the Discworld thread.',
      },
    ],
  },
  // ── SHAKESPEARE ──────────────────────────────────────────
  {
    id: 'shakespeare',
    label: 'Shakespeare',
    tags: ['narrative', 'classics'],
    phases: [
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'recommended',
        title: 'Midsummer Night\'s Dream + Much Ado',
        description: 'Entry-level Shakespeare: comedies first. Performance-oriented — read scenes aloud, watch film adaptations. Language at its most playful.',
      },
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'core',
        title: 'Hamlet, Macbeth, Othello',
        description: 'The tragedies. Hamlet: thought paralyzing action. Macbeth: ambition as feedback loop. Othello: manipulation exploiting trust. The English language at its highest expression.',
      },
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'core',
        title: 'King Lear + The Tempest',
        description: 'Lear: power, aging, ingratitude, madness. The Tempest: Prospero releasing control — Via Negativa as the final act. "We are such stuff as dreams are made on."',
      },
    ],
  },
  // ── HOMER ────────────────────────────────────────────────
  {
    id: 'homer',
    label: 'Homer',
    tags: ['narrative', 'classics'],
    phases: [
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'foundational',
        title: 'Iliad & Odyssey (adapted/retold)',
        description: 'The foundational Western narrative. Achilles\' wrath is a feedback loop. Odysseus\' journey is Maps ≠ Territory — the map home is not the journey home.',
      },
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'core',
        title: 'Iliad & Odyssey (Fagles or Wilson translation)',
        description: 'The real text. Everything in Western literature responds to Homer. Bridges from adapted versions to scholarly engagement.',
      },
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'core',
        title: 'Homer scholarly (compare translations)',
        description: 'Compare Fagles, Lattimore, Wilson — the same text in different English reveals how translation IS interpretation. Maps ≠ Territory applied to language itself.',
      },
    ],
  },
  // ── KUROSAWA ─────────────────────────────────────────────
  {
    id: 'kurosawa',
    label: 'Kurosawa',
    tags: ['cinema'],
    phases: [
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'core',
        title: 'Seven Samurai + Yojimbo + Rashomon',
        description: 'THE bridge from Ghibli to serious cinema. Seven Samurai is structurally perfect. Rashomon teaches Maps ≠ Territory through contradictory testimony — same event, four truths.',
      },
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'core',
        title: 'Rashomon deeper + Ikiru',
        description: 'Ikiru: a bureaucrat discovers he\'s dying and tries to do one meaningful thing. What matters when time is finite? Japanese audio, subtitles.',
      },
    ],
  },
  // ── HUNTER × HUNTER ──────────────────────────────────────
  {
    id: 'hunter-x-hunter',
    label: 'Hunter × Hunter',
    tags: ['anime'],
    phases: [
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'core',
        title: 'Hunter × Hunter (2011 anime)',
        description: 'The Nen power system is the most intellectually rigorous in anime — essentially game theory. The Chimera Ant arc: what makes a human? Can compassion extend to the non-human?',
      },
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'recommended',
        title: 'Hunter × Hunter (continued / manga)',
        description: 'Election arc and beyond. Political maneuvering, strategic depth. The power system deepens into full economic modeling.',
      },
    ],
  },
  // ── SANDERSON ────────────────────────────────────────────
  {
    id: 'sanderson',
    label: 'Sanderson',
    tags: ['narrative'],
    phases: [
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'core',
        title: 'Mistborn Era 1',
        description: 'Hard magic systems = physics thinking. Heist narrative. Emergence: magic rules create emergent behavior no single rule predicts.',
      },
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'core',
        title: 'Stormlight Archive begins',
        description: 'The most ambitious fantasy worldbuilding since Tolkien. Hard magic systems as physics. Systems thinking through narrative.',
      },
    ],
  },
  // ── MINECRAFT ────────────────────────────────────────────
  {
    id: 'minecraft',
    label: 'Minecraft',
    tags: ['game', 'maker'],
    phases: [
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'core',
        title: 'Minecraft (Creative + Survival + Redstone)',
        description: 'Systems sandbox. Creative mode for building, Survival for resource management, Redstone for logic circuits. Emergence: ecosystems, mob behavior. Bridges to programming.',
      },
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'recommended',
        title: 'Minecraft (modding + servers)',
        description: 'Java modding as programming entry. Server administration as systems management. Community building.',
      },
    ],
  },
  // ── FACTORIO ─────────────────────────────────────────────
  {
    id: 'factorio',
    label: 'Factorio',
    tags: ['game', 'strategy'],
    phases: [
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'core',
        title: 'Factorio',
        description: 'No other medium teaches systems thinking and optimization this viscerally. Building a factory IS building a feedback loop. Finding the bottleneck IS via negativa. Scaling production IS compounding.',
      },
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'recommended',
        title: 'Factorio (megabase + mods)',
        description: 'Scaling to megabase level. Mod development. Ratio calculations become applied mathematics. The factory must grow.',
      },
    ],
  },
  // ── MAFALDA ──────────────────────────────────────────────
  {
    id: 'mafalda',
    label: 'Mafalda',
    tags: ['comics', 'spanish'],
    phases: [
      {
        phaseId: 'age-4-7', phaseLabel: '4–7', tier: 'core',
        title: 'Mafalda (Quino)',
        description: 'Social commentary through a child\'s voice. Spanish-language. Political philosophy and existential humor accessible to children.',
      },
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'recommended',
        title: 'Mafalda continues',
        description: 'Political philosophy deepens as the child\'s social awareness grows. The Spanish-language Calvin & Hobbes.',
      },
    ],
  },
  // ── PULLMAN ──────────────────────────────────────────────
  {
    id: 'pullman',
    label: 'Pullman',
    tags: ['narrative'],
    phases: [
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'core',
        title: 'His Dark Materials (begins)',
        description: 'The most philosophically ambitious children\'s fantasy. Theology, consciousness, authority. Northern Lights first. Takes children\'s philosophical capacity seriously.',
      },
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'recommended',
        title: 'His Dark Materials (completes)',
        description: 'The Amber Spyglass deals with death, consciousness, and the structure of reality.',
      },
    ],
  },
  // ── LIU CIXIN ────────────────────────────────────────────
  {
    id: 'liu-cixin',
    label: 'Liu Cixin',
    tags: ['narrative'],
    phases: [
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'core',
        title: 'The Three-Body Problem',
        description: 'The most significant non-Western science fiction. Chinese perspective on physics, civilization, survival. Dark Forest theory is applied game theory at cosmic scale.',
      },
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'core',
        title: 'The Dark Forest + Death\'s End',
        description: 'Cosmic sociology as game theory. Death\'s End: the most ambitious SF ending ever written. Probability, Incentives, Emergence at civilizational scale.',
      },
    ],
  },
  // ── DOSTOEVSKY ───────────────────────────────────────────
  {
    id: 'dostoevsky',
    label: 'Dostoevsky',
    tags: ['narrative', 'classics'],
    phases: [
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'recommended',
        title: 'Crime and Punishment',
        description: 'Can you reason yourself into a moral conclusion and live with it? Raskolnikov\'s utilitarian logic and its collapse. The deepest literary exploration of moral reasoning.',
      },
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'foundational',
        title: 'The Brothers Karamazov',
        description: 'The Grand Inquisitor chapter: the most important 20 pages in Western literature on freedom, authority, and human nature. Three brothers — faith, reason, passion — as Complementary Opposites.',
      },
    ],
  },
  // ── CORTÁZAR ─────────────────────────────────────────────
  {
    id: 'cortazar',
    label: 'Cortázar',
    tags: ['narrative', 'spanish'],
    phases: [
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'core',
        title: 'Rayuela (Hopscotch)',
        description: 'A novel readable in two different chapter orders. Literally Maps ≠ Territory applied to book structure — same content, different meaning depending on the path. In Spanish.',
      },
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'recommended',
        title: 'Cortázar short stories',
        description: 'Blow-Up, The Night Face Up. Reality becomes unstable. Photography, dreams, identity blur. In Spanish.',
      },
    ],
  },
  // ── ATTACK ON TITAN ──────────────────────────────────────
  {
    id: 'attack-on-titan',
    label: 'Attack on Titan',
    tags: ['anime'],
    phases: [
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'core',
        title: 'Attack on Titan (anime)',
        description: 'The most sophisticated treatment of cycles of violence in any anime. Deliberately makes you sympathize with one side, then forces perspective reversal. Moral complexity rivals Dostoevsky.',
      },
    ],
  },
  // ── GHOST IN THE SHELL ───────────────────────────────────
  {
    id: 'ghost-in-the-shell',
    label: 'Ghost in the Shell',
    tags: ['anime', 'cinema'],
    phases: [
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'core',
        title: 'Ghost in the Shell (1995 film + Stand Alone Complex)',
        description: 'THE work on consciousness, identity, and what makes a person. With AI becoming central, its questions are no longer science fiction. Emergence, Network Effects, Maps ≠ Territory.',
      },
    ],
  },
  // ── WITCHER ──────────────────────────────────────────────
  {
    id: 'witcher',
    label: 'The Witcher',
    tags: ['narrative', 'game'],
    phases: [
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'core',
        title: 'The Witcher (Sapkowski books + Witcher 3 game)',
        description: 'Moral ambiguity as central thesis. The lesser evil, political realism, consequences of neutrality. Books first, then games. The game\'s moral choice architecture is the most sophisticated in any game.',
      },
    ],
  },
  // ── BUTLER ───────────────────────────────────────────────
  {
    id: 'butler',
    label: 'Octavia Butler',
    tags: ['narrative'],
    phases: [
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'core',
        title: 'Kindred + Parable of the Sower',
        description: 'Kindred: American slavery through time travel — visceral, not abstract. Parable (1993) predicted 2020s America. Applied systems thinking to society produces predictable trajectories.',
      },
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'recommended',
        title: 'Parable of the Talents',
        description: 'What happens after collapse — how authoritarian movements exploit desperation. Written in 1998, reads like 2025.',
      },
    ],
  },
  // ── MARTIN ───────────────────────────────────────────────
  {
    id: 'martin',
    label: 'George R.R. Martin',
    tags: ['narrative'],
    phases: [
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'recommended',
        title: 'A Game of Thrones',
        description: 'The most realistic political fiction in fantasy. Every character acts rationally given their incentives — understanding this predicts behavior better than labeling good/evil.',
      },
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'recommended',
        title: 'Feast for Crows + Dance with Dragons',
        description: 'Cersei\'s chapters teach that intelligent people with bad models make systematically wrong decisions. Incentives applied to POV characters who don\'t understand their own incentives.',
      },
    ],
  },
  // ── KAFKA ────────────────────────────────────────────────
  {
    id: 'kafka',
    label: 'Kafka',
    tags: ['narrative', 'classics'],
    phases: [
      {
        phaseId: 'age-14-16', phaseLabel: '14–16', tier: 'core',
        title: 'The Metamorphosis + The Trial',
        description: 'The 20th century\'s most prophetic writer. Bureaucratic absurdity, surveillance, alienation — predicted before they existed. "Kafkaesque" is a concept every educated person needs.',
      },
    ],
  },
  // ── BORGES ───────────────────────────────────────────────
  {
    id: 'borges',
    label: 'Borges',
    tags: ['narrative', 'spanish', 'classics'],
    phases: [
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'foundational',
        title: 'Ficciones + El Aleph (in Spanish)',
        description: 'The densest writer in any language. Every story is a thought experiment about infinity, identity, or the limits of representation. Maps ≠ Territory is his central theme. Essential Spanish-language anchor alongside Cervantes.',
      },
    ],
  },
  // ── CAMUS ────────────────────────────────────────────────
  {
    id: 'camus',
    label: 'Camus',
    tags: ['narrative', 'classics'],
    phases: [
      {
        phaseId: 'age-17-18', phaseLabel: '17–18', tier: 'foundational',
        title: 'The Stranger + The Myth of Sisyphus',
        description: 'Finding meaning in a meaningless universe. "There is but one truly serious philosophical problem, and that is suicide." Via Negativa — absurdism is accepting that meaning must be created, not found.',
      },
    ],
  },
  // ── CALVIN & HOBBES ──────────────────────────────────────
  {
    id: 'calvin-hobbes',
    label: 'Calvin & Hobbes',
    tags: ['comics'],
    phases: [
      {
        phaseId: 'age-4-7', phaseLabel: '4–7', tier: 'foundational',
        title: 'Calvin & Hobbes Complete Collection',
        description: 'Philosophy disguised as a comic strip. Inversion, imagination, social commentary. Sunday strips require the large format.',
      },
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'core',
        title: 'Calvin & Hobbes continues',
        description: 'Re-reading deepens — the philosophical dimensions become visible. A modelling vehicle for inversion and social critique.',
      },
    ],
  },
  // ── ROALD DAHL ───────────────────────────────────────────
  {
    id: 'roald-dahl',
    label: 'Roald Dahl',
    tags: ['narrative'],
    phases: [
      {
        phaseId: 'age-4-7', phaseLabel: '4–7', tier: 'core',
        title: 'Roald Dahl complete works (read aloud)',
        description: 'Morality deliberately provocative. Use for discussion — "Was that fair? Why not?" The darkness IS the curriculum.',
      },
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'recommended',
        title: 'Roald Dahl continues',
        description: 'Independent reading. The child finds layers the read-aloud missed. Matilda, Danny, Boy — increasingly complex moral territory.',
      },
    ],
  },
  // ── DC/MARVEL ────────────────────────────────────────────
  {
    id: 'dc-marvel',
    label: 'DC/Marvel',
    tags: ['comics', 'cinema'],
    phases: [
      {
        phaseId: 'age-4-7', phaseLabel: '4–7', tier: 'recommended',
        title: 'Batman: TAS + Spider-Verse',
        description: 'Moral complexity at accessible level. Shared cultural vocabulary with peers.',
      },
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'recommended',
        title: 'DC/Marvel comics + MCU',
        description: 'Volume consumption. Visual literacy through comics. Films as shared cultural vocabulary.',
      },
    ],
  },
  // ── LITTLE PRINCE ────────────────────────────────────────
  {
    id: 'little-prince',
    label: 'The Little Prince',
    tags: ['narrative', 'classics'],
    phases: [
      {
        phaseId: 'age-4-7', phaseLabel: '4–7', tier: 'core',
        title: 'The Little Prince (multilingual)',
        description: 'Read in English, then Spanish, then French if L3 active. At this age it\'s a children\'s story about friendship and loss.',
      },
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'recommended',
        title: 'The Little Prince re-read',
        description: 'Re-read in a different language. The 10-year-old finds layers the 6-year-old missed. "What is essential is invisible to the eye."',
      },
    ],
  },
  // ── HARRY POTTER ─────────────────────────────────────────
  {
    id: 'harry-potter',
    label: 'Harry Potter',
    tags: ['narrative'],
    phases: [
      {
        phaseId: 'age-8-10', phaseLabel: '8–10', tier: 'foundational',
        title: 'Harry Potter (complete series)',
        description: 'Seven books that scale ethical complexity per volume — from simple good/evil to Snape\'s ambiguity, Dumbledore\'s flaws, Hallows vs Horcruxes. The most effective fiction curriculum vehicle for this age.',
      },
    ],
  },
  // ── NARUTO ───────────────────────────────────────────────
  {
    id: 'naruto',
    label: 'Naruto',
    tags: ['anime'],
    phases: [
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'recommended',
        title: 'Naruto + Shippuden (skip filler)',
        description: 'Persistence through rejection as central theme. The Pain arc is a genuine philosophical debate: peace through understanding vs peace through force. The cycle-of-hatred theme IS feedback loops.',
      },
    ],
  },
  // ── FMA:B ────────────────────────────────────────────────
  {
    id: 'fma',
    label: 'Fullmetal Alchemist',
    tags: ['anime'],
    phases: [
      {
        phaseId: 'age-11-13', phaseLabel: '11–13', tier: 'foundational',
        title: 'Fullmetal Alchemist: Brotherhood',
        description: 'Equivalent exchange as a model with limits. Institutional corruption, the cost of knowledge. The best anime for this age.',
      },
    ],
  },
];
