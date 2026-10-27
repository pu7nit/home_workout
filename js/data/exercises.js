// Built-in home strength exercise library.
// tracking: 'reps-weight' | 'reps' | 'duration' | 'weight-duration'
// Muscle ids must match data/muscles.js.

function ex(id, name, primary, secondary, equipment, pattern, difficulty, tracking, opts = {}) {
  return {
    id,
    name,
    primary,
    secondary,
    equipment,
    pattern,
    difficulty,
    tracking,
    sets: 3,
    repMin: 8,
    repMax: 12,
    rest: 90,
    instructions: '',
    tip: '',
    ...opts,
    isCustom: false
  };
}

export const EXERCISES = [
  // ---------------- chest ----------------
  ex('push-up', 'Push-up', ['chest'], ['frontDelts', 'triceps', 'abs'], ['bodyweight'], 'horizontal-push', 'beginner', 'reps', {
    repMin: 6, repMax: 15, rest: 75,
    instructions: 'Set your hands slightly wider than your shoulders, brace your body in one line, and lower your chest toward the floor. Press back up without letting your hips sag.',
    tip: 'Elevate your hands on a chair to make it easier; raise your feet to make it harder.'
  }),
  ex('incline-push-up', 'Incline push-up', ['chest'], ['frontDelts', 'triceps'], ['bodyweight', 'chair'], 'horizontal-push', 'beginner', 'reps', {
    repMin: 8, repMax: 15, rest: 60,
    instructions: 'Place your hands on a stable chair or countertop and walk your feet back. Lower your chest to the edge, then press away while keeping a straight line from head to heels.',
    tip: 'A higher surface makes the movement easier, a lower one harder.'
  }),
  ex('decline-push-up', 'Decline push-up', ['chest'], ['frontDelts', 'triceps', 'abs'], ['bodyweight', 'chair'], 'horizontal-push', 'intermediate', 'reps', {
    repMin: 6, repMax: 12,
    instructions: 'With your feet on a low, stable step and hands on the floor, lower your chest under control, then press up. Keep your ribs and hips level.',
    tip: 'Stop a set when your lower back starts to arch.'
  }),
  ex('knee-push-up', 'Knee push-up', ['chest'], ['frontDelts', 'triceps'], ['bodyweight'], 'horizontal-push', 'beginner', 'reps', {
    repMin: 8, repMax: 15, rest: 60,
    instructions: 'Kneel and place your hands under your shoulders. Keeping a line from knees to head, lower your chest and press back up.',
    tip: 'Place a folded towel under your knees for comfort.'
  }),
  ex('db-floor-press', 'Dumbbell floor press', ['chest'], ['triceps', 'frontDelts'], ['dumbbells'], 'horizontal-push', 'beginner', 'reps-weight', {
    repMin: 8, repMax: 12, rest: 90,
    instructions: 'Lie on your back with knees bent, upper arms resting on the floor and dumbbells above your chest. Lower until your upper arms touch the floor, then press up.',
    tip: 'The floor naturally limits how deep you go, which is friendly to the shoulders.'
  }),
  ex('db-bench-press', 'Dumbbell bench press', ['chest'], ['triceps', 'frontDelts'], ['dumbbells', 'bench'], 'horizontal-push', 'intermediate', 'reps-weight', {
    repMin: 8, repMax: 12, rest: 120,
    instructions: 'Lie on a bench holding dumbbells beside your chest. Press them up over your shoulders, then lower slowly with elbows about 45 degrees from your ribs.',
    tip: 'Keep your shoulder blades gently anchored to the bench.'
  }),
  ex('db-fly', 'Dumbbell fly', ['chest'], ['frontDelts'], ['dumbbells', 'bench'], 'horizontal-push', 'intermediate', 'reps-weight', {
    repMin: 10, repMax: 15, rest: 75,
    instructions: 'Lie on a bench with dumbbells above your chest and a soft bend in your elbows. Open your arms in a wide arc until you feel a gentle chest stretch, then hug back in.',
    tip: 'Use lighter weight than pressing and never force the stretch.'
  }),
  ex('band-chest-press', 'Band chest press', ['chest'], ['triceps', 'frontDelts'], ['bands'], 'horizontal-push', 'beginner', 'reps', {
    repMin: 10, repMax: 20, rest: 60,
    instructions: 'Anchor a band behind you at chest height. Hold the handles beside your chest and press forward until your arms are long, then return slowly.',
    tip: 'Step further from the anchor for more resistance.'
  }),
  ex('wide-push-up', 'Wide push-up', ['chest'], ['frontDelts', 'triceps'], ['bodyweight'], 'horizontal-push', 'intermediate', 'reps', {
    repMin: 6, repMax: 12,
    instructions: 'Set your hands wider than shoulder width and perform a push-up while keeping your elbows angled slightly outward.',
    tip: 'Do not let your hands creep so wide that your shoulders feel pinched.'
  }),

  // ---------------- shoulders / traps ----------------
  ex('db-overhead-press', 'Dumbbell overhead press', ['frontDelts'], ['sideDelts', 'triceps', 'traps'], ['dumbbells'], 'vertical-push', 'beginner', 'reps-weight', {
    repMin: 8, repMax: 12, rest: 90,
    instructions: 'Stand tall with dumbbells at shoulder height. Press them overhead without arching your lower back, then lower under control.',
    tip: 'Squeeze your glutes lightly and keep your ribs stacked over your hips.'
  }),
  ex('seated-db-press', 'Seated dumbbell press', ['frontDelts'], ['sideDelts', 'triceps'], ['dumbbells', 'bench'], 'vertical-push', 'intermediate', 'reps-weight', {
    repMin: 8, repMax: 12, rest: 90,
    instructions: 'Sit on a bench with back support and dumbbells at shoulder height. Press overhead until your arms are nearly straight, then lower slowly.',
    tip: 'Keep your head supported and avoid pushing your ribs forward.'
  }),
  ex('pike-push-up', 'Pike push-up', ['frontDelts'], ['triceps', 'sideDelts', 'upperBack'], ['bodyweight'], 'vertical-push', 'intermediate', 'reps', {
    repMin: 5, repMax: 12, rest: 90,
    instructions: 'Start in a downward-dog shape with hips high. Bend your elbows to lower the top of your head toward the floor, then press back up.',
    tip: 'Elevate your feet on a chair for a harder variation.'
  }),
  ex('db-lateral-raise', 'Dumbbell lateral raise', ['sideDelts'], ['traps'], ['dumbbells'], 'isolation', 'beginner', 'reps-weight', {
    repMin: 10, repMax: 15, rest: 60, sets: 3,
    instructions: 'Hold light dumbbells at your sides with soft elbows. Lift your arms out to shoulder height, leading with the elbows, then lower slowly.',
    tip: 'Small weights and clean reps beat swinging bigger ones.'
  }),
  ex('db-front-raise', 'Dumbbell front raise', ['frontDelts'], ['sideDelts'], ['dumbbells'], 'isolation', 'beginner', 'reps-weight', {
    repMin: 10, repMax: 15, rest: 60,
    instructions: 'Hold dumbbells in front of your thighs. Raise them forward to shoulder height with straight but soft elbows, then lower with control.',
    tip: 'Stop at shoulder height and avoid leaning back.'
  }),
  ex('db-rear-delt-fly', 'Bent-over rear delt fly', ['rearDelts'], ['upperBack', 'traps'], ['dumbbells'], 'isolation', 'beginner', 'reps-weight', {
    repMin: 12, repMax: 18, rest: 60,
    instructions: 'Hinge forward until your torso is almost parallel to the floor, arms hanging down. Sweep the dumbbells out to your sides, then lower slowly.',
    tip: 'Think about moving your elbows apart rather than lifting with your hands.'
  }),
  ex('band-pull-apart', 'Band pull-apart', ['rearDelts'], ['upperBack', 'traps'], ['bands'], 'horizontal-pull', 'beginner', 'reps', {
    repMin: 12, repMax: 20, rest: 45,
    instructions: 'Hold a band at chest height with straight arms. Pull it apart until your arms are wide open, squeezing your upper back, then return slowly.',
    tip: 'A great warm-up for posture-focused sessions.'
  }),
  ex('band-face-pull', 'Band face pull', ['rearDelts'], ['upperBack', 'traps'], ['bands'], 'horizontal-pull', 'beginner', 'reps', {
    repMin: 12, repMax: 20, rest: 45,
    instructions: 'Anchor a band at face height. Pull the handles toward your forehead while opening your elbows wide, then return slowly.',
    tip: 'Keep your neck relaxed and finish with a gentle upper-back squeeze.'
  }),
  ex('upright-row', 'Dumbbell upright row', ['traps'], ['sideDelts', 'rearDelts'], ['dumbbells'], 'isolation', 'intermediate', 'reps-weight', {
    repMin: 10, repMax: 15, rest: 60,
    instructions: 'Hold dumbbells in front of your thighs and pull them upward along your body with elbows leading. Stop around chest height and lower slowly.',
    tip: 'If your shoulders feel cramped, use a narrower range or swap for lateral raises.'
  }),
  ex('db-shrug', 'Dumbbell shrug', ['traps'], ['forearms'], ['dumbbells'], 'isolation', 'beginner', 'reps-weight', {
    repMin: 12, repMax: 18, rest: 60,
    instructions: 'Stand tall holding dumbbells at your sides. Lift your shoulders straight up toward your ears, pause, then lower slowly.',
    tip: 'Avoid rolling your shoulders; a straight up-and-down path is plenty.'
  }),

  // ---------------- back ----------------
  ex('pull-up', 'Pull-up', ['lats'], ['biceps', 'upperBack', 'forearms'], ['pullupBar'], 'vertical-pull', 'advanced', 'reps', {
    repMin: 3, repMax: 8, rest: 120, bodyweightLoad: true,
    instructions: 'Hang from a bar with hands a little wider than your shoulders. Pull your chest toward the bar with your elbows leading down, then lower slowly to a full hang.',
    tip: 'Use a chair to step up or a band for assistance while you build reps.'
  }),
  ex('chin-up', 'Chin-up', ['lats'], ['biceps', 'upperBack', 'forearms'], ['pullupBar'], 'vertical-pull', 'advanced', 'reps', {
    repMin: 3, repMax: 8, rest: 120, bodyweightLoad: true,
    instructions: 'Hang with palms facing you. Pull your chin toward the bar while keeping your ribs down, then lower with control.',
    tip: 'The closer grip makes this a friendly pull-up variation for biceps.'
  }),
  ex('inverted-row', 'Inverted row', ['upperBack'], ['lats', 'biceps', 'rearDelts'], ['bodyweight', 'chair'], 'horizontal-pull', 'beginner', 'reps', {
    repMin: 6, repMax: 12, rest: 75,
    instructions: 'Lie under a sturdy table or low bar and grip it with straight arms. Pull your chest toward the bar, keeping your body in one line, then lower slowly.',
    tip: 'Bend your knees to reduce the load; straighten your legs to increase it.'
  }),
  ex('db-bent-row', 'Bent-over dumbbell row', ['lats'], ['upperBack', 'rearDelts', 'biceps'], ['dumbbells'], 'horizontal-pull', 'beginner', 'reps-weight', {
    repMin: 8, repMax: 12, rest: 90,
    instructions: 'Hinge forward with a flat back, dumbbells hanging below your shoulders. Pull them toward your ribs, squeeze, then lower slowly.',
    tip: 'Keep your neck long and avoid yanking with your lower back.'
  }),
  ex('db-single-row', 'Single-arm dumbbell row', ['lats'], ['upperBack', 'biceps', 'rearDelts'], ['dumbbells', 'bench'], 'horizontal-pull', 'beginner', 'reps-weight', {
    repMin: 8, repMax: 12, rest: 75,
    instructions: 'Support one hand on a bench and hinge forward. Row the dumbbell toward your hip, then lower until your arm is long again.',
    tip: 'Let your shoulder blade move naturally instead of locking it in place.'
  }),
  ex('band-row', 'Seated band row', ['upperBack'], ['lats', 'biceps', 'rearDelts'], ['bands'], 'horizontal-pull', 'beginner', 'reps', {
    repMin: 10, repMax: 18, rest: 60,
    instructions: 'Sit tall with a band around your feet. Pull the handles toward your waist while keeping your elbows close, then return slowly.',
    tip: 'Sit on a folded towel if the floor is hard.'
  }),
  ex('band-lat-pulldown', 'Band lat pulldown', ['lats'], ['biceps', 'upperBack'], ['bands'], 'vertical-pull', 'beginner', 'reps', {
    repMin: 10, repMax: 18, rest: 60,
    instructions: 'Anchor a band above head height and kneel or sit facing it. Pull the handles down toward your chest with elbows leading, then return slowly.',
    tip: 'Keep your torso upright rather than leaning back to move the band.'
  }),
  ex('straight-arm-pulldown', 'Band straight-arm pulldown', ['lats'], ['upperBack', 'triceps'], ['bands'], 'isolation', 'beginner', 'reps', {
    repMin: 12, repMax: 18, rest: 45,
    instructions: 'Anchor a band above head height and hold it with straight arms. Sweep your hands down toward your thighs, then return slowly.',
    tip: 'Keep a tiny bend in the elbows and move from the shoulders.'
  }),
  ex('superman', 'Superman hold', ['lowerBack'], ['glutes', 'upperBack'], ['bodyweight'], 'isolation', 'beginner', 'duration', {
    duration: 20, rest: 45,
    instructions: 'Lie face down with arms reaching forward. Lift your chest, arms, and legs just off the floor, keeping your neck long, and hold.',
    tip: 'Lift a little rather than cranking your neck back.'
  }),
  ex('bird-dog', 'Bird dog', ['lowerBack'], ['abs', 'obliques', 'glutes'], ['bodyweight'], 'core', 'beginner', 'reps', {
    repMin: 6, repMax: 10, rest: 45,
    instructions: 'From hands and knees, reach one arm forward and the opposite leg back while keeping your hips level. Return and switch sides.',
    tip: 'Imagine balancing a cup of tea on your lower back.'
  }),
  ex('db-good-morning', 'Dumbbell good morning', ['hamstrings'], ['lowerBack', 'glutes'], ['dumbbells'], 'hinge', 'intermediate', 'reps-weight', {
    repMin: 8, repMax: 12, rest: 90,
    instructions: 'Hold a light dumbbell at your chest or upper back. Push your hips back with a soft knee bend until you feel your hamstrings stretch, then stand tall.',
    tip: 'Use a light load and stop before your back rounds.'
  }),
  ex('barbell-deadlift', 'Barbell deadlift', ['hamstrings'], ['glutes', 'lowerBack', 'upperBack', 'forearms'], ['barbell'], 'hinge', 'advanced', 'reps-weight', {
    repMin: 5, repMax: 8, rest: 150,
    instructions: 'Stand with the bar over mid-foot, hinge to grip it, and brace. Push the floor away and stand tall with the bar close, then return it under control.',
    tip: 'Only use a load you can lift with a stable back; skill comes before weight.'
  }),

  // ---------------- biceps ----------------
  ex('db-curl', 'Dumbbell curl', ['biceps'], ['forearms'], ['dumbbells'], 'isolation', 'beginner', 'reps-weight', {
    repMin: 10, repMax: 15, rest: 60,
    instructions: 'Stand tall with dumbbells at your sides. Curl them toward your shoulders without swinging, then lower slowly.',
    tip: 'Keep your elbows near your ribs and let the biceps do the work.'
  }),
  ex('hammer-curl', 'Hammer curl', ['biceps'], ['forearms'], ['dumbbells'], 'isolation', 'beginner', 'reps-weight', {
    repMin: 10, repMax: 15, rest: 60,
    instructions: 'Hold dumbbells with palms facing each other and curl up while keeping that grip. Lower slowly.',
    tip: 'A friendly variation if straight-bar curls bother your wrists.'
  }),
  ex('concentration-curl', 'Concentration curl', ['biceps'], ['forearms'], ['dumbbells'], 'isolation', 'beginner', 'reps-weight', {
    repMin: 10, repMax: 15, rest: 60,
    instructions: 'Sit with one elbow braced against your inner thigh and curl a dumbbell toward your shoulder. Lower slowly and switch sides.',
    tip: 'Keep the shoulder relaxed away from your ear.'
  }),
  ex('band-curl', 'Band curl', ['biceps'], ['forearms'], ['bands'], 'isolation', 'beginner', 'reps', {
    repMin: 12, repMax: 20, rest: 45,
    instructions: 'Stand on the middle of a band and hold the handles at your sides. Curl toward your shoulders, then lower against the band tension.',
    tip: 'Step onto more band for extra resistance.'
  }),
  ex('towel-curl', 'Towel curl', ['biceps'], ['forearms'], ['towel'], 'isolation', 'beginner', 'reps', {
    repMin: 10, repMax: 15, rest: 60,
    instructions: 'Loop a towel under one foot and grip both ends. Curl upward while pressing down with your foot to create resistance, then lower slowly.',
    tip: 'Keep the towel taut throughout the rep.'
  }),

  // ---------------- triceps ----------------
  ex('db-overhead-triceps', 'Overhead dumbbell triceps extension', ['triceps'], [], ['dumbbells'], 'isolation', 'beginner', 'reps-weight', {
    repMin: 10, repMax: 15, rest: 60,
    instructions: 'Hold one dumbbell overhead with both hands. Bend your elbows to lower it behind your head, then extend back up without flaring your ribs.',
    tip: 'Keep your upper arms fairly still and close to your head.'
  }),
  ex('db-kickback', 'Dumbbell triceps kickback', ['triceps'], ['rearDelts'], ['dumbbells'], 'isolation', 'beginner', 'reps-weight', {
    repMin: 12, repMax: 18, rest: 45,
    instructions: 'Hinge forward with a light dumbbell, upper arm beside your torso. Extend your elbow until your arm is long, pause, then bend slowly.',
    tip: 'Use a small load; the end range is where this movement lives.'
  }),
  ex('close-grip-push-up', 'Close-grip push-up', ['triceps'], ['chest', 'frontDelts', 'abs'], ['bodyweight'], 'horizontal-push', 'intermediate', 'reps', {
    repMin: 6, repMax: 12,
    instructions: 'Place your hands under your shoulders with fingers spread. Lower your chest while keeping elbows close to your ribs, then press up.',
    tip: 'Keep your wrists comfortable; a slightly wider grip still trains triceps.'
  }),
  ex('chair-dip', 'Chair triceps dip', ['triceps'], ['chest', 'frontDelts'], ['chair'], 'horizontal-push', 'beginner', 'reps', {
    repMin: 6, repMax: 12, rest: 75,
    instructions: 'Sit on the edge of a sturdy chair with hands beside your hips. Slide forward and bend your elbows to lower, then press back up.',
    tip: 'Keep your hips close to the chair and stop if your shoulders pinch.'
  }),
  ex('band-pushdown', 'Band triceps pushdown', ['triceps'], [], ['bands'], 'isolation', 'beginner', 'reps', {
    repMin: 12, repMax: 20, rest: 45,
    instructions: 'Anchor a band above head height and grip it with both hands. Keeping elbows pinned at your sides, straighten your arms, then return slowly.',
    tip: 'Lean forward very slightly and keep your shoulders down.'
  }),
  ex('db-skull-crusher', 'Dumbbell skull crusher', ['triceps'], [], ['dumbbells', 'bench'], 'isolation', 'intermediate', 'reps-weight', {
    repMin: 8, repMax: 12, rest: 75,
    instructions: 'Lie on your back or a bench holding dumbbells above your chest. Bend your elbows to lower the weights beside your head, then extend back up.',
    tip: 'Keep the elbows pointing up rather than drifting toward your feet.'
  }),

  // ---------------- forearms / grip ----------------
  ex('wrist-curl', 'Wrist curl', ['forearms'], [], ['dumbbells'], 'isolation', 'beginner', 'reps-weight', {
    repMin: 12, repMax: 20, rest: 45,
    instructions: 'Sit with your forearm rested on your thigh and palm up. Curl the weight using only your wrist, then lower slowly.',
    tip: 'Small, controlled range works well here.'
  }),
  ex('reverse-wrist-curl', 'Reverse wrist curl', ['forearms'], [], ['dumbbells'], 'isolation', 'beginner', 'reps-weight', {
    repMin: 12, repMax: 20, rest: 45,
    instructions: 'Rest your forearm on your thigh with your palm facing down. Lift the weight by extending your wrist, then lower slowly.',
    tip: 'Use a lighter weight than regular wrist curls.'
  }),
  ex('farmers-carry', "Farmer's carry", ['forearms'], ['traps', 'abs', 'obliques'], ['dumbbells'], 'carry', 'beginner', 'weight-duration', {
    duration: 40, rest: 75,
    instructions: 'Hold a dumbbell in each hand at your sides, stand tall, and walk slowly with small controlled steps for the target time.',
    tip: 'Keep your shoulders stacked and your ribs down as you walk.'
  }),
  ex('dead-hang', 'Dead hang', ['forearms'], ['lats'], ['pullupBar'], 'isolation', 'intermediate', 'duration', {
    duration: 25, rest: 60,
    instructions: 'Hang from a pull-up bar with straight arms and relaxed shoulders. Keep breathing steadily for the target time, then step down carefully.',
    tip: 'Use a chair to get into position safely; quality grip time is the goal.'
  }),
  ex('towel-hang', 'Towel hang', ['forearms'], ['lats'], ['pullupBar', 'towel'], 'isolation', 'advanced', 'duration', {
    duration: 20, rest: 75,
    instructions: 'Drape a strong towel over a pull-up bar and grip both ends. Hang with straight arms for the target time, then step down carefully.',
    tip: 'Build up gradually; grip fatigue arrives quickly.'
  }),

  // ---------------- abs / core ----------------
  ex('plank', 'Plank', ['abs'], ['obliques', 'lowerBack', 'frontDelts'], ['bodyweight'], 'core', 'beginner', 'duration', {
    duration: 30, rest: 45,
    instructions: 'Rest on your forearms and toes with your body in one straight line. Brace gently and breathe for the target time.',
    tip: 'Kneeling planks are a great alternative while you build time.'
  }),
  ex('side-plank', 'Side plank', ['obliques'], ['abs', 'glutes'], ['bodyweight'], 'core', 'beginner', 'duration', {
    duration: 20, rest: 45,
    instructions: 'Lie on your side, prop yourself on one forearm, and lift your hips into a straight line. Hold, breathe, then switch sides.',
    tip: 'Bend your bottom knee if the full position is too demanding.'
  }),
  ex('dead-bug', 'Dead bug', ['abs'], ['obliques', 'lowerBack'], ['bodyweight'], 'core', 'beginner', 'reps', {
    repMin: 8, repMax: 12, rest: 45,
    instructions: 'Lie on your back with arms up and knees over hips. Slowly lower one arm and the opposite leg while keeping your lower back gently pressed down, then return and switch.',
    tip: 'Move slowly; keeping the ribs down matters more than reaching far.'
  }),
  ex('leg-raise', 'Lying leg raise', ['abs'], ['obliques', 'lowerBack'], ['bodyweight'], 'core', 'intermediate', 'reps', {
    repMin: 8, repMax: 15, rest: 45,
    instructions: 'Lie on your back with legs straight. Lift them toward the ceiling, then lower slowly without letting your lower back arch away from the floor.',
    tip: 'Bend your knees to reduce the challenge if needed.'
  }),
  ex('crunch', 'Crunch', ['abs'], ['obliques'], ['bodyweight'], 'core', 'beginner', 'reps', {
    repMin: 10, repMax: 20, rest: 30,
    instructions: 'Lie on your back with knees bent and hands lightly supporting your head. Curl your ribs toward your hips, then lower slowly.',
    tip: 'Keep your chin relaxed and avoid pulling on your neck.'
  }),
  ex('bicycle-crunch', 'Bicycle crunch', ['obliques'], ['abs'], ['bodyweight'], 'core', 'intermediate', 'reps', {
    repMin: 12, repMax: 20, rest: 45,
    instructions: 'Lie on your back and lift your shoulders. Bring one elbow toward the opposite knee while extending the other leg, then alternate at a steady pace.',
    tip: 'Slow, controlled rotations beat fast pedalling.'
  }),
  ex('mountain-climber', 'Mountain climber', ['abs'], ['obliques', 'frontDelts'], ['bodyweight'], 'core', 'intermediate', 'reps', {
    repMin: 12, repMax: 24, rest: 45,
    instructions: 'From a high plank, drive one knee toward your chest, then switch legs at a steady pace while keeping your hips level.',
    tip: 'Slow it down if your hips start bouncing.'
  }),
  ex('hollow-hold', 'Hollow hold', ['abs'], ['obliques'], ['bodyweight'], 'core', 'intermediate', 'duration', {
    duration: 20, rest: 45,
    instructions: 'Lie on your back, press your lower back into the floor, lift your shoulders and straight legs slightly off the floor, and hold.',
    tip: 'Bend your knees or keep shoulders down if your back lifts.'
  }),
  ex('russian-twist', 'Russian twist', ['obliques'], ['abs'], ['bodyweight'], 'core', 'beginner', 'reps', {
    repMin: 10, repMax: 20, rest: 45,
    instructions: 'Sit with knees bent, lean back slightly, and rotate your ribcage from side to side. Keep your chest lifted and move with control.',
    tip: 'Holding a light dumbbell adds resistance once the movement feels smooth.'
  }),

  // ---------------- glutes ----------------
  ex('glute-bridge', 'Glute bridge', ['glutes'], ['hamstrings', 'lowerBack'], ['bodyweight'], 'hinge', 'beginner', 'reps', {
    repMin: 10, repMax: 20, rest: 45,
    instructions: 'Lie on your back with feet planted. Squeeze your glutes to lift your hips until your body forms a line from knees to shoulders, then lower slowly.',
    tip: 'Push through your heels and avoid arching your lower back at the top.'
  }),
  ex('hip-thrust', 'Dumbbell hip thrust', ['glutes'], ['hamstrings'], ['dumbbells'], 'hinge', 'beginner', 'reps-weight', {
    repMin: 8, repMax: 15, rest: 75,
    instructions: 'Sit on the floor with your upper back against a couch or bench and a dumbbell across your hips. Drive your hips up and squeeze, then lower slowly.',
    tip: 'Tuck your chin slightly and keep the load steady on your hips.'
  }),
  ex('single-leg-glute-bridge', 'Single-leg glute bridge', ['glutes'], ['hamstrings', 'abs'], ['bodyweight'], 'hinge', 'intermediate', 'reps', {
    repMin: 8, repMax: 12, rest: 45,
    instructions: 'Lie on your back with one foot planted and the other leg lifted. Press through the planted heel to lift your hips, then lower slowly and switch.',
    tip: 'Keep your hips level rather than letting one side drop.'
  }),
  ex('bulgarian-split-squat', 'Bulgarian split squat', ['quads'], ['glutes', 'hamstrings', 'adductors'], ['bodyweight', 'chair', 'dumbbells'], 'lunge', 'intermediate', 'reps', {
    repMin: 8, repMax: 12, rest: 90,
    instructions: 'Stand a step in front of a chair and place the top of one foot behind you on it. Lower straight down, then press through the front foot to stand.',
    tip: 'Hold a wall or chair for balance while you learn the position.'
  }),
  ex('step-up', 'Step-up', ['quads'], ['glutes', 'hamstrings'], ['chair'], 'lunge', 'beginner', 'reps', {
    repMin: 8, repMax: 12, rest: 60,
    instructions: 'Place one whole foot on a sturdy step. Press through that foot to stand tall, then lower slowly with control and switch sides.',
    tip: 'Use a lower step if your knee drifts inward.'
  }),
  ex('band-lateral-walk', 'Band lateral walk', ['abductors'], ['glutes'], ['bands'], 'isolation', 'beginner', 'reps', {
    repMin: 10, repMax: 20, rest: 45,
    instructions: 'Place a band just above your knees or around your ankles. Stay in a slight squat and take small steps sideways, keeping tension in the band.',
    tip: 'Keep your toes pointing forward and your knees tracking over them.'
  }),
  ex('donkey-kick', 'Donkey kick', ['glutes'], ['hamstrings', 'lowerBack'], ['bodyweight'], 'isolation', 'beginner', 'reps', {
    repMin: 12, repMax: 15, rest: 30,
    instructions: 'From hands and knees, keep one knee bent and press that foot up toward the ceiling. Squeeze the glute, lower slowly, and switch sides.',
    tip: 'Keep your hips square instead of rotating to lift higher.'
  }),
  ex('side-lying-leg-raise', 'Side-lying leg raise', ['abductors'], ['glutes', 'obliques'], ['bodyweight'], 'isolation', 'beginner', 'reps', {
    repMin: 12, repMax: 20, rest: 30,
    instructions: 'Lie on your side with legs stacked. Lift the top leg slowly, keeping it slightly behind your hip line, then lower with control and switch sides.',
    tip: 'Keep your waist long; avoid rolling backward.'
  }),
  ex('clamshell', 'Clamshell', ['abductors'], ['glutes'], ['bands'], 'isolation', 'beginner', 'reps', {
    repMin: 12, repMax: 20, rest: 30,
    instructions: 'Lie on your side with knees bent and feet together. Open the top knee against a light band while keeping hips stacked, then lower slowly.',
    tip: 'Use a small range and keep your pelvis still.'
  }),

  // ---------------- quads / adductors ----------------
  ex('bodyweight-squat', 'Bodyweight squat', ['quads'], ['glutes', 'hamstrings', 'abs'], ['bodyweight'], 'squat', 'beginner', 'reps', {
    repMin: 10, repMax: 20, rest: 60,
    instructions: 'Stand with feet about shoulder width. Sit your hips down and back, keeping your chest tall, then drive through your feet to stand.',
    tip: 'Hold a doorframe or chair back for balance if you need it.'
  }),
  ex('goblet-squat', 'Goblet squat', ['quads'], ['glutes', 'hamstrings', 'abs'], ['dumbbells'], 'squat', 'beginner', 'reps-weight', {
    repMin: 8, repMax: 15, rest: 90,
    instructions: 'Hold a dumbbell at your chest. Squat down between your hips with your chest lifted, then press through your whole foot to stand.',
    tip: 'Let your knees travel in the direction your toes point.'
  }),
  ex('split-squat', 'Split squat', ['quads'], ['glutes', 'hamstrings', 'adductors'], ['bodyweight'], 'lunge', 'beginner', 'reps', {
    repMin: 8, repMax: 12, rest: 60,
    instructions: 'Take a long stance with one foot forward. Lower straight down until both knees bend, then press through the front foot to stand and switch sides.',
    tip: 'Hold a chair for balance and keep the front heel planted.'
  }),
  ex('reverse-lunge', 'Reverse lunge', ['quads'], ['glutes', 'hamstrings', 'adductors'], ['bodyweight'], 'lunge', 'beginner', 'reps', {
    repMin: 8, repMax: 12, rest: 60,
    instructions: 'Step one foot back and lower until both knees bend. Push through the front foot to return to standing, then alternate sides.',
    tip: 'The back foot is for balance, not for pushing you up.'
  }),
  ex('walking-lunge', 'Walking lunge', ['quads'], ['glutes', 'hamstrings', 'adductors'], ['bodyweight'], 'lunge', 'intermediate', 'reps', {
    repMin: 8, repMax: 14, rest: 75,
    instructions: 'Step forward into a lunge, then push up and bring the back foot forward into the next lunge. Keep your torso tall and steps controlled.',
    tip: 'Use a wall or open space and shorten the range if balance is tricky.'
  }),
  ex('wall-sit', 'Wall sit', ['quads'], ['glutes', 'abs'], ['bodyweight'], 'squat', 'beginner', 'duration', {
    duration: 30, rest: 60,
    instructions: 'Slide down a wall until your hips and knees are bent, with your back supported and knees over ankles. Hold and breathe.',
    tip: 'Come up sooner rather than letting your knees cave inward.'
  }),
  ex('step-down', 'Step-down', ['quads'], ['glutes', 'hamstrings'], ['chair'], 'lunge', 'intermediate', 'reps', {
    repMin: 8, repMax: 12, rest: 60,
    instructions: 'Stand on a sturdy step. Slowly lower one foot toward the floor by bending the standing leg, then press back up without pushing off the free foot.',
    tip: 'Use a handrail and a low step while learning the control.'
  }),
  ex('cossack-squat', 'Cossack squat', ['adductors'], ['quads', 'glutes', 'hamstrings'], ['bodyweight'], 'squat', 'intermediate', 'reps', {
    repMin: 6, repMax: 10, rest: 60,
    instructions: 'Take a wide stance. Shift your weight to one side, bend that knee, and let the other leg straighten with the foot flexed. Push back to center and alternate.',
    tip: 'Stay within a comfortable range; the inner thigh should stretch, not pinch.'
  }),
  ex('copenhagen-plank', 'Copenhagen plank', ['adductors'], ['obliques', 'abs'], ['bodyweight', 'chair'], 'core', 'advanced', 'duration', {
    duration: 15, rest: 60,
    instructions: 'Lie on your side with the top leg resting on a sturdy chair. Lift your hips into a side plank supported by that inner thigh, and hold.',
    tip: 'Start with the bottom knee down and keep the effort gentle.'
  }),
  ex('side-lying-adduction', 'Side-lying adduction', ['adductors'], [], ['bodyweight'], 'isolation', 'beginner', 'reps', {
    repMin: 12, repMax: 20, rest: 30,
    instructions: 'Lie on your side with the bottom leg straight and top leg bent in front. Lift the bottom leg toward the top one, then lower slowly.',
    tip: 'Keep the movement small and controlled.'
  }),
  ex('sumo-squat', 'Sumo squat', ['adductors'], ['glutes', 'quads', 'hamstrings'], ['bodyweight'], 'squat', 'beginner', 'reps', {
    repMin: 10, repMax: 18, rest: 60,
    instructions: 'Stand with a wide stance and toes turned out. Squat down between your hips, keeping knees in line with toes, then stand.',
    tip: 'Hold a dumbbell at your chest to progress.'
  }),

  // ---------------- hamstrings / calves ----------------
  ex('db-rdl', 'Dumbbell Romanian deadlift', ['hamstrings'], ['glutes', 'lowerBack'], ['dumbbells'], 'hinge', 'beginner', 'reps-weight', {
    repMin: 8, repMax: 12, rest: 90,
    instructions: 'Stand holding dumbbells in front of your thighs. Push your hips back with a soft knee bend, lowering the weights along your legs until you feel a hamstring stretch, then stand tall.',
    tip: 'Keep the weights close and stop before your back rounds.'
  }),
  ex('single-leg-rdl', 'Single-leg Romanian deadlift', ['hamstrings'], ['glutes', 'lowerBack', 'abductors'], ['bodyweight', 'dumbbells'], 'hinge', 'intermediate', 'reps', {
    repMin: 6, repMax: 10, rest: 75,
    instructions: 'Balance on one leg and hinge forward as the other leg reaches back. Keep your hips square, then return to standing and switch sides.',
    tip: 'Keep a chair nearby for balance while you build confidence.'
  }),
  ex('hamstring-bridge', 'Hamstring bridge', ['hamstrings'], ['glutes', 'lowerBack'], ['bodyweight'], 'hinge', 'beginner', 'reps', {
    repMin: 10, repMax: 15, rest: 45,
    instructions: 'Lie on your back with heels close to your hips. Press through your heels to lift your hips, then slowly lower with control.',
    tip: 'Try walking your feet slightly farther away to feel more hamstring.'
  }),
  ex('nordic-curl', 'Nordic hamstring curl', ['hamstrings'], ['glutes', 'abs'], ['bodyweight'], 'isolation', 'advanced', 'reps', {
    repMin: 3, repMax: 6, rest: 90,
    instructions: 'Kneel with your ankles anchored under a sturdy support. Keep a straight line from knees to head and lower your torso as slowly as you can, then push back up with your hands.',
    tip: 'Use your hands to assist and keep the reps low and controlled.'
  }),
  ex('glute-ham-raise', 'Glute-ham raise', ['hamstrings'], ['glutes', 'lowerBack'], ['bodyweight'], 'isolation', 'advanced', 'reps', {
    repMin: 3, repMax: 6, rest: 90,
    instructions: 'Kneel with your lower legs anchored. Keep hips extended and lower your torso forward with control, then pull back up using your hamstrings.',
    tip: 'Only attempt this with a secure anchor and a spotter or pads nearby.'
  }),
  ex('standing-calf-raise', 'Standing calf raise', ['calves'], [], ['bodyweight'], 'isolation', 'beginner', 'reps', {
    repMin: 12, repMax: 20, rest: 45,
    instructions: 'Stand tall and rise onto the balls of your feet, pause at the top, then lower slowly. Use a wall for balance.',
    tip: 'Stand on the edge of a step for a deeper stretch once comfortable.'
  }),
  ex('single-leg-calf-raise', 'Single-leg calf raise', ['calves'], [], ['bodyweight'], 'isolation', 'beginner', 'reps', {
    repMin: 10, repMax: 15, rest: 45,
    instructions: 'Balance on one foot and rise onto the ball of that foot, then lower slowly. Switch sides after the set.',
    tip: 'Hold a wall with one hand and keep the movement slow.'
  }),
  ex('seated-calf-raise', 'Weighted seated calf raise', ['calves'], [], ['dumbbells', 'chair'], 'isolation', 'beginner', 'reps-weight', {
    repMin: 12, repMax: 20, rest: 45,
    instructions: 'Sit with your feet flat, place a dumbbell across your thighs, and press through the balls of your feet to lift your heels. Lower slowly.',
    tip: 'Keep the weight steady and move through a comfortable range.'
  }),

  // ---------------- full body ----------------
  ex('db-thruster', 'Dumbbell thruster', ['quads'], ['frontDelts', 'glutes', 'triceps', 'abs'], ['dumbbells'], 'squat', 'intermediate', 'reps-weight', {
    repMin: 8, repMax: 12, rest: 90,
    instructions: 'Hold dumbbells at your shoulders, squat down, then drive up and press the weights overhead in one flowing movement. Lower with control.',
    tip: 'Use a load that lets you keep your ribs stacked at the top.'
  }),
  ex('renegade-row', 'Renegade row', ['lats'], ['abs', 'obliques', 'triceps', 'upperBack'], ['dumbbells'], 'horizontal-pull', 'advanced', 'reps-weight', {
    repMin: 6, repMax: 10, rest: 90,
    instructions: 'Start in a plank with hands on dumbbells. Row one weight toward your ribs while keeping your hips level, lower it, then alternate.',
    tip: 'Widen your feet for stability and use lighter weights first.'
  }),
  ex('turkish-get-up', 'Turkish get-up', ['frontDelts'], ['abs', 'obliques', 'glutes', 'quads', 'triceps'], ['dumbbells'], 'vertical-push', 'advanced', 'reps-weight', {
    repMin: 3, repMax: 5, rest: 120,
    instructions: 'Lie on your back holding a light dumbbell overhead. Move through sitting, kneeling, and standing while keeping the weight stacked, then reverse the sequence.',
    tip: 'Learn the sequence with a shoe balanced on your fist before adding weight.'
  }),
  ex('kettlebell-swing', 'Kettlebell swing', ['glutes'], ['hamstrings', 'lowerBack', 'abs'], ['kettlebell'], 'hinge', 'intermediate', 'reps-weight', {
    repMin: 10, repMax: 15, rest: 75,
    instructions: 'Hinge at the hips with a kettlebell hanging between your legs, then snap your hips forward to swing it to chest height. Let it return and repeat.',
    tip: 'The swing is a hip movement, not an arm lift.'
  }),
  ex('db-clean-press', 'Dumbbell clean and press', ['frontDelts'], ['glutes', 'hamstrings', 'triceps', 'traps'], ['dumbbells'], 'vertical-push', 'intermediate', 'reps-weight', {
    repMin: 6, repMax: 10, rest: 90,
    instructions: 'Hinge to pick up a dumbbell, clean it to your shoulder, then press overhead. Lower safely to your shoulder and hinge it back down.',
    tip: 'Keep the weight close to your body throughout the clean.'
  })
];

export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

const r = (exerciseId, sets, repMin, repMax, rest, extra = {}) => ({ exerciseId, sets, repMin, repMax, rest, ...extra });

export const ROUTINE_SEEDS = [
  {
    id: 'routine-push', name: 'Push day', seed: true,
    notes: 'Chest, shoulders, triceps. Leave a rep or two in reserve on the last set.',
    exercises: [
      r('db-bench-press', 3, 8, 12, 120),
      r('db-overhead-press', 3, 8, 12, 90),
      r('db-fly', 2, 10, 15, 75),
      r('db-lateral-raise', 3, 10, 15, 60),
      r('band-pushdown', 3, 12, 20, 45),
      r('plank', 2, null, null, 45, { duration: 30 })
    ]
  },
  {
    id: 'routine-pull', name: 'Pull day', seed: true,
    notes: 'Back and biceps with a little rear-delt care.',
    exercises: [
      r('pull-up', 3, 3, 8, 120),
      r('db-bent-row', 3, 8, 12, 90),
      r('band-face-pull', 2, 12, 20, 45),
      r('db-curl', 3, 10, 15, 60),
      r('hammer-curl', 2, 10, 15, 60),
      r('dead-hang', 2, null, null, 60, { duration: 25 })
    ]
  },
  {
    id: 'routine-legs', name: 'Leg day', seed: true,
    notes: 'Quads, hamstrings and glutes, finished with a gentle core set.',
    exercises: [
      r('goblet-squat', 3, 8, 12, 90),
      r('db-rdl', 3, 8, 12, 90),
      r('bulgarian-split-squat', 2, 8, 12, 90),
      r('glute-bridge', 3, 10, 20, 45),
      r('standing-calf-raise', 3, 12, 20, 45),
      r('dead-bug', 2, 8, 12, 45)
    ]
  },
  {
    id: 'routine-upper', name: 'Upper body', seed: true,
    notes: 'A balanced upper session for home equipment.',
    exercises: [
      r('push-up', 3, 6, 15, 75),
      r('db-bent-row', 3, 8, 12, 90),
      r('db-overhead-press', 3, 8, 12, 90),
      r('db-curl', 2, 10, 15, 60),
      r('band-pushdown', 2, 12, 20, 45),
      r('band-face-pull', 2, 12, 20, 45)
    ]
  },
  {
    id: 'routine-lower', name: 'Lower body', seed: true,
    notes: 'Strength and control from the hips down.',
    exercises: [
      r('bodyweight-squat', 3, 10, 20, 60),
      r('db-rdl', 3, 8, 12, 90),
      r('hip-thrust', 3, 8, 15, 75),
      r('walking-lunge', 2, 8, 14, 75),
      r('standing-calf-raise', 3, 12, 20, 45),
      r('side-plank', 2, null, null, 45, { duration: 20 })
    ]
  },
  {
    id: 'routine-full', name: 'Full body', seed: true,
    notes: 'Everything once, gently. A good default when time is short.',
    exercises: [
      r('goblet-squat', 3, 8, 12, 90),
      r('push-up', 3, 6, 15, 75),
      r('db-bent-row', 3, 8, 12, 90),
      r('db-overhead-press', 2, 8, 12, 90),
      r('db-rdl', 2, 8, 12, 90),
      r('plank', 2, null, null, 45, { duration: 30 })
    ]
  },
  {
    id: 'routine-dumbbell', name: 'Dumbbell only', seed: true,
    notes: 'No bands, no bar. Just a pair of dumbbells and a little floor space.',
    exercises: [
      r('db-floor-press', 3, 8, 12, 90),
      r('db-bent-row', 3, 8, 12, 90),
      r('goblet-squat', 3, 8, 12, 90),
      r('db-rdl', 3, 8, 12, 90),
      r('db-curl', 2, 10, 15, 60),
      r('db-overhead-triceps', 2, 10, 15, 60)
    ]
  },
  {
    id: 'routine-bodyweight', name: 'Bodyweight only', seed: true,
    notes: 'Travel-friendly strength with nothing but your bodyweight.',
    exercises: [
      r('push-up', 3, 6, 15, 75),
      r('bodyweight-squat', 3, 10, 20, 60),
      r('inverted-row', 3, 6, 12, 75),
      r('glute-bridge', 3, 10, 20, 45),
      r('walking-lunge', 2, 8, 14, 75),
      r('plank', 2, null, null, 45, { duration: 30 })
    ]
  }
];
