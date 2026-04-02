export const state = {
  currentTab: 'framework',
  currentView: 'age',
  profile: {
    // Rothbart ECBQ — Surgency/Extraversion
    energy: 'balanced',
    // Rothbart ECBQ — Negative Affectivity
    reactivity: 'balanced',
    // Rothbart ECBQ — Effortful Control
    selfRegulation: 'balanced',
    // ASQ
    communication: 'balanced',
    problemSolving: 'balanced',
    grossMotor: 'balanced',
    fineMotor: 'balanced',
    personalSocial: 'balanced',
    // BRIEF-P
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

export const childProfiles = {
  nico: {
    label: 'Nico',
    profile: {
      energy: 'introvert',
      reactivity: 'balanced',
      selfRegulation: 'high',
      communication: 'advanced',
      problemSolving: 'advanced',
      grossMotor: 'balanced',
      fineMotor: 'advanced',
      personalSocial: 'advanced',
      inhibit: 'advanced',
      shift: 'advanced',
      emotionalControl: 'balanced',
      workingMemory: 'advanced',
      planOrganize: 'balanced'
    },
    // Full ECBQ subscale-level assessment (for dossier reference, not sidebar toggles)
    ecbq: {
      surgency: {
        activityLevel: 'low',
        highIntensityPleasure: 'balanced',
        impulsivity: 'low',
        positiveAnticipation: 'high',
        sociability: 'balanced'
      },
      negativeAffectivity: {
        discomfort: 'balanced',
        fear: 'low',
        frustration: 'balanced',
        motorActivation: 'high',
        sadness: 'balanced',
        perceptualSensitivity: 'high'
      },
      effortfulControl: {
        attentionFocusing: 'high',
        attentionShifting: 'balanced',
        cuddliness: 'balanced',
        inhibitoryControl: 'high',
        lowIntensityPleasure: 'high',
        soothability: 'high'
      }
    }
  },
  maia: {
    label: 'Maia',
    profile: {
      energy: 'balanced',
      reactivity: 'balanced',
      selfRegulation: 'balanced',
      communication: 'balanced',
      problemSolving: 'balanced',
      grossMotor: 'balanced',
      fineMotor: 'balanced',
      personalSocial: 'balanced',
      inhibit: 'balanced',
      shift: 'balanced',
      emotionalControl: 'balanced',
      workingMemory: 'balanced',
      planOrganize: 'balanced'
    },
    ecbq: null
  }
};
