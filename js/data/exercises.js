// ══ BANCO DE EJERCICIOS — ~84 ejercicios por grupo muscular ══
// weight: true = se registra peso; false = peso corporal / tiempo
// reps tipo '8-12' = repeticiones objetivo; '30-60s' = tiempo

const MUSCLES = {
  pecho:'Pecho', espalda:'Espalda', hombros:'Hombros', biceps:'Bíceps',
  triceps:'Tríceps', antebrazos:'Antebrazos', cuadriceps:'Cuádriceps',
  isquios:'Isquiotibiales', gluteos:'Glúteos', pantorrillas:'Pantorrillas',
  core:'Core', trapecio:'Trapecio', lumbares:'Lumbares', cardio:'Cardio'
};

const EQUIP = {
  barra:'🏋️ Barra', mancuerna:'💪 Mancuernas', maquina:'🔧 Máquina',
  polea:'🔗 Polea', corporal:'🤸 Peso corporal', kettlebell:'🔔 Kettlebell',
  cardio:'🏃 Cardio', banda:'🎗️ Banda'
};

const EXERCISES = [
  // ── PECHO ──────────────────────────────────────────────
  {id:'bench_press',       name:'Press de banca',                muscle:['pecho','triceps','hombros'], equipment:'barra',     weight:true,  sets:4, reps:'8-12', rest:90,  notes:'Escápulas retraídas, agarre a anchura de hombros'},
  {id:'incline_bench',     name:'Press inclinado con barra',     muscle:['pecho','hombros'],           equipment:'barra',     weight:true,  sets:4, reps:'8-12', rest:90,  notes:'Banco a 30-45°, enfoca pecho superior'},
  {id:'decline_bench',     name:'Press declinado con barra',     muscle:['pecho','triceps'],           equipment:'barra',     weight:true,  sets:3, reps:'8-12', rest:90,  notes:'Enfoca pecho inferior'},
  {id:'db_bench',          name:'Press plano con mancuernas',    muscle:['pecho','triceps'],           equipment:'mancuerna', weight:true,  sets:4, reps:'8-12', rest:90,  notes:'Mayor rango de movimiento que la barra'},
  {id:'db_incline',        name:'Press inclinado con mancuernas',muscle:['pecho','hombros'],           equipment:'mancuerna', weight:true,  sets:3, reps:'8-12', rest:90,  notes:''},
  {id:'db_fly',            name:'Aperturas con mancuernas',      muscle:['pecho'],                     equipment:'mancuerna', weight:true,  sets:3, reps:'10-15', rest:60, notes:'Codos semi-flexionados, estira sin rebotar'},
  {id:'cable_crossover',   name:'Crossover en polea',            muscle:['pecho'],                     equipment:'polea',     weight:true,  sets:3, reps:'12-15', rest:60, notes:'Aprieta al centro 1 segundo'},
  {id:'chest_dips',        name:'Fondos en paralelas',           muscle:['pecho','triceps'],           equipment:'corporal',  weight:false, sets:3, reps:'8-12', rest:90,  notes:'Inclínate adelante para enfocar pecho'},
  {id:'pushups',           name:'Flexiones',                     muscle:['pecho','triceps','core'],    equipment:'corporal',  weight:false, sets:3, reps:'10-20', rest:60, notes:'Cuerpo en línea recta'},
  {id:'db_pullover',       name:'Pullover con mancuerna',        muscle:['pecho','espalda'],           equipment:'mancuerna', weight:true,  sets:3, reps:'10-15', rest:60, notes:''},

  // ── ESPALDA ────────────────────────────────────────────
  {id:'pullups',           name:'Dominadas',                     muscle:['espalda','biceps'],          equipment:'corporal',  weight:false, sets:4, reps:'6-12', rest:120, notes:'Agarre prono, pecho a la barra'},
  {id:'chinups',           name:'Dominadas supinas',             muscle:['espalda','biceps'],          equipment:'corporal',  weight:false, sets:3, reps:'6-12', rest:120, notes:'Agarre supino, más énfasis en bíceps'},
  {id:'lat_pulldown',      name:'Jalón al pecho',                muscle:['espalda','biceps'],          equipment:'polea',     weight:true,  sets:4, reps:'10-12', rest:90, notes:'Lleva la barra al pecho, no detrás'},
  {id:'barbell_row',       name:'Remo con barra',                muscle:['espalda','biceps','lumbares'],equipment:'barra',    weight:true,  sets:4, reps:'8-10', rest:90,  notes:'Torso a 45°, espalda neutra'},
  {id:'db_row',            name:'Remo con mancuerna',            muscle:['espalda','biceps'],          equipment:'mancuerna', weight:true,  sets:3, reps:'8-12', rest:90,  notes:'Un brazo, apoyo en banco'},
  {id:'cable_row',         name:'Remo en polea baja',            muscle:['espalda','biceps'],          equipment:'polea',     weight:true,  sets:3, reps:'10-12', rest:90, notes:'Lleva codos atrás, aprieta escápulas'},
  {id:'deadlift',          name:'Peso muerto',                   muscle:['espalda','isquios','gluteos','lumbares'], equipment:'barra', weight:true, sets:4, reps:'5-8', rest:150, notes:'Espalda neutra, empuja el piso'},
  {id:'hyperextension',    name:'Hiperextensiones',              muscle:['lumbares','gluteos','isquios'], equipment:'maquina', weight:false, sets:3, reps:'12-15', rest:60, notes:'Sube hasta línea recta, sin hiperextender'},
  {id:'inverted_row',      name:'Remo invertido',                muscle:['espalda','biceps'],          equipment:'corporal',  weight:false, sets:3, reps:'8-15', rest:90,  notes:'Barra baja o TRX, cuerpo recto'},

  // ── HOMBROS ────────────────────────────────────────────
  {id:'ohp',               name:'Press militar con barra',       muscle:['hombros','triceps'],         equipment:'barra',     weight:true,  sets:4, reps:'6-10', rest:120, notes:'De pie, core apretado'},
  {id:'arnold_press',      name:'Press Arnold',                  muscle:['hombros'],                   equipment:'mancuerna', weight:true,  sets:3, reps:'8-12', rest:90,  notes:'Rota las palmas al subir'},
  {id:'db_shoulder_press', name:'Press de hombro con mancuernas',muscle:['hombros','triceps'],         equipment:'mancuerna', weight:true,  sets:4, reps:'8-12', rest:90,  notes:''},
  {id:'lateral_raise',     name:'Elevaciones laterales',         muscle:['hombros'],                   equipment:'mancuerna', weight:true,  sets:4, reps:'12-15', rest:60, notes:'Codos ligeramente flexionados, sin impulso'},
  {id:'front_raise',       name:'Elevaciones frontales',         muscle:['hombros'],                   equipment:'mancuerna', weight:true,  sets:3, reps:'12-15', rest:60, notes:''},
  {id:'face_pull',         name:'Face pull',                     muscle:['hombros','trapecio'],        equipment:'polea',     weight:true,  sets:3, reps:'15-20', rest:60, notes:'Cuerda a la cara, codos altos — salud de hombro'},
  {id:'shrugs',            name:'Encogimientos',                 muscle:['trapecio'],                  equipment:'mancuerna', weight:true,  sets:3, reps:'12-15', rest:60, notes:'Sube hombros, pausa arriba'},

  // ── BÍCEPS ─────────────────────────────────────────────
  {id:'barbell_curl',      name:'Curl con barra',                muscle:['biceps'],                    equipment:'barra',     weight:true,  sets:3, reps:'8-12', rest:60,  notes:'Codos fijos al torso'},
  {id:'db_curl',           name:'Curl alterno con mancuernas',   muscle:['biceps'],                    equipment:'mancuerna', weight:true,  sets:3, reps:'10-12', rest:60, notes:'Supina al subir'},
  {id:'hammer_curl',       name:'Curl martillo',                 muscle:['biceps','antebrazos'],       equipment:'mancuerna', weight:true,  sets:3, reps:'10-12', rest:60, notes:'Agarre neutro'},
  {id:'preacher_curl',     name:'Curl predicador',               muscle:['biceps'],                    equipment:'maquina',   weight:true,  sets:3, reps:'10-12', rest:60, notes:'Extensión completa abajo'},
  {id:'cable_curl',        name:'Curl en polea',                 muscle:['biceps'],                    equipment:'polea',     weight:true,  sets:3, reps:'12-15', rest:60, notes:'Tensión constante'},

  // ── TRÍCEPS ────────────────────────────────────────────
  {id:'tricep_pushdown',   name:'Extensión de tríceps en polea', muscle:['triceps'],                   equipment:'polea',     weight:true,  sets:3, reps:'10-15', rest:60, notes:'Codos pegados al cuerpo'},
  {id:'french_press',      name:'Press francés',                 muscle:['triceps'],                   equipment:'barra',     weight:true,  sets:3, reps:'8-12', rest:90,  notes:'Barra Z, baja a la frente'},
  {id:'bench_dips',        name:'Fondos entre bancos',           muscle:['triceps'],                   equipment:'corporal',  weight:false, sets:3, reps:'10-15', rest:60, notes:'Piernas extendidas para más dificultad'},
  {id:'overhead_ext',      name:'Extensión sobre cabeza',        muscle:['triceps'],                   equipment:'mancuerna', weight:true,  sets:3, reps:'10-12', rest:60, notes:'Mancuerna a dos manos'},
  {id:'tricep_kickback',   name:'Patada de tríceps',             muscle:['triceps'],                   equipment:'mancuerna', weight:true,  sets:3, reps:'12-15', rest:60, notes:'Torso paralelo al piso'},

  // ── PIERNAS ────────────────────────────────────────────
  {id:'squat',             name:'Sentadilla libre',              muscle:['cuadriceps','gluteos','core'], equipment:'barra',   weight:true,  sets:4, reps:'6-10', rest:150, notes:'Profundidad al paralelo o más, rodillas afuera'},
  {id:'smith_squat',       name:'Sentadilla en Smith',           muscle:['cuadriceps','gluteos'],      equipment:'maquina',   weight:true,  sets:4, reps:'8-12', rest:120, notes:''},
  {id:'leg_press',         name:'Prensa de piernas',             muscle:['cuadriceps','gluteos'],      equipment:'maquina',   weight:true,  sets:4, reps:'10-12', rest:120, notes:'No bloquees rodillas arriba'},
  {id:'leg_extension',     name:'Extensión de cuádriceps',       muscle:['cuadriceps'],                equipment:'maquina',   weight:true,  sets:3, reps:'12-15', rest:60, notes:'Pausa arriba 1 segundo'},
  {id:'leg_curl',          name:'Curl femoral',                  muscle:['isquios'],                   equipment:'maquina',   weight:true,  sets:3, reps:'10-15', rest:60, notes:''},
  {id:'romanian_dl',       name:'Peso muerto rumano',            muscle:['isquios','gluteos','lumbares'], equipment:'barra',  weight:true,  sets:4, reps:'8-12', rest:120, notes:'Cadera atrás, piernas semi-rígidas'},
  {id:'hip_thrust',        name:'Hip thrust',                    muscle:['gluteos','isquios'],         equipment:'barra',     weight:true,  sets:4, reps:'8-12', rest:90,  notes:'Aprieta glúteo arriba 1-2 segundos'},
  {id:'standing_calf',     name:'Elevación de gemelos de pie',   muscle:['pantorrillas'],              equipment:'maquina',   weight:true,  sets:4, reps:'12-20', rest:60, notes:'Rango completo, pausa arriba'},
  {id:'seated_calf',       name:'Gemelos sentado',               muscle:['pantorrillas'],              equipment:'maquina',   weight:true,  sets:3, reps:'15-20', rest:60, notes:'Enfoca el sóleo'},
  {id:'lunges',            name:'Zancadas con mancuernas',       muscle:['cuadriceps','gluteos'],      equipment:'mancuerna', weight:true,  sets:3, reps:'10-12', rest:90, notes:'Por pierna'},
  {id:'bulgarian_squat',   name:'Bulgarian split squat',         muscle:['cuadriceps','gluteos'],      equipment:'mancuerna', weight:true,  sets:3, reps:'8-12', rest:90,  notes:'Pie trasero en banco, por pierna'},
  {id:'goblet_squat',      name:'Sentadilla goblet',             muscle:['cuadriceps','gluteos','core'], equipment:'mancuerna', weight:true, sets:3, reps:'10-15', rest:90, notes:'Mancuerna al pecho'},

  // ── CORE ───────────────────────────────────────────────
  {id:'plank',             name:'Plancha',                       muscle:['core'],                      equipment:'corporal',  weight:false, sets:3, reps:'30-60s', rest:60, notes:'Glúteos y abdomen apretados'},
  {id:'crunch',            name:'Crunch',                        muscle:['core'],                      equipment:'corporal',  weight:false, sets:3, reps:'15-20', rest:45, notes:''},
  {id:'ab_wheel',          name:'Rueda abdominal',               muscle:['core','lumbares'],           equipment:'corporal',  weight:false, sets:3, reps:'8-12', rest:90,  notes:'No arquees la espalda baja'},
  {id:'leg_raise',         name:'Elevación de piernas',          muscle:['core'],                      equipment:'corporal',  weight:false, sets:3, reps:'10-15', rest:60, notes:'Colgado o acostado'},
  {id:'russian_twist',     name:'Russian twist',                 muscle:['core'],                      equipment:'corporal',  weight:false, sets:3, reps:'20-30', rest:45, notes:'Con disco o mancuerna opcional'},
  {id:'side_plank',        name:'Plancha lateral',               muscle:['core'],                      equipment:'corporal',  weight:false, sets:3, reps:'30-45s', rest:45, notes:'Por lado'},
  {id:'dead_bug',          name:'Dead bug',                      muscle:['core'],                      equipment:'corporal',  weight:false, sets:3, reps:'10-12', rest:45, notes:'Espalda baja pegada al piso'},
  {id:'pallof_press',      name:'Pallof press',                  muscle:['core'],                      equipment:'polea',     weight:true,  sets:3, reps:'12-15', rest:60, notes:'Anti-rotación, por lado'},

  // ── CALISTENIA ─────────────────────────────────────────
  {id:'diamond_pushups',   name:'Flexiones diamante',            muscle:['triceps','pecho'],           equipment:'corporal',  weight:false, sets:3, reps:'8-15', rest:60,  notes:'Manos juntas en triángulo'},
  {id:'decline_pushups',   name:'Flexiones declinadas',          muscle:['pecho','hombros'],           equipment:'corporal',  weight:false, sets:3, reps:'10-15', rest:60, notes:'Pies elevados'},
  {id:'pike_pushups',      name:'Flexiones pike',                muscle:['hombros','triceps'],         equipment:'corporal',  weight:false, sets:3, reps:'8-12', rest:90,  notes:'Cadera arriba, progresión a handstand'},
  {id:'muscle_up',         name:'Muscle-up',                     muscle:['espalda','pecho','triceps'], equipment:'corporal',  weight:false, sets:3, reps:'3-6', rest:150,  notes:'Avanzado — domina dominadas explosivas primero'},
  {id:'l_sit',             name:'L-sit',                         muscle:['core','triceps'],            equipment:'corporal',  weight:false, sets:3, reps:'10-30s', rest:90, notes:'En paralelas o piso'},
  {id:'pistol_squat',      name:'Pistol squat',                  muscle:['cuadriceps','gluteos','core'], equipment:'corporal', weight:false, sets:3, reps:'5-8', rest:90,  notes:'Por pierna, usa apoyo si es necesario'},
  {id:'burpees',           name:'Burpees',                       muscle:['cardio','core','pecho'],     equipment:'corporal',  weight:false, sets:3, reps:'10-15', rest:60, notes:'Ritmo constante'},
  {id:'mountain_climbers', name:'Mountain climbers',             muscle:['cardio','core'],             equipment:'corporal',  weight:false, sets:3, reps:'30-45s', rest:45, notes:'Cadera baja, rodillas al pecho'},
  {id:'glute_bridge',      name:'Puente de glúteo',              muscle:['gluteos','isquios'],         equipment:'corporal',  weight:false, sets:3, reps:'15-20', rest:45, notes:'Pausa arriba'},

  // ── CARDIO / HIIT ──────────────────────────────────────
  {id:'jump_rope',         name:'Salto de cuerda',               muscle:['cardio','pantorrillas'],     equipment:'cardio',    weight:false, sets:4, reps:'60s', rest:60,   notes:''},
  {id:'sprint',            name:'Sprints',                       muscle:['cardio','cuadriceps','isquios'], equipment:'cardio', weight:false, sets:6, reps:'20-30s', rest:90, notes:'Máxima intensidad'},
  {id:'rowing_machine',    name:'Remo en máquina',               muscle:['cardio','espalda'],          equipment:'cardio',    weight:false, sets:1, reps:'10-20min', rest:0, notes:'Piernas → torso → brazos'},
  {id:'stationary_bike',   name:'Bicicleta estacionaria',        muscle:['cardio','cuadriceps'],       equipment:'cardio',    weight:false, sets:1, reps:'20-40min', rest:0, notes:''},
  {id:'box_jumps',         name:'Box jumps',                     muscle:['cardio','cuadriceps','gluteos'], equipment:'corporal', weight:false, sets:4, reps:'8-12', rest:90, notes:'Aterriza suave'},
  {id:'kb_swing',          name:'Kettlebell swing',              muscle:['gluteos','isquios','cardio'],equipment:'kettlebell',weight:true,  sets:4, reps:'15-20', rest:60,  notes:'Impulso de cadera, no de brazos'},
  {id:'stairmaster',       name:'Escaladora',                    muscle:['cardio','gluteos'],          equipment:'cardio',    weight:false, sets:1, reps:'15-30min', rest:0, notes:''},
  {id:'incline_walk',      name:'Caminata inclinada',            muscle:['cardio'],                    equipment:'cardio',    weight:false, sets:1, reps:'20-40min', rest:0, notes:'Inclinación 10-15%, cardio LISS'},

  // ── MOVILIDAD ──────────────────────────────────────────
  {id:'hamstring_stretch', name:'Estiramiento de isquios',       muscle:['isquios'],                   equipment:'corporal',  weight:false, sets:2, reps:'30-45s', rest:15, notes:'Por pierna, sin rebote'},
  {id:'cat_cow',           name:'Gato-vaca',                     muscle:['lumbares','core'],           equipment:'corporal',  weight:false, sets:2, reps:'10-12', rest:15, notes:'Movilidad de columna'},
  {id:'band_dislocates',   name:'Rotaciones de hombro con banda',muscle:['hombros'],                   equipment:'banda',     weight:false, sets:2, reps:'10-15', rest:15, notes:'Agarre amplio, movilidad de hombro'},
  {id:'hip_flexor_stretch',name:'Estiramiento de flexor de cadera', muscle:['cuadriceps'],             equipment:'corporal',  weight:false, sets:2, reps:'30-45s', rest:15, notes:'Por lado, zancada baja'},
];

// Plantillas de rutinas sugeridas
const ROUTINE_TEMPLATES = [
  { name:'Push A — Pecho, Hombro, Tríceps', days:['lun','jue'],
    ex:['bench_press','incline_bench','db_shoulder_press','lateral_raise','tricep_pushdown','french_press'] },
  { name:'Pull A — Espalda y Bíceps', days:['mar','vie'],
    ex:['deadlift','pullups','barbell_row','lat_pulldown','face_pull','barbell_curl','hammer_curl'] },
  { name:'Legs A — Pierna completa', days:['mie','sab'],
    ex:['squat','romanian_dl','leg_press','leg_curl','hip_thrust','standing_calf'] },
  { name:'Upper — Torso completo', days:['lun','jue'],
    ex:['bench_press','barbell_row','ohp','lat_pulldown','db_fly','barbell_curl','tricep_pushdown'] },
  { name:'Lower — Pierna y core', days:['mar','vie'],
    ex:['squat','romanian_dl','bulgarian_squat','leg_extension','standing_calf','plank','ab_wheel'] },
  { name:'Full Body — Cuerpo completo', days:['lun','mie','vie'],
    ex:['squat','bench_press','barbell_row','ohp','romanian_dl','plank'] },
  { name:'Calistenia — Sin equipo', days:['lun','mie','vie','sab'],
    ex:['pullups','pushups','chest_dips','pike_pushups','pistol_squat','l_sit','burpees'] },
  { name:'HIIT — Quema y resistencia', days:['mar','sab'],
    ex:['jump_rope','burpees','box_jumps','kb_swing','mountain_climbers','sprint'] },
];

const EX_BY_ID = {};
EXERCISES.forEach(e => EX_BY_ID[e.id] = e);
