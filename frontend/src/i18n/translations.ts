export const translations = {
  es: {
    lang: 'es',
    title: 'Zea — Diagnostico inteligente de cultivos',
    whatsappMessage: 'Hola%2C%20quiero%20diagnosticar%20mi%20cultivo',
    nav: {
      howItWorks: 'Como funciona',
      cta: 'Probar en WhatsApp',
    },
    hero: {
      label: 'Biotech Field Agent',
      heading: 'Diagnostico de cultivos con',
      headingHighlight: 'peptidos antimicrobianos',
      sub: 'Envia una foto de tu planta enferma por WhatsApp. Zea identifica el patogeno y recomienda el peptido exacto para combatirlo. Ciencia de laboratorio, directo al campo.',
      cta: 'Probar en WhatsApp',
      secondary: 'Como funciona',
    },
    stats: [
      { value: '$3.1B', label: 'Agroquimicos AR / anio' },
      { value: '20-40%', label: 'Perdida de cosechas' },
      { value: '5', label: 'Patogenos en base de datos' },
      { value: '10', label: 'Alertas de bioseguridad' },
    ],
    process: {
      label: 'Proceso',
      title: 'Tres pasos. Un diagnostico.',
    },
    steps: [
      {
        number: '01',
        title: 'Fotografia',
        description: 'Sacale una foto a la planta afectada y enviala por WhatsApp. El agente usa vision artificial para identificar signos de enfermedad.',
        alt: 'Foto de planta',
      },
      {
        number: '02',
        title: 'Diagnostico',
        description: 'El modelo identifica el patogeno y lo cruza con nuestra base de datos curada de peptidos antimicrobianos con eficacia comprobada.',
        alt: 'Diagnostico de planta',
      },
      {
        number: '03',
        title: 'Recomendacion',
        description: 'Recibis el peptido especifico, concentracion, metodo de aplicacion y referencias cientificas. Todo verificado, sin alucinaciones.',
        alt: 'Recomendacion de peptido',
      },
    ],
    cta: {
      tagline: 'El campo, a tiempo.',
      button: 'Probar en WhatsApp',
    },
    footer: 'Zea — Hackathon Aleph 2026',
    langSwitch: { label: 'EN', href: '/en' },
  },
  en: {
    lang: 'en',
    title: 'Zea — Intelligent crop diagnostics',
    whatsappMessage: 'Hi%2C%20I%20want%20to%20diagnose%20my%20crop',
    nav: {
      howItWorks: 'How it works',
      cta: 'Try on WhatsApp',
    },
    hero: {
      label: 'Biotech Field Agent',
      heading: 'Crop diagnostics with',
      headingHighlight: 'antimicrobial peptides',
      sub: 'Send a photo of your sick plant via WhatsApp. Zea identifies the pathogen and recommends the exact peptide to fight it. Lab science, straight to the field.',
      cta: 'Try on WhatsApp',
      secondary: 'How it works',
    },
    stats: [
      { value: '$3.1B', label: 'Agrochemicals AR / year' },
      { value: '20-40%', label: 'Crop loss' },
      { value: '5', label: 'Pathogens in database' },
      { value: '10', label: 'Biosecurity alerts' },
    ],
    process: {
      label: 'Process',
      title: 'Three steps. One diagnosis.',
    },
    steps: [
      {
        number: '01',
        title: 'Photograph',
        description: 'Take a photo of the affected plant and send it via WhatsApp. The agent uses computer vision to identify signs of disease.',
        alt: 'Plant photo',
      },
      {
        number: '02',
        title: 'Diagnosis',
        description: 'The model identifies the pathogen and cross-references it against our curated database of antimicrobial peptides with proven efficacy.',
        alt: 'Plant diagnosis',
      },
      {
        number: '03',
        title: 'Recommendation',
        description: 'You get the specific peptide, concentration, application method, and scientific references. All verified, no hallucinations.',
        alt: 'Peptide recommendation',
      },
    ],
    cta: {
      tagline: 'The field, on time.',
      button: 'Try on WhatsApp',
    },
    footer: 'Zea — Aleph Hackathon 2026',
    langSwitch: { label: 'ES', href: '/' },
  },
} as const;

export type Locale = keyof typeof translations;
