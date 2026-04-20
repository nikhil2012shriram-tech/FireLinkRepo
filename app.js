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
      vegetation: 'moderate',
      defensibleSpace: 'partial'
    },
    completedTasks: []
  };
}

function setState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function calculateRiskScore(property) {
  let score = 40;

  const vegetationWeights = { sparse: 0, moderate: 15, heavy: 30 };
  const roofWeights = { metal: 0, tile: 5, asphalt: 10, 'wood-shake': 25, other: 15 };
  const defensibleSpaceWeights = { clear: 0, partial: 10, cluttered: 20 };
  const homeTypeWeights = { 'single-family': 5, townhome: 3, 'multi-family': 0 };

  score += vegetationWeights[property.vegetation] || 15;
  score += roofWeights[property.roofMaterial] || 10;
  score += defensibleSpaceWeights[property.defensibleSpace] || 10;
  score += homeTypeWeights[property.homeType] || 5;

  return Math.min(100, Math.max(0, score));
}

function getRiskTier(score) {
  if (score <= 35) return { label: 'Low', color: '#4CAF50' };
  if (score <= 60) return { label: 'Moderate', color: '#FFC107' };
  if (score <= 80) return { label: 'High', color: '#FF9800' };
  return { label: 'Extreme', color: '#F44336' };
}

function getTopRiskFactors(property, score) {
  const factors = [];

  if (property.vegetation === 'heavy') {
    factors.push({ name: 'Heavy vegetation nearby', contribution: 30 });
  } else if (property.vegetation === 'moderate') {
    factors.push({ name: 'Moderate vegetation nearby', contribution: 15 });
  }

  if (property.roofMaterial === 'wood-shake') {
    factors.push({ name: 'Wood shake roof (fire-prone)', contribution: 25 });
  } else if (property.roofMaterial === 'asphalt') {
    factors.push({ name: 'Asphalt roof (moderate risk)', contribution: 10 });
  }

  if (property.defensibleSpace === 'cluttered') {
    factors.push({ name: 'Limited defensible space', contribution: 20 });
  } else if (property.defensibleSpace === 'partial') {
    factors.push({ name: 'Partial defensible space', contribution: 10 });
  }

  return factors.slice(0, 3);
}

const MITIGATION_TASKS = [
  { id: 1, title: 'Clear gutters and roof', description: 'Remove leaves, needles, and debris from gutters and roof', impact: 'High', effort: 'Half-day' },
  { id: 2, title: 'Trim trees within 30 ft', description: 'Remove dead branches and limbs within 30 feet of home', impact: 'High', effort: 'Weekend' },
  { id: 3, title: 'Create 5-ft defensible space', description: 'Remove dead plants and leaves within 5 feet of home', impact: 'High', effort: 'Half-day' },
  { id: 4, title: 'Replace wood siding', description: 'Upgrade to fire-resistant cladding (or skip if not applicable)', impact: 'Medium', effort: 'Weekend' },
  { id: 5, title: 'Install ember-resistant vents', description: '1/8-inch metal mesh on all vents and openings', impact: 'High', effort: 'Half-day' },
  { id: 6, title: 'Harden roof', description: 'Replace missing/damaged shingles; consider metal or tile roof', impact: 'High', effort: 'Weekend' },
  { id: 7, title: 'Mulch landscaping', description: 'Replace mulch with non-combustible rock around home', impact: 'Medium', effort: 'Quick' },
  { id: 8, title: 'Seal gaps and cracks', description: 'Seal gaps between deck boards, siding, and foundation', impact: 'Medium', effort: 'Half-day' }
];

function getPrioritizedTasks() {
  const impactOrder = { High: 0, Medium: 1, Low: 2 };
  const effortOrder = { Quick: 0, 'Half-day': 1, Weekend: 2 };

  return [...MITIGATION_TASKS].sort((a, b) => {
    if (impactOrder[a.impact] !== impactOrder[b.impact]) {
      return impactOrder[a.impact] - impactOrder[b.impact];
    }
    return effortOrder[a.effort] - effortOrder[b.effort];
  });
}

function getReadinessPercentage(completedTaskIds) {
  if (MITIGATION_TASKS.length === 0) return 0;
  return Math.round((completedTaskIds.length / MITIGATION_TASKS.length) * 100);
}

function getThisWeeksTasks(completedTaskIds) {
  const tasks = getPrioritizedTasks();
  const uncompleted = tasks.filter(t => !completedTaskIds.includes(t.id));
  return uncompleted.slice(0, 3);
}
