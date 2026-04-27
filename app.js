// FireLink v0.1 — Shared app logic

const STATE_KEY = 'firelink_state';

function getState() {
  const saved = localStorage.getItem(STATE_KEY);
  return saved ? JSON.parse(saved) : getDefaultState();
}

function getDefaultState() {
  return {
    property: {
      zip: '',
      homeType: 'single-family',
      roofMaterial: 'asphalt',
      sidingMaterial: 'vinyl',
      vegetation: 'moderate',
      defensibleSpace: 'partial',
      slope: 'flat',
      distanceToWildland: 'far',
      ventType: 'standard',
      deckMaterial: 'wood'
    },
    completedTasks: []
  };
}

function setState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function restartAssessment() {
  const confirmed = confirm('Are you sure you want to start over? This will clear all your property information and completed tasks.');
  if (confirmed) {
    localStorage.removeItem(STATE_KEY);
    window.location.href = 'index.html';
  }
}

async function fetchBaseLocationRisk(zipCode) {
  try {
    const response = await fetch(`http://localhost:3000/api/risk/exposure?zip=${zipCode}`);
    const data = await response.json();
    console.log(`Base location risk for ZIP ${zipCode}:`, data.baseRisk, 'Source:', data.source);
    return {
      baseRisk: data.baseRisk || 50,
      coordinates: data.coordinates,
      zipCode: data.zipCode
    };
  } catch (error) {
    console.error('Failed to fetch location risk:', error);
    console.log('Using fallback risk of 50');
    return { baseRisk: 50, coordinates: null, zipCode: zipCode };
  }
}

function calculateExposureRiskSync(property, baseLocationRisk) {
  const vegetationWeights = { sparse: -5, moderate: 0, heavy: 10 };
  const vegetationModifier = vegetationWeights[property.vegetation] || 0;

  const slopeWeights = { flat: 0, moderate: 5, steep: 15 };
  const slopeModifier = slopeWeights[property.slope] || 0;

  const distanceWeights = { far: -10, moderate: 0, close: 15 };
  const distanceModifier = distanceWeights[property.distanceToWildland] || 0;

  const totalModifiers = vegetationModifier + slopeModifier + distanceModifier;
  const finalScore = baseLocationRisk + totalModifiers;

  return Math.min(100, Math.max(0, Math.round(finalScore)));
}

async function calculateExposureRisk(property) {
  const locationData = await fetchBaseLocationRisk(property.zip);
  const exposureRisk = calculateExposureRiskSync(property, locationData.baseRisk);
  return {
    score: exposureRisk,
    locationData: locationData
  };
}

function calculateVulnerabilityRisk(property) {
  let score = 0;

  const roofWeights = { metal: 5, tile: 10, asphalt: 20, 'wood-shake': 40, other: 25 };
  score += roofWeights[property.roofMaterial] || 20;

  const sidingWeights = { 'fiber-cement': 5, stucco: 8, vinyl: 15, wood: 30, other: 20 };
  score += sidingWeights[property.sidingMaterial] || 15;

  const defensibleSpaceWeights = { clear: 5, partial: 20, cluttered: 35 };
  score += defensibleSpaceWeights[property.defensibleSpace] || 20;

  const ventWeights = { 'ember-resistant': 5, standard: 15 };
  score += ventWeights[property.ventType] || 15;

  const deckWeights = { none: 0, composite: 5, wood: 15 };
  score += deckWeights[property.deckMaterial] || 10;

  const homeTypeWeights = { 'single-family': 10, townhome: 5, 'multi-family': 3 };
  score += homeTypeWeights[property.homeType] || 10;

  return Math.min(100, Math.max(0, Math.round(score)));
}

function calculateOverallRisk(exposureRisk, vulnerabilityRisk) {
  return Math.round((exposureRisk * 0.6) + (vulnerabilityRisk * 0.4));
}

function calculateRiskScore(property) {
  const exposureRisk = calculateExposureRisk(property);
  const vulnerabilityRisk = calculateVulnerabilityRisk(property);
  return calculateOverallRisk(exposureRisk, vulnerabilityRisk);
}

function getRiskTier(score) {
  if (score <= 35) return { label: 'Low', color: '#4CAF50' };
  if (score <= 60) return { label: 'Moderate', color: '#FFC107' };
  if (score <= 80) return { label: 'High', color: '#FF9800' };
  return { label: 'Extreme', color: '#F44336' };
}

function getExposureFactors(property) {
  const factors = [];

  if (property.distanceToWildland === 'close') {
    factors.push({ name: 'Close proximity to wildland', contribution: 35, type: 'exposure' });
  } else if (property.distanceToWildland === 'moderate') {
    factors.push({ name: 'Moderate distance to wildland', contribution: 20, type: 'exposure' });
  }

  if (property.vegetation === 'heavy') {
    factors.push({ name: 'Heavy vegetation in area', contribution: 40, type: 'exposure' });
  } else if (property.vegetation === 'moderate') {
    factors.push({ name: 'Moderate vegetation density', contribution: 25, type: 'exposure' });
  }

  if (property.slope === 'steep') {
    factors.push({ name: 'Steep slope (fire spreads faster)', contribution: 30, type: 'exposure' });
  } else if (property.slope === 'moderate') {
    factors.push({ name: 'Moderate slope', contribution: 15, type: 'exposure' });
  }

  return factors.sort((a, b) => b.contribution - a.contribution).slice(0, 3);
}

function getVulnerabilityFactors(property) {
  const factors = [];

  if (property.roofMaterial === 'wood-shake') {
    factors.push({ name: 'Wood shake roof (highly flammable)', contribution: 40, type: 'vulnerability' });
  } else if (property.roofMaterial === 'asphalt') {
    factors.push({ name: 'Asphalt shingle roof', contribution: 20, type: 'vulnerability' });
  }

  if (property.sidingMaterial === 'wood') {
    factors.push({ name: 'Wood siding (fire-prone)', contribution: 30, type: 'vulnerability' });
  } else if (property.sidingMaterial === 'vinyl') {
    factors.push({ name: 'Vinyl siding (melts in heat)', contribution: 15, type: 'vulnerability' });
  }

  if (property.defensibleSpace === 'cluttered') {
    factors.push({ name: 'Cluttered defensible space', contribution: 35, type: 'vulnerability' });
  } else if (property.defensibleSpace === 'partial') {
    factors.push({ name: 'Partial defensible space', contribution: 20, type: 'vulnerability' });
  }

  if (property.ventType === 'standard') {
    factors.push({ name: 'Standard vents (ember entry)', contribution: 15, type: 'vulnerability' });
  }

  if (property.deckMaterial === 'wood') {
    factors.push({ name: 'Wood deck attached to home', contribution: 15, type: 'vulnerability' });
  }

  return factors.sort((a, b) => b.contribution - a.contribution).slice(0, 3);
}

function getTopRiskFactors(property, score) {
  const exposureFactors = getExposureFactors(property);
  const vulnerabilityFactors = getVulnerabilityFactors(property);
  const allFactors = [...exposureFactors, ...vulnerabilityFactors];
  return allFactors.sort((a, b) => b.contribution - a.contribution).slice(0, 5);
}

function generateActionPlan(property, exposureRisk, vulnerabilityRisk) {
  const actions = [];
  let actionId = 1;

  // CRITICAL PRIORITY: Roof vulnerabilities (highest ignition risk)
  if (property.roofMaterial === 'wood-shake') {
    actions.push({
      id: actionId++,
      category: 'Home Hardening',
      priority: 'Critical',
      title: 'Replace wood shake roof immediately',
      description: 'Wood shake roofs are the #1 cause of home loss in wildfires. Replace with Class A fire-rated metal, tile, or composite shingles.',
      why: 'Your wood shake roof is extremely vulnerable to ember ignition. This is your highest-risk factor.',
      impact: 'Critical',
      effort: 'Major project',
      cost: '$$$',
      timeline: '1-2 months'
    });
  } else if (property.roofMaterial === 'asphalt') {
    actions.push({
      id: actionId++,
      category: 'Home Hardening',
      priority: 'High',
      title: 'Upgrade to Class A fire-rated roofing',
      description: 'When roof needs replacement, choose metal, tile, or fire-rated composite materials for maximum protection.',
      why: 'Asphalt shingles offer moderate protection. Upgrading will significantly reduce ignition risk.',
      impact: 'High',
      effort: 'Major project',
      cost: '$$$',
      timeline: 'Next replacement cycle'
    });
  }

  // CRITICAL: Ember-resistant vents
  if (property.ventType === 'standard') {
    actions.push({
      id: actionId++,
      category: 'Home Hardening',
      priority: 'Critical',
      title: 'Install ember-resistant vents',
      description: 'Replace all attic, foundation, and crawl space vents with 1/8-inch metal mesh or ember-resistant vent covers.',
      why: 'Standard vents allow embers to enter your home and ignite the attic. This is a common ignition point.',
      impact: 'Critical',
      effort: 'Half-day',
      cost: '$',
      timeline: '1-2 weeks'
    });
  }

  // HIGH PRIORITY: Siding vulnerabilities
  if (property.sidingMaterial === 'wood') {
    actions.push({
      id: actionId++,
      category: 'Home Hardening',
      priority: 'High',
      title: 'Replace wood siding with fire-resistant materials',
      description: 'Upgrade to fiber-cement, stucco, or metal siding. Start with the most exposed sides (facing wildland).',
      why: 'Wood siding can ignite from radiant heat and embers, creating a direct path for fire to enter your home.',
      impact: 'High',
      effort: 'Major project',
      cost: '$$$',
      timeline: '2-6 months'
    });
  } else if (property.sidingMaterial === 'vinyl') {
    actions.push({
      id: actionId++,
      category: 'Home Hardening',
      priority: 'Medium',
      title: 'Consider upgrading vinyl siding',
      description: 'Vinyl melts at low temperatures. When replacing, choose fiber-cement or stucco for better fire resistance.',
      why: 'Vinyl siding can melt and expose combustible materials underneath during a wildfire.',
      impact: 'Medium',
      effort: 'Major project',
      cost: '$$$',
      timeline: 'Next replacement cycle'
    });
  }

  // HIGH PRIORITY: Deck vulnerabilities
  if (property.deckMaterial === 'wood') {
    actions.push({
      id: actionId++,
      category: 'Home Hardening',
      priority: 'High',
      title: 'Replace wood deck or create fire break',
      description: 'Replace with composite or metal decking, or create a non-combustible barrier between deck and home.',
      why: 'Wood decks attached to your home act as a fuel ladder, allowing fire to reach the structure.',
      impact: 'High',
      effort: 'Major project',
      cost: '$$',
      timeline: '1-3 months'
    });
  }

  // DEFENSIBLE SPACE: Critical for all properties, especially high exposure
  if (property.defensibleSpace === 'cluttered' || exposureRisk > 70) {
    actions.push({
      id: actionId++,
      category: 'Defensible Space',
      priority: 'Critical',
      title: 'Create 0-5 foot non-combustible zone',
      description: 'Remove all vegetation, mulch, and combustible materials within 5 feet of home. Use gravel, pavers, or concrete.',
      why: exposureRisk > 70 
        ? 'Your high-risk location requires maximum defensible space. This zone is your last line of defense.'
        : 'This immediate zone prevents embers and radiant heat from igniting your home.',
      impact: 'Critical',
      effort: 'Weekend',
      cost: '$',
      timeline: '1 week'
    });
  }

  if (property.defensibleSpace !== 'clear' || exposureRisk > 60) {
    actions.push({
      id: actionId++,
      category: 'Defensible Space',
      priority: 'High',
      title: 'Maintain 5-30 foot reduced fuel zone',
      description: 'Keep grass mowed to 4 inches, remove dead plants, space shrubs 10 feet apart, and prune tree branches 10 feet from ground.',
      why: 'This zone slows fire spread and reduces radiant heat reaching your home.',
      impact: 'High',
      effort: 'Weekend',
      cost: '$',
      timeline: 'Ongoing maintenance'
    });
  }

  if (exposureRisk > 70 || property.distanceToWildland === 'close') {
    actions.push({
      id: actionId++,
      category: 'Defensible Space',
      priority: 'High',
      title: 'Extend defensible space to 100 feet',
      description: 'Thin trees to 10-foot spacing, remove ladder fuels, and create fuel breaks. May require professional help on steep slopes.',
      why: property.distanceToWildland === 'close'
        ? 'Your proximity to wildland means fire can reach your property quickly. Extended defensible space is critical.'
        : 'Your high exposure risk requires maximum defensible space to protect your home.',
      impact: 'High',
      effort: 'Major project',
      cost: '$$',
      timeline: '1-2 months'
    });
  }

  // VEGETATION MANAGEMENT
  if (property.vegetation === 'heavy') {
    actions.push({
      id: actionId++,
      category: 'Defensible Space',
      priority: 'High',
      title: 'Reduce vegetation density around property',
      description: 'Thin dense vegetation, remove dead plants, and create separation between tree canopies. Focus on areas upslope from home.',
      why: 'Heavy vegetation creates continuous fuel that allows fire to spread rapidly toward your home.',
      impact: 'High',
      effort: 'Weekend',
      cost: '$$',
      timeline: '2-4 weeks'
    });
  }

  // SLOPE CONSIDERATIONS
  if (property.slope === 'steep') {
    actions.push({
      id: actionId++,
      category: 'Defensible Space',
      priority: 'High',
      title: 'Increase defensible space on upslope side',
      description: 'Fire spreads faster uphill. Extend your defensible space 2x on the upslope side and remove all ladder fuels.',
      why: 'Steep slopes accelerate fire spread. Your upslope defensible space needs to be twice as large.',
      impact: 'High',
      effort: 'Weekend',
      cost: '$$',
      timeline: '2-3 weeks'
    });
  }

  // MAINTENANCE TASKS
  actions.push({
    id: actionId++,
    category: 'Maintenance',
    priority: 'High',
    title: 'Clean gutters and roof quarterly',
    description: 'Remove all leaves, needles, and debris from gutters, roof valleys, and under solar panels. Schedule before fire season.',
    why: 'Debris in gutters is prime ember ignition material. This is a quick win with high impact.',
    impact: 'High',
    effort: 'Half-day',
    cost: '$',
    timeline: 'Quarterly'
  });

  actions.push({
    id: actionId++,
    category: 'Maintenance',
    priority: 'Medium',
    title: 'Seal gaps and openings',
    description: 'Seal gaps in siding, under eaves, between deck boards, and around pipes/vents with fire-resistant caulk or metal flashing.',
    why: 'Small gaps allow embers to enter wall cavities and ignite your home from the inside.',
    impact: 'Medium',
    effort: 'Half-day',
    cost: '$',
    timeline: '1-2 weeks'
  });

  // INSURANCE ACTIONS
  if (exposureRisk > 60 || vulnerabilityRisk > 60) {
    actions.push({
      id: actionId++,
      category: 'Insurance & Financial',
      priority: 'High',
      title: 'Review wildfire insurance coverage',
      description: 'Verify you have adequate dwelling coverage, replacement cost coverage, and additional living expenses. Document all improvements.',
      why: exposureRisk > 70 
        ? 'Your high-risk location may face coverage challenges. Ensure you have adequate protection and document all mitigation work.'
        : 'Proper coverage is essential. Many policies underestimate rebuild costs and exclude wildfire damage.',
      impact: 'High',
      effort: 'Quick',
      cost: '$',
      timeline: '1 week'
    });
  }

  actions.push({
    id: actionId++,
    category: 'Insurance & Financial',
    priority: 'Medium',
    title: 'Create home inventory with photos/videos',
    description: 'Document all belongings, improvements, and valuables. Store copies off-site or in cloud storage.',
    why: 'In case of loss, detailed documentation speeds up claims and ensures full reimbursement.',
    impact: 'Medium',
    effort: 'Half-day',
    cost: 'Free',
    timeline: '1-2 weeks'
  });

  if (vulnerabilityRisk <= 40) {
    actions.push({
      id: actionId++,
      category: 'Insurance & Financial',
      priority: 'Medium',
      title: 'Request wildfire mitigation discount',
      description: 'Contact your insurer about discounts for fire-resistant materials, defensible space, and ember-resistant vents.',
      why: 'Your mitigation efforts may qualify you for 10-20% premium discounts. Many homeowners miss this opportunity.',
      impact: 'Medium',
      effort: 'Quick',
      cost: 'Free',
      timeline: '1 week'
    });
  }

  // EMERGENCY PREPAREDNESS
  actions.push({
    id: actionId++,
    category: 'Emergency Preparedness',
    priority: 'Critical',
    title: 'Create evacuation plan and practice it',
    description: 'Identify 2+ evacuation routes, designate meeting points, and practice with family. Include pets and livestock.',
    why: 'Wildfires can spread rapidly. Having a practiced evacuation plan can save lives.',
    impact: 'Critical',
    effort: 'Quick',
    cost: 'Free',
    timeline: 'This week'
  });

  actions.push({
    id: actionId++,
    category: 'Emergency Preparedness',
    priority: 'High',
    title: 'Prepare go-bag and emergency supplies',
    description: 'Pack essentials: documents, medications, water, food, first aid, phone chargers, cash, and irreplaceable items.',
    why: 'You may have minutes to evacuate. A pre-packed go-bag ensures you don\'t forget critical items.',
    impact: 'High',
    effort: 'Half-day',
    cost: '$',
    timeline: 'This week'
  });

  actions.push({
    id: actionId++,
    category: 'Emergency Preparedness',
    priority: 'High',
    title: 'Sign up for emergency alerts',
    description: 'Register for local emergency notifications, download fire weather apps, and follow local fire department on social media.',
    why: 'Early warning can give you crucial extra time to prepare or evacuate safely.',
    impact: 'High',
    effort: 'Quick',
    cost: 'Free',
    timeline: 'Today'
  });

  // PROFESSIONAL ASSESSMENTS
  if (exposureRisk > 70 || vulnerabilityRisk > 70) {
    actions.push({
      id: actionId++,
      category: 'Professional Assessment',
      priority: 'High',
      title: 'Schedule professional wildfire assessment',
      description: 'Hire a certified wildfire mitigation specialist or contact your local fire department for a home assessment.',
      why: 'Your risk profile warrants expert evaluation. Professionals can identify vulnerabilities you might miss.',
      impact: 'High',
      effort: 'Quick',
      cost: '$',
      timeline: '2-4 weeks'
    });
  }

  if (property.vegetation === 'heavy' || property.slope === 'steep') {
    actions.push({
      id: actionId++,
      category: 'Professional Assessment',
      priority: 'Medium',
      title: 'Consult arborist for tree management',
      description: 'Get professional advice on which trees to remove, trim, or treat. Improper tree work can increase risk.',
      why: 'Professional tree management ensures safety and effectiveness, especially on steep terrain.',
      impact: 'Medium',
      effort: 'Quick',
      cost: '$',
      timeline: '2-3 weeks'
    });
  }

  return actions;
}

function getPrioritizedTasks() {
  const state = getState();
  const exposureData = calculateExposureRiskSync(state.property, 50); // Use sync version with default
  const vulnerabilityRisk = calculateVulnerabilityRisk(state.property);
  
  const allActions = generateActionPlan(state.property, exposureData, vulnerabilityRisk);
  
  const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const categoryOrder = { 
    'Home Hardening': 0, 
    'Defensible Space': 1, 
    'Maintenance': 2,
    'Insurance & Financial': 3,
    'Emergency Preparedness': 4,
    'Professional Assessment': 5
  };
  
  return allActions.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return categoryOrder[a.category] - categoryOrder[b.category];
  });
}

function getActionPlanSummary(property, exposureRisk, vulnerabilityRisk) {
  let summary = '';
  
  if (exposureRisk > 70 && vulnerabilityRisk > 70) {
    summary = 'Your property faces both high wildfire exposure from your location and significant structural vulnerabilities. This plan prioritizes critical home hardening and defensible space actions to reduce your risk immediately. Focus on ember-resistant vents, roof protection, and creating non-combustible zones first.';
  } else if (exposureRisk > 70 && vulnerabilityRisk <= 40) {
    summary = 'While your home is well-protected, your high-risk location requires maximum defensible space and emergency preparedness. This plan focuses on extending your defensible space, maintaining vigilance, and ensuring you\'re ready to evacuate if needed.';
  } else if (exposureRisk <= 40 && vulnerabilityRisk > 70) {
    summary = 'Your location has relatively low wildfire exposure, but your home has structural vulnerabilities that could be exploited if fire does reach your area. This plan focuses on cost-effective home hardening improvements that will also increase your property value and may reduce insurance costs.';
  } else if (exposureRisk > 60 || vulnerabilityRisk > 60) {
    summary = 'Your property has moderate wildfire risk. This plan balances home hardening, defensible space maintenance, and emergency preparedness. Focus on the quick wins first—many of these actions can be completed in a weekend and significantly reduce your risk.';
  } else {
    summary = 'Your property is in a relatively low-risk situation, but maintaining preparedness is still important. This plan focuses on preventive maintenance, insurance optimization, and emergency readiness to keep your risk low and ensure you\'re protected if conditions change.';
  }
  
  return summary;
}

function getReadinessPercentage(completedTaskIds) {
  const tasks = getPrioritizedTasks();
  if (tasks.length === 0) return 0;
  return Math.round((completedTaskIds.length / tasks.length) * 100);
}

function getThisWeeksTasks(completedTaskIds) {
  const tasks = getPrioritizedTasks();
  const uncompleted = tasks.filter(t => !completedTaskIds.includes(t.id));
  return uncompleted.slice(0, 3);
}
