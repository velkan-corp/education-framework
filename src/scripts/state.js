export const state = {
  currentTab: 'framework',
  currentView: 'age',
  profile: {
    // Research-informed temperament observation controls
    energy: 'balanced',
    reactivity: 'balanced',
    selfRegulation: 'balanced',
    // Developmental-domain observation controls (not a screen)
    communication: 'balanced',
    problemSolving: 'balanced',
    grossMotor: 'balanced',
    fineMotor: 'balanced',
    personalSocial: 'balanced',
    // Executive-function observation controls (not a standardized scale)
    inhibit: 'balanced',
    shift: 'balanced',
    emotionalControl: 'balanced',
    workingMemory: 'balanced',
    planOrganize: 'balanced'
  },
  collapsed: {
    temperament: true,
    development: true,
    executiveFunction: true
  }
};
