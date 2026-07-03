// ─────────────────────────────────────────────────────────────────
// QUICKCRIC — Curated player pool (top ~200 IPL/WPL-caliber cricketers)
//
// This is a hand-curated static seed dataset, NOT a live sync of official
// franchise rosters. Squads change every auction — treat this as "good
// enough to build and demo the full team-selection flow", and swap in
// sim-engine's CricAPI sync (see sim-engine/cricapi_sync.py) for
// production-accurate rosters.
// ─────────────────────────────────────────────────────────────────
import { Player, PlayerRole, BatStyle, BowlType } from '@/types'

type Gender = 'M' | 'W'

// [id, name, country, country_code, flag, role, gender, batAvg, batSr, bowlAvg?, bowlEcon?, bowlType?]
type Row = [string, string, string, string, string, PlayerRole, Gender, number, number, number?, number?, BowlType?]

// Deterministic pseudo-random in [0,1) seeded by string — keeps secondary
// attributes stable across reloads without hand-authoring 200 stat blocks.
function seedRand(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

function mk(row: Row): Player {
  const [id, name, country, country_code, flag_emoji, role, gender, bat_avg, bat_sr, bowl_avg, bowl_economy, bowl_type] = row
  const rnd = seedRand(id)
  const bat_style: BatStyle = bat_sr >= 145 ? 'aggressive' : bat_sr <= 122 ? 'defensive' : 'balanced'
  const jitter = (base: number, spread: number) => Math.round((base + (rnd() - 0.5) * spread) * 100) / 100

  return {
    id, name, country, country_code, flag_emoji,
    formats: ['T20', 'ODI'],
    role,
    bat_avg, bat_sr,
    bat_style,
    bat_preferred_shots: [],
    bat_weakness: [],
    bat_vs_spin: jitter(1.0, 0.3),
    bat_vs_pace: jitter(1.0, 0.3),
    bowl_avg, bowl_economy, bowl_type,
    bowl_variations: [],
    stamina:            Math.round(75 + rnd() * 22),
    form:               Math.round(72 + rnd() * 26),
    pressure_handling:  Math.round(75 + rnd() * 22),
    fitness:            Math.round(78 + rnd() * 20),
    home_flat:   jitter(1.0, 0.2),
    home_spin:   jitter(1.0, 0.2),
    home_seam:   jitter(1.0, 0.2),
    home_bouncy: jitter(1.0, 0.2),
    jersey_number: Math.floor(rnd() * 89) + 1,
    skill_description: gender === 'W' ? `${role} · Women's cricket` : role,
  }
}

// ── MEN — IPL-associated pool ──────────────────────────────────────
const MI: Row[] = [
  ['mi1','Rohit Sharma','India','IND','🇮🇳','Batter','M',31.3,139.9],
  ['mi2','Suryakumar Yadav','India','IND','🇮🇳','Batter','M',42.6,167.7],
  ['mi3','Ishan Kishan','India','IND','🇮🇳','WK-Batter','M',30.2,135.4],
  ['mi4','Tilak Varma','India','IND','🇮🇳','Batter','M',38.1,148.2],
  ['mi5','Hardik Pandya','India','IND','🇮🇳','All-rounder','M',26.4,140.5,25.8,8.1,'Medium'],
  ['mi6','Tim David','Australia','AUS','🇦🇺','Batter','M',36.0,163.5],
  ['mi7','Naman Dhir','India','IND','🇮🇳','All-rounder','M',24.0,150.0,32.0,9.0,'Medium'],
  ['mi8','Jasprit Bumrah','India','IND','🇮🇳','Bowler','M',7.2,78,20.7,6.2,'Fast'],
  ['mi9','Trent Boult','New Zealand','NZ','🇳🇿','Bowler','M',10.5,95,24.1,7.9,'Fast'],
  ['mi10','Piyush Chawla','India','IND','🇮🇳','Bowler','M',13.0,110,27.5,7.4,'Spin'],
  ['mi11','Dewald Brevis','South Africa','SA','🇿🇦','Batter','M',28.5,145.0],
  ['mi12','Mohammad Nabi','Afghanistan','AFG','🇦🇫','All-rounder','M',22.0,128.0,26.0,7.2,'Spin'],
  ['mi13','Nehal Wadhera','India','IND','🇮🇳','Batter','M',27.0,138.0],
]
const CSK: Row[] = [
  ['cs1','MS Dhoni','India','IND','🇮🇳','WK-Batter','M',38.1,135.9],
  ['cs2','Ruturaj Gaikwad','India','IND','🇮🇳','Batter','M',44.5,138.2],
  ['cs3','Devon Conway','New Zealand','NZ','🇳🇿','WK-Batter','M',40.2,133.5],
  ['cs4','Shivam Dube','India','IND','🇮🇳','All-rounder','M',30.5,152.0,34.0,8.6,'Medium'],
  ['cs5','Ravindra Jadeja','India','IND','🇮🇳','All-rounder','M',21.4,127.1,29.8,7.1,'Spin'],
  ['cs6','Deepak Chahar','India','IND','🇮🇳','Bowler','M',15.0,120.0,24.5,7.6,'Fast'],
  ['cs7','Matheesha Pathirana','Sri Lanka','SL','🇱🇰','Bowler','M',5.0,80.0,20.1,7.5,'Fast'],
  ['cs8','Moeen Ali','England','ENG','🏴','All-rounder','M',26.0,140.0,29.0,8.0,'Spin'],
  ['cs9','Ajinkya Rahane','India','IND','🇮🇳','Batter','M',29.0,128.0],
  ['cs10','Rachin Ravindra','New Zealand','NZ','🇳🇿','All-rounder','M',31.0,142.0,33.0,8.2,'Spin'],
  ['cs11','Maheesh Theekshana','Sri Lanka','SL','🇱🇰','Bowler','M',8.0,85.0,23.4,6.9,'Spin'],
  ['cs12','Sameer Rizvi','India','IND','🇮🇳','Batter','M',24.0,146.0],
  ['cs13','Shaik Rasheed','India','IND','🇮🇳','Batter','M',26.0,132.0],
]
const RCB: Row[] = [
  ['rc1','Virat Kohli','India','IND','🇮🇳','Batter','M',57.2,138.0],
  ['rc2','Rajat Patidar','India','IND','🇮🇳','Batter','M',33.0,150.0],
  ['rc3','Cameron Green','Australia','AUS','🇦🇺','All-rounder','M',31.0,144.0,30.0,8.4,'Fast'],
  ['rc4','Glenn Maxwell','Australia','AUS','🇦🇺','All-rounder','M',30.0,155.5,27.7,7.7,'Spin'],
  ['rc5','Yash Dayal','India','IND','🇮🇳','Bowler','M',6.0,75.0,26.0,8.8,'Fast'],
  ['rc6','Josh Hazlewood','Australia','AUS','🇦🇺','Bowler','M',6.0,75.0,21.1,7.6,'Fast'],
  ['rc7','Swapnil Singh','India','IND','🇮🇳','All-rounder','M',18.0,120.0,28.0,7.3,'Spin'],
  ['rc8','Dinesh Karthik','India','IND','🇮🇳','WK-Batter','M',26.0,145.0],
  ['rc9','Mahipal Lomror','India','IND','🇮🇳','All-rounder','M',24.0,138.0,32.0,8.5,'Medium'],
  ['rc10','Karn Sharma','India','IND','🇮🇳','Bowler','M',10.0,105.0,28.0,7.5,'Spin'],
  ['rc11','Vijaykumar Vyshak','India','IND','🇮🇳','Bowler','M',7.0,90.0,25.0,8.6,'Fast'],
  ['rc12','Suyash Prabhudessai','India','IND','🇮🇳','Batter','M',25.0,140.0],
  ['rc13','Anuj Rawat','India','IND','🇮🇳','WK-Batter','M',22.0,130.0],
]
const KKR: Row[] = [
  ['kk1','Shreyas Iyer','India','IND','🇮🇳','Batter','M',34.5,133.0],
  ['kk2','Sunil Narine','West Indies','WI','🌴','All-rounder','M',18.0,168.0,25.0,6.6,'Spin'],
  ['kk3','Andre Russell','West Indies','WI','🌴','All-rounder','M',29.0,178.0,25.5,9.3,'Fast'],
  ['kk4','Rinku Singh','India','IND','🇮🇳','Batter','M',35.0,148.0],
  ['kk5','Varun Chakravarthy','India','IND','🇮🇳','Bowler','M',5.0,70.0,22.0,7.0,'Spin'],
  ['kk6','Venkatesh Iyer','India','IND','🇮🇳','All-rounder','M',28.0,136.0,31.0,8.1,'Medium'],
  ['kk7','Rahmanullah Gurbaz','Afghanistan','AFG','🇦🇫','WK-Batter','M',27.0,140.0],
  ['kk8','Harshit Rana','India','IND','🇮🇳','Bowler','M',9.0,95.0,26.5,8.9,'Fast'],
  ['kk9','Mitchell Starc','Australia','AUS','🇦🇺','Bowler','M',12.2,115.0,23.6,7.7,'Fast'],
  ['kk10','Ramandeep Singh','India','IND','🇮🇳','All-rounder','M',22.0,145.0,33.0,9.0,'Medium'],
  ['kk11','Manish Pandey','India','IND','🇮🇳','Batter','M',29.0,124.0],
  ['kk12','Anukul Roy','India','IND','🇮🇳','All-rounder','M',15.0,110.0,29.0,7.4,'Spin'],
  ['kk13','Vaibhav Arora','India','IND','🇮🇳','Bowler','M',8.0,90.0,27.0,8.7,'Fast'],
]
const SRH: Row[] = [
  ['sh1','Pat Cummins','Australia','AUS','🇦🇺','Bowler','M',14.5,128.0,24.5,7.4,'Fast'],
  ['sh2','Abhishek Sharma','India','IND','🇮🇳','All-rounder','M',30.0,165.0,32.0,8.9,'Spin'],
  ['sh3','Travis Head','Australia','AUS','🇦🇺','Batter','M',32.1,158.4],
  ['sh4','Heinrich Klaasen','South Africa','SA','🇿🇦','WK-Batter','M',36.0,172.0],
  ['sh5','Nitish Kumar Reddy','India','IND','🇮🇳','All-rounder','M',27.0,140.0,30.0,8.3,'Medium'],
  ['sh6','T Natarajan','India','IND','🇮🇳','Bowler','M',7.0,80.0,25.0,8.1,'Fast'],
  ['sh7','Bhuvneshwar Kumar','India','IND','🇮🇳','Bowler','M',12.0,105.0,24.9,7.5,'Fast'],
  ['sh8','Rahul Tripathi','India','IND','🇮🇳','Batter','M',28.0,144.0],
  ['sh9','Washington Sundar','India','IND','🇮🇳','All-rounder','M',22.0,125.0,28.0,7.0,'Spin'],
  ['sh10','Mayank Markande','India','IND','🇮🇳','Bowler','M',6.0,80.0,27.0,7.8,'Spin'],
  ['sh11','Abdul Samad','India','IND','🇮🇳','Batter','M',24.0,150.0],
  ['sh12','Shahbaz Ahmed','India','IND','🇮🇳','All-rounder','M',20.0,132.0,30.0,7.6,'Spin'],
  ['sh13','Adam Zampa','Australia','AUS','🇦🇺','Bowler','M',7.5,85.0,20.5,7.1,'Spin'],
]
const DC: Row[] = [
  ['dc1','Axar Patel','India','IND','🇮🇳','All-rounder','M',19.5,140.2,23.6,7.3,'Spin'],
  ['dc2','Rishabh Pant','India','IND','🇮🇳','WK-Batter','M',23.2,127.5],
  ['dc3','Tristan Stubbs','South Africa','SA','🇿🇦','Batter','M',31.0,155.0],
  ['dc4','Kuldeep Yadav','India','IND','🇮🇳','Bowler','M',10.0,80.0,14.0,6.7,'Spin'],
  ['dc5','Mitchell Marsh','Australia','AUS','🇦🇺','All-rounder','M',33.4,135.3,22.7,7.7,'Medium'],
  ['dc6','Anrich Nortje','South Africa','SA','🇿🇦','Bowler','M',5.0,75.0,22.0,8.0,'Fast'],
  ['dc7','Khaleel Ahmed','India','IND','🇮🇳','Bowler','M',6.0,80.0,26.0,8.3,'Fast'],
  ['dc8','Sameer Rizvi','India','IND','🇮🇳','Batter','M',23.0,144.0],
  ['dc9','Abishek Porel','India','IND','🇮🇳','WK-Batter','M',26.0,138.0],
  ['dc10','Ishant Sharma','India','IND','🇮🇳','Bowler','M',6.0,70.0,30.0,7.9,'Fast'],
  ['dc11','Vipraj Nigam','India','IND','🇮🇳','Bowler','M',10.0,100.0,27.0,7.6,'Spin'],
  ['dc12','Karun Nair','India','IND','🇮🇳','Batter','M',27.0,130.0],
  ['dc13','Mukesh Kumar','India','IND','🇮🇳','Bowler','M',6.0,72.0,28.0,8.4,'Fast'],
]
const PBKS: Row[] = [
  ['pb1','Shashank Singh','India','IND','🇮🇳','All-rounder','M',30.0,150.0,33.0,8.9,'Medium'],
  ['pb2','Sam Curran','England','ENG','🏴','All-rounder','M',24.0,135.0,28.0,8.6,'Medium'],
  ['pb3','Arshdeep Singh','India','IND','🇮🇳','Bowler','M',5.0,70.0,18.5,8.3,'Fast'],
  ['pb4','Liam Livingstone','England','ENG','🏴','All-rounder','M',27.0,152.0,31.0,8.8,'Spin'],
  ['pb5','Rahul Chahar','India','IND','🇮🇳','Bowler','M',7.0,85.0,26.0,7.4,'Spin'],
  ['pb6','Jitesh Sharma','India','IND','🇮🇳','WK-Batter','M',29.0,148.0],
  ['pb7','Harpreet Brar','India','IND','🇮🇳','All-rounder','M',14.0,110.0,29.0,7.2,'Spin'],
  ['pb8','Kagiso Rabada','South Africa','SA','🇿🇦','Bowler','M',10.0,95.0,20.4,8.0,'Fast'],
  ['pb9','Prabhsimran Singh','India','IND','🇮🇳','WK-Batter','M',28.0,142.0],
  ['pb10','Sikandar Raza','Zimbabwe','ZIM','🇿🇼','All-rounder','M',26.0,138.0,30.0,7.9,'Spin'],
  ['pb11','Nathan Ellis','Australia','AUS','🇦🇺','Bowler','M',6.0,80.0,24.0,8.2,'Fast'],
  ['pb12','Vijaykumar Vyshak','India','IND','🇮🇳','Bowler','M',7.0,88.0,25.5,8.5,'Fast'],
  ['pb13','Priyansh Arya','India','IND','🇮🇳','Batter','M',25.0,150.0],
]
const RR: Row[] = [
  ['rr1','Sanju Samson','India','IND','🇮🇳','WK-Batter','M',30.0,140.0],
  ['rr2','Yashasvi Jaiswal','India','IND','🇮🇳','Batter','M',33.4,161.9],
  ['rr3','Riyan Parag','India','IND','🇮🇳','All-rounder','M',28.0,145.0,32.0,8.4,'Medium'],
  ['rr4','Shimron Hetmyer','West Indies','WI','🌴','Batter','M',31.0,150.0],
  ['rr5','Sandeep Sharma','India','IND','🇮🇳','Bowler','M',9.0,90.0,25.0,7.8,'Fast'],
  ['rr6','Yuzvendra Chahal','India','IND','🇮🇳','Bowler','M',7.0,80.0,19.9,7.2,'Spin'],
  ['rr7','R Ashwin','India','IND','🇮🇳','All-rounder','M',15.0,115.0,27.0,6.9,'Spin'],
  ['rr8','Dhruv Jurel','India','IND','🇮🇳','WK-Batter','M',29.0,138.0],
  ['rr9','Avesh Khan','India','IND','🇮🇳','Bowler','M',6.0,75.0,27.0,8.6,'Fast'],
  ['rr10','Sanju Sharma','India','IND','🇮🇳','Bowler','M',8.0,85.0,26.0,8.2,'Fast'],
  ['rr11','Nandre Burger','South Africa','SA','🇿🇦','Bowler','M',5.0,70.0,23.0,8.0,'Fast'],
  ['rr12','Kunal Singh Rathore','India','IND','🇮🇳','WK-Batter','M',22.0,128.0],
  ['rr13','Donovan Ferreira','South Africa','SA','🇿🇦','Batter','M',26.0,148.0],
]
const GT: Row[] = [
  ['gt1','Shubman Gill','India','IND','🇮🇳','Batter','M',39.0,132.0],
  ['gt2','Sai Sudharsan','India','IND','🇮🇳','Batter','M',36.0,140.0],
  ['gt3','Rashid Khan','Afghanistan','AFG','🇦🇫','All-rounder','M',16.0,145.0,19.0,6.5,'Spin'],
  ['gt4','Mohammed Shami','India','IND','🇮🇳','Bowler','M',6.0,70.0,25.0,8.1,'Fast'],
  ['gt5','David Miller','South Africa','SA','🇿🇦','Batter','M',34.0,148.0],
  ['gt6','Vijay Shankar','India','IND','🇮🇳','All-rounder','M',25.0,132.0,31.0,8.0,'Medium'],
  ['gt7','Rahul Tewatia','India','IND','🇮🇳','All-rounder','M',22.0,140.0,30.0,7.8,'Spin'],
  ['gt8','Kane Williamson','New Zealand','NZ','🇳🇿','Batter','M',28.0,124.0],
  ['gt9','Mohit Sharma','India','IND','🇮🇳','Bowler','M',9.0,95.0,27.0,8.5,'Fast'],
  ['gt10','Umesh Yadav','India','IND','🇮🇳','Bowler','M',6.0,75.0,29.0,8.3,'Fast'],
  ['gt11','Sandeep Warrier','India','IND','🇮🇳','Bowler','M',5.0,70.0,28.0,8.0,'Fast'],
  ['gt12','Gerald Coetzee','South Africa','SA','🇿🇦','Bowler','M',7.0,85.0,24.0,8.4,'Fast'],
  ['gt13','Shahrukh Khan','India','IND','🇮🇳','Batter','M',24.0,146.0],
]
const LSG: Row[] = [
  ['ls1','Nicholas Pooran','West Indies','WI','🌴','WK-Batter','M',33.0,168.0],
  ['ls2','Marcus Stoinis','Australia','AUS','🇦🇺','All-rounder','M',30.4,147.1,21.6,8.4,'Medium'],
  ['ls3','Mayank Yadav','India','IND','🇮🇳','Bowler','M',5.0,65.0,19.0,7.9,'Fast'],
  ['ls4','Ravi Bishnoi','India','IND','🇮🇳','Bowler','M',8.0,90.0,22.0,6.9,'Spin'],
  ['ls5','Ayush Badoni','India','IND','🇮🇳','Batter','M',27.0,136.0],
  ['ls6','Quinton de Kock','South Africa','SA','🇿🇦','WK-Batter','M',34.0,140.0],
  ['ls7','Krunal Pandya','India','IND','🇮🇳','All-rounder','M',24.0,130.0,28.0,7.5,'Spin'],
  ['ls8','Mohsin Khan','India','IND','🇮🇳','Bowler','M',6.0,75.0,26.0,8.0,'Fast'],
  ['ls9','Deepak Hooda','India','IND','🇮🇳','All-rounder','M',26.0,138.0,30.0,7.7,'Medium'],
  ['ls10','Yash Thakur','India','IND','🇮🇳','Bowler','M',7.0,80.0,27.0,8.6,'Fast'],
  ['ls11','Digvesh Rathi','India','IND','🇮🇳','Bowler','M',6.0,72.0,25.0,7.3,'Spin'],
  ['ls12','Aiden Markram','South Africa','SA','🇿🇦','Batter','M',30.0,138.0],
  ['ls13','Akash Deep','India','IND','🇮🇳','Bowler','M',5.0,65.0,28.0,8.2,'Fast'],
]

// ── WOMEN — WPL-associated pool ────────────────────────────────────
const MIW: Row[] = [
  ['mw1','Harmanpreet Kaur','India','IND','🇮🇳','Batter','W',34.0,128.0],
  ['mw2','Nat Sciver-Brunt','England','ENG','🏴','All-rounder','W',40.0,132.0,24.0,6.4,'Medium'],
  ['mw3','Hayley Matthews','West Indies','WI','🌴','All-rounder','W',31.0,130.0,26.0,6.8,'Spin'],
  ['mw4','Yastika Bhatia','India','IND','🇮🇳','WK-Batter','W',27.0,120.0],
  ['mw5','Amelia Kerr','New Zealand','NZ','🇳🇿','All-rounder','W',29.0,118.0,20.0,6.0,'Spin'],
  ['mw6','Pooja Vastrakar','India','IND','🇮🇳','All-rounder','W',18.0,105.0,25.0,7.2,'Medium'],
  ['mw7','Saika Ishaque','India','IND','🇮🇳','Bowler','W',5.0,60.0,21.0,6.3,'Spin'],
  ['mw8','Amanjot Kaur','India','IND','🇮🇳','All-rounder','W',20.0,110.0,27.0,7.0,'Medium'],
  ['mw9','Sajeevan Sajana','India','IND','🇮🇳','Batter','W',22.0,115.0],
  ['mw10','Humairaa Kazi','India','IND','🇮🇳','WK-Batter','W',18.0,100.0],
  ['mw11','Shabnim Ismail','South Africa','SA','🇿🇦','Bowler','W',6.0,70.0,18.0,6.9,'Fast'],
  ['mw12','Nallavelli Sneha','India','IND','🇮🇳','Bowler','W',4.0,55.0,24.0,6.5,'Fast'],
  ['mw13','Priyanka Bala','India','IND','🇮🇳','All-rounder','W',16.0,100.0,28.0,6.7,'Spin'],
  ['mw14','G Kamalini','India','IND','🇮🇳','WK-Batter','W',19.0,108.0],
]
const DCW: Row[] = [
  ['dw1','Meg Lanning','Australia','AUS','🇦🇺','Batter','W',41.0,124.0],
  ['dw2','Shafali Verma','India','IND','🇮🇳','Batter','W',28.0,142.0],
  ['dw3','Jemimah Rodrigues','India','IND','🇮🇳','Batter','W',33.0,120.0],
  ['dw4','Marizanne Kapp','South Africa','SA','🇿🇦','All-rounder','W',30.0,115.0,19.0,6.1,'Medium'],
  ['dw5','Alice Capsey','England','ENG','🏴','All-rounder','W',24.0,125.0,26.0,6.8,'Medium'],
  ['dw6','Radha Yadav','India','IND','🇮🇳','Bowler','W',12.0,95.0,22.0,6.2,'Spin'],
  ['dw7','Shikha Pandey','India','IND','🇮🇳','Bowler','W',10.0,90.0,23.0,6.6,'Medium'],
  ['dw8','Jess Jonassen','Australia','AUS','🇦🇺','All-rounder','W',20.0,105.0,21.0,6.0,'Spin'],
  ['dw9','Taniya Bhatia','India','IND','🇮🇳','WK-Batter','W',18.0,102.0],
  ['dw10','Arundhati Reddy','India','IND','🇮🇳','Bowler','W',12.0,95.0,24.0,6.9,'Medium'],
  ['dw11','Minnu Mani','India','IND','🇮🇳','All-rounder','W',15.0,98.0,27.0,6.4,'Spin'],
  ['dw12','Titas Sadhu','India','IND','🇮🇳','Bowler','W',5.0,60.0,25.0,6.7,'Fast'],
  ['dw13','Sarah Bryce','Scotland','SCO','🏴','WK-Batter','W',20.0,108.0],
  ['dw14','Tara Norris','Australia','AUS','🇦🇺','Bowler','W',6.0,65.0,23.0,6.8,'Fast'],
]
const UPW: Row[] = [
  ['uw1','Alyssa Healy','Australia','AUS','🇦🇺','WK-Batter','W',36.0,130.0],
  ['uw2','Deepti Sharma','India','IND','🇮🇳','All-rounder','W',29.0,110.0,20.0,5.9,'Spin'],
  ['uw3','Sophie Ecclestone','England','ENG','🏴','Bowler','W',8.0,85.0,16.0,5.8,'Spin'],
  ['uw4','Grace Harris','Australia','AUS','🇦🇺','All-rounder','W',24.0,135.0,25.0,6.9,'Medium'],
  ['uw5','Kiran Navgire','India','IND','🇮🇳','Batter','W',22.0,140.0],
  ['uw6','Simran Shaikh','India','IND','🇮🇳','WK-Batter','W',18.0,105.0],
  ['uw7','Shweta Sehrawat','India','IND','🇮🇳','Batter','W',25.0,112.0],
  ['uw8','Anjali Sarvani','India','IND','🇮🇳','Bowler','W',6.0,65.0,26.0,6.6,'Fast'],
  ['uw9','Saima Thakor','India','IND','🇮🇳','Bowler','W',5.0,60.0,25.0,6.3,'Spin'],
  ['uw10','Parshavi Chopra','India','IND','🇮🇳','Bowler','W',4.0,55.0,24.0,6.2,'Spin'],
  ['uw11','Vrinda Dinesh','India','IND','🇮🇳','WK-Batter','W',20.0,110.0],
  ['uw12','Rambha Devi','India','IND','🇮🇳','Bowler','W',5.0,58.0,26.0,6.7,'Fast'],
  ['uw13','Shreyanka Patil','India','IND','🇮🇳','All-rounder','W',18.0,108.0,24.0,6.4,'Spin'],
  ['uw14','Kranti Goud','India','IND','🇮🇳','Bowler','W',6.0,62.0,23.0,6.8,'Fast'],
]
const GGW: Row[] = [
  ['gw1','Ashleigh Gardner','Australia','AUS','🇦🇺','All-rounder','W',28.0,128.0,21.0,6.1,'Spin'],
  ['gw2','Beth Mooney','Australia','AUS','🇦🇺','WK-Batter','W',38.0,120.0],
  ['gw3','Sneh Rana','India','IND','🇮🇳','All-rounder','W',22.0,100.0,23.0,5.9,'Spin'],
  ['gw4','D Hemalatha','India','IND','🇮🇳','All-rounder','W',20.0,105.0,25.0,6.2,'Spin'],
  ['gw5','Phoebe Litchfield','Australia','AUS','🇦🇺','Batter','W',30.0,125.0],
  ['gw6','Kashvee Gautam','India','IND','🇮🇳','Bowler','W',6.0,65.0,24.0,6.7,'Medium'],
  ['gw7','Tanuja Kanwar','India','IND','🇮🇳','Bowler','W',5.0,60.0,25.0,6.3,'Spin'],
  ['gw8','Harleen Deol','India','IND','🇮🇳','Batter','W',26.0,115.0],
  ['gw9','Meghna Singh','India','IND','🇮🇳','Bowler','W',8.0,75.0,24.0,6.6,'Medium'],
  ['gw10','Bharti Fulmali','India','IND','🇮🇳','Batter','W',18.0,105.0],
  ['gw11','Monica Patel','India','IND','🇮🇳','Bowler','W',5.0,58.0,25.0,6.5,'Fast'],
  ['gw12','Mannat Kashyap','India','IND','🇮🇳','Bowler','W',4.0,55.0,26.0,6.4,'Spin'],
  ['gw13','Georgia Wareham','Australia','AUS','🇦🇺','All-rounder','W',20.0,118.0,22.0,6.3,'Spin'],
  ['gw14','Annabel Sutherland','Australia','AUS','🇦🇺','All-rounder','W',24.0,122.0,23.0,6.5,'Medium'],
]
const RCBW: Row[] = [
  ['bw1','Smriti Mandhana','India','IND','🇮🇳','Batter','W',38.0,126.0],
  ['bw2','Ellyse Perry','Australia','AUS','🇦🇺','All-rounder','W',34.0,118.0,20.0,6.0,'Medium'],
  ['bw3','Sophie Devine','New Zealand','NZ','🇳🇿','All-rounder','W',30.0,140.0,25.0,6.7,'Medium'],
  ['bw4','Richa Ghosh','India','IND','🇮🇳','WK-Batter','W',26.0,148.0],
  ['bw5','Renuka Singh Thakur','India','IND','🇮🇳','Bowler','W',9.0,80.0,19.0,6.4,'Fast'],
  ['bw6','Asha Sobhana','India','IND','🇮🇳','Bowler','W',6.0,65.0,22.0,6.2,'Spin'],
  ['bw7','Heather Knight','England','ENG','🏴','Batter','W',31.0,110.0],
  ['bw8','Kanika Ahuja','India','IND','🇮🇳','All-rounder','W',14.0,95.0,27.0,6.6,'Spin'],
  ['bw9','Komal Zanzad','India','IND','🇮🇳','Bowler','W',5.0,60.0,25.0,6.5,'Spin'],
  ['bw10','Indrani Roy','India','IND','🇮🇳','Batter','W',16.0,102.0],
  ['bw11','Shreyanka Patil','India','IND','🇮🇳','All-rounder','W',17.0,106.0,24.0,6.4,'Spin'],
  ['bw12','Sarah Glenn','England','ENG','🏴','Bowler','W',8.0,78.0,21.0,6.1,'Spin'],
  ['bw13','Sophie Molineux','Australia','AUS','🇦🇺','All-rounder','W',19.0,112.0,23.0,6.3,'Spin'],
  ['bw14','Ekta Bisht','India','IND','🇮🇳','Bowler','W',4.0,55.0,26.0,6.0,'Spin'],
]

export const ROSTER_ROWS = {
  MI, CSK, RCB, KKR, SRH, DC, PBKS, RR, GT, LSG,
  MIW, DCW, UPW, GGW, RCBW,
} as const

export const ALL_PLAYERS: Player[] = Object.values(ROSTER_ROWS).flat().map(mk)

export const PLAYER_BY_ID: Record<string, Player> = Object.fromEntries(
  ALL_PLAYERS.map(p => [p.id, p])
)

export function searchLocalPlayers(query: string, limit = 60): Player[] {
  const q = query.trim().toLowerCase()
  const pool = q
    ? ALL_PLAYERS.filter(p => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q))
    : ALL_PLAYERS
  return pool.slice(0, limit)
}
