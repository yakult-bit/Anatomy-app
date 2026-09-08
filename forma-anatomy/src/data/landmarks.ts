export type Landmark={id:string;name:string;position:[number,number,number];category:string;note:string;view?:string};
// Study markers aligned to the imported Z-Anatomy surfaces. Intercostal points remain approximate.
export const landmarks:Landmark[]=[
  {
    "id": "im-deltoid",
    "name": "Deltoid",
    "position": [
      -0.69703,
      1.70594,
      -0.01262
    ],
    "category": "im",
    "note": "Upper arm below the acromion. Identify the safe muscle region using supervised landmarking; this dot is not a needle placement guide."
  },
  {
    "id": "im-vastus",
    "name": "Vastus lateralis",
    "position": [
      -0.43834,
      -0.62387,
      0.1483
    ],
    "category": "im",
    "note": "Middle third of the anterolateral thigh, between the greater trochanter and lateral femoral condyle."
  },
  {
    "id": "im-ventro",
    "name": "Ventrogluteal region",
    "position": [
      0.49408,
      0.28106,
      -0.03079
    ],
    "category": "im",
    "view": "left",
    "note": "Lateral hip over gluteus medius/minimus. Identify the greater trochanter, anterior superior iliac spine, and iliac crest with supervision."
  },
  {
    "id": "pulse-carotid",
    "name": "Carotid pulse",
    "position": [
      -0.0855,
      2.03988,
      0.0384
    ],
    "category": "pulse",
    "note": "Lateral to the trachea. Assess one side at a time."
  },
  {
    "id": "pulse-brachial",
    "name": "Brachial pulse",
    "position": [
      -0.71034,
      0.85718,
      -0.02451
    ],
    "category": "pulse",
    "note": "Medial to the biceps tendon at the antecubital region."
  },
  {
    "id": "pulse-radial",
    "name": "Radial pulse",
    "position": [
      -0.862,
      0.19632,
      0.07794
    ],
    "category": "pulse",
    "note": "Thumb side of the volar wrist. Assess rate, rhythm, and strength."
  },
  {
    "id": "pulse-femoral",
    "name": "Femoral pulse",
    "position": [
      -0.17891,
      0.17248,
      0.13545
    ],
    "category": "pulse",
    "note": "Just below the inguinal ligament near the midpoint between the ASIS and pubic symphysis."
  },
  {
    "id": "pulse-popliteal",
    "name": "Popliteal pulse",
    "position": [
      -0.25035,
      -1.28272,
      -0.22912
    ],
    "category": "pulse",
    "view": "posterior",
    "note": "Deep in the popliteal fossa behind the knee; this is a posterior landmark."
  },
  {
    "id": "pulse-tibial",
    "name": "Posterior tibial pulse",
    "position": [
      -0.18226,
      -2.43125,
      -0.16595
    ],
    "category": "pulse",
    "note": "Behind the medial malleolus on the inner ankle."
  },
  {
    "id": "pulse-pedis",
    "name": "Dorsalis pedis pulse",
    "position": [
      -0.25451,
      -2.44167,
      0.10608
    ],
    "category": "pulse",
    "view": "superior",
    "note": "Dorsum of the foot, lateral to the extensor hallucis longus tendon."
  },
  {
    "id": "heart-aortic",
    "name": "Aortic area",
    "position": [
      -0.105,
      1.60264,
      0.31075
    ],
    "category": "heart",
    "note": "Second right intercostal space at the right sternal border. These marks indicate listening areas, not valve positions."
  },
  {
    "id": "heart-pulmonic",
    "name": "Pulmonic area",
    "position": [
      0.105,
      1.60264,
      0.31075
    ],
    "category": "heart",
    "note": "Second left intercostal space at the left sternal border."
  },
  {
    "id": "heart-erb",
    "name": "Erb’s point",
    "position": [
      0.105,
      1.50429,
      0.33375
    ],
    "category": "heart",
    "note": "Third left intercostal space at the left sternal border."
  },
  {
    "id": "heart-tricuspid",
    "name": "Tricuspid area",
    "position": [
      0.105,
      1.40999,
      0.37199
    ],
    "category": "heart",
    "note": "Lower left sternal border, usually fourth or fifth intercostal space."
  },
  {
    "id": "heart-mitral",
    "name": "Mitral / apical area",
    "position": [
      0.27,
      1.315,
      0.3795
    ],
    "category": "heart",
    "note": "Fifth left intercostal space at the midclavicular line."
  },
  {
    "id": "lung-apex-r",
    "name": "Right anterior apex",
    "position": [
      -0.18186,
      1.7872,
      0.09314
    ],
    "category": "lung",
    "note": "Compare corresponding right and left anterior upper lung areas."
  },
  {
    "id": "lung-apex-l",
    "name": "Left anterior apex",
    "position": [
      0.1859,
      1.78289,
      0.10029
    ],
    "category": "lung",
    "note": "Use a systematic side-to-side sequence over lung fields."
  },
  {
    "id": "lung-front-r",
    "name": "Right anterior field",
    "position": [
      -0.27612,
      1.41381,
      0.26084
    ],
    "category": "lung",
    "note": "Listen through a full respiratory cycle and document the location of abnormal sounds."
  },
  {
    "id": "lung-front-l",
    "name": "Left anterior field",
    "position": [
      0.31206,
      1.42319,
      0.22287
    ],
    "category": "lung",
    "note": "Compare sides; avoid listening directly over bone."
  },
  {
    "id": "lung-back-r",
    "name": "Right posterior base",
    "position": [
      -0.27024,
      1.15958,
      -0.25422
    ],
    "category": "lung",
    "view": "posterior",
    "note": "Posterior lower fields are important for assessing lower lobes. Compare with the left."
  },
  {
    "id": "lung-back-l",
    "name": "Left posterior base",
    "position": [
      0.27686,
      1.16026,
      -0.24592
    ],
    "category": "lung",
    "view": "posterior",
    "note": "Assess posterior lung fields systematically; these are representative study landmarks."
  },
  {
    "id": "iv-cephalic",
    "name": "Cephalic vein region",
    "position": [
      -0.86488,
      0.40714,
      0.02561
    ],
    "category": "iv",
    "note": "Superficial lateral forearm. Site choice requires assessment of the actual vein, prescribed therapy, and local policy."
  },
  {
    "id": "iv-basilic",
    "name": "Basilic vein region",
    "position": [
      0.67233,
      0.43081,
      -0.00985
    ],
    "category": "iv",
    "note": "Superficial medial forearm. Inspect the site for pain, swelling, redness, and leakage during therapy."
  },
  {
    "id": "iv-hand",
    "name": "Dorsal hand veins",
    "position": [
      -0.90705,
      -0.02683,
      0.06211
    ],
    "category": "iv",
    "view": "posterior",
    "note": "Dorsal metacarpal veins are common peripheral access sites. This schematic does not represent individual vein anatomy."
  }
];
