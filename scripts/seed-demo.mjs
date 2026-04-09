/**
 * Demo data seed for SiteFlow
 * Run: node scripts/seed-demo.mjs
 *
 * Creates "Apex Builders LLC" with a full year of realistic job history.
 */

import postgres from 'postgres'
import { hashSync } from 'bcryptjs'

const DB = 'postgresql://gymuser:Br3anna!@localhost:5433/gymdb'
const sql = postgres(DB)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uuid() {
  return crypto.randomUUID()
}

/** Random int between min and max inclusive */
function ri(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Pick random element from array */
function pick(arr) {
  return arr[ri(0, arr.length - 1)]
}

/** Add business days to a date */
function addBizDays(date, n) {
  const d = new Date(date)
  let added = 0
  while (added < n) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) added++
  }
  return d
}

/** Format date as YYYY-MM-DD */
function fmt(d) {
  return d.toISOString().slice(0, 10)
}

/** Dates N months ago */
function monthsAgo(n) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d
}

/** All weekday dates between start and end */
function weekdaysBetween(start, end) {
  const days = []
  const cur = new Date(start)
  while (cur <= end) {
    if (cur.getDay() !== 0 && cur.getDay() !== 6) {
      days.push(fmt(new Date(cur)))
    }
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

// ─── Seed data definitions ────────────────────────────────────────────────────

const ORG_ID   = uuid()
const OWNER_ID = uuid()

const WORKERS = [
  { id: uuid(), name: 'Marcus Webb',     phone: '(602) 555-0142', role: 'Foreman' },
  { id: uuid(), name: 'Danny Reyes',     phone: '(602) 555-0187', role: 'Lead Carpenter' },
  { id: uuid(), name: 'Tyler Banks',     phone: '(602) 555-0231', role: 'Electrician' },
  { id: uuid(), name: 'Javier Morales',  phone: '(602) 555-0309', role: 'Plumber' },
  { id: uuid(), name: 'Kevin Osei',      phone: '(602) 555-0418', role: 'Carpenter' },
  { id: uuid(), name: 'Liam Hutchins',   phone: '(602) 555-0522', role: 'Laborer' },
  { id: uuid(), name: 'Darius Cole',     phone: '(602) 555-0634', role: 'Laborer' },
  { id: uuid(), name: 'Sam Nguyen',      phone: '(602) 555-0741', role: 'Tile & Flooring' },
  { id: uuid(), name: 'Eddie Flores',    phone: '(602) 555-0856', role: 'Drywaller' },
  { id: uuid(), name: 'Chris Patel',     phone: '(602) 555-0967', role: 'Painter' },
  { id: uuid(), name: 'Aaron Simmons',   phone: '(602) 555-1023', role: 'Framer' },
  { id: uuid(), name: 'Malik Johnson',   phone: '(602) 555-1134', role: 'Laborer' },
]

const SPECIALTIES = [
  { id: uuid(), name: 'Electrical' },
  { id: uuid(), name: 'Plumbing' },
  { id: uuid(), name: 'Carpentry' },
  { id: uuid(), name: 'Drywall' },
  { id: uuid(), name: 'Painting' },
  { id: uuid(), name: 'Tile & Flooring' },
  { id: uuid(), name: 'Framing' },
]

// Specialty assignments
const WORKER_SPECIALTIES = [
  [2, 0], // Tyler Banks → Electrical
  [3, 1], // Javier Morales → Plumbing
  [1, 2], [4, 2],  // Danny Reyes, Kevin Osei → Carpentry
  [8, 3], // Eddie Flores → Drywall
  [9, 4], // Chris Patel → Painting
  [7, 5], // Sam Nguyen → Tile & Flooring
  [10, 6], // Aaron Simmons → Framing
]

const TEAMS = [
  { id: uuid(), name: 'Alpha Crew',   color: '#f97316', members: [0, 1, 4, 5] },
  { id: uuid(), name: 'Bravo Crew',   color: '#3b82f6', members: [0, 8, 9, 6] },
  { id: uuid(), name: 'Electrical Team', color: '#8b5cf6', members: [2] },
  { id: uuid(), name: 'Plumbing Team',   color: '#10b981', members: [3] },
]

// Jobs: realistic residential/commercial remodel & new-build projects
const JOBS_DEF = [
  // DONE — finished jobs from 10-12 months ago
  {
    name: 'Thornberry Kitchen Remodel',
    client: 'Susan Thornberry',    phone: '(602) 555-2201',
    address: '4821 E Camelback Rd, Phoenix, AZ 85018',
    scope: 'Full kitchen gut and rebuild. New cabinets, quartz counters, tile backsplash, under-cabinet lighting, and appliance hookups.',
    status: 'done', value: 48500, billed: 48500, paid: 48500,
    startMo: 12, durationWks: 6,
    workers: [0,1,2,3,7,8],
    phases: [
      { name: 'Demo & Rough-In',     tasks: ['Demo existing cabinets', 'Remove flooring', 'Rough-in plumbing', 'Rough-in electrical'] },
      { name: 'Framing & Drywall',   tasks: ['Frame new island', 'Hang drywall', 'Tape & mud', 'Prime walls'] },
      { name: 'Cabinets & Counter',  tasks: ['Install upper cabinets', 'Install base cabinets', 'Install countertops', 'Install backsplash'] },
      { name: 'Finish Work',         tasks: ['Install under-cabinet lights', 'Hook up appliances', 'Paint', 'Final clean'] },
    ],
    changeOrders: [
      { desc: 'Add pot-filler above range', amount: 1850, approved: true },
    ],
  },
  {
    name: 'Garrison Master Bath Addition',
    client: 'Robert & Tricia Garrison',  phone: '(602) 555-3302',
    address: '9104 N 54th St, Scottsdale, AZ 85253',
    scope: 'Convert guest bedroom into master bathroom. Custom tile shower, freestanding tub, double vanity, radiant floor heat.',
    status: 'done', value: 67200, billed: 67200, paid: 67200,
    startMo: 11, durationWks: 7,
    workers: [0,3,2,7,9,5],
    phases: [
      { name: 'Demo',         tasks: ['Demo bedroom walls', 'Remove flooring', 'Rough-in drain lines'] },
      { name: 'Rough-In',     tasks: ['Plumbing rough-in', 'Electrical rough-in', 'Install radiant floor heat'] },
      { name: 'Tile & Build', tasks: ['Shower tile', 'Floor tile', 'Hang drywall', 'Install tub'] },
      { name: 'Fixtures',     tasks: ['Install vanity', 'Install toilet', 'Install shower fixtures', 'Paint & trim'] },
    ],
    changeOrders: [
      { desc: 'Upgrade to freestanding soaking tub', amount: 2400, approved: true },
      { desc: 'Add heated towel bar', amount: 380, approved: true },
    ],
  },
  {
    name: 'Lakeview Commercial Buildout',
    client: 'Lakeview Properties LLC',   phone: '(602) 555-4403',
    address: '2200 W Elliot Rd Suite 103, Chandler, AZ 85224',
    scope: 'Full interior buildout of 2,400 sq ft retail space. New partition walls, electrical panel upgrade, ADA bathrooms, storefront glass.',
    status: 'done', value: 124000, billed: 124000, paid: 118000,
    startMo: 10, durationWks: 10,
    workers: [0,1,2,3,4,8,10,11],
    phases: [
      { name: 'Demo & Structural', tasks: ['Demo existing partitions', 'Core drill for plumbing', 'Frame new walls'] },
      { name: 'MEP Rough-In',      tasks: ['Electrical panel upgrade', 'Run new circuits', 'Plumbing rough-in', 'HVAC rough-in'] },
      { name: 'Drywall & Ceiling', tasks: ['Hang drywall', 'Tape & finish', 'Install drop ceiling', 'Paint'] },
      { name: 'Finish',            tasks: ['Install tile in bathrooms', 'Install fixtures', 'Storefront glass', 'Punch list'] },
    ],
    changeOrders: [
      { desc: 'Add server room with dedicated circuit', amount: 3200, approved: true },
      { desc: 'Upgrade storefront to triple-pane glass', amount: 5800, approved: true },
      { desc: 'Paint exterior accent wall', amount: 920, approved: false },
    ],
  },

  // IN PROGRESS — ongoing jobs
  {
    name: 'Hargrove ADU Construction',
    client: 'Phil Hargrove',   phone: '(602) 555-5504',
    address: '714 W Glendale Ave, Phoenix, AZ 85021',
    scope: 'Detached 640 sq ft ADU — studio + bathroom + kitchenette. Full foundation, framing, MEP, and finishes.',
    status: 'in_progress', value: 185000, billed: 92500, paid: 92500,
    startMo: 4, durationWks: 20,
    workers: [0,1,2,3,4,10,11],
    phases: [
      { name: 'Foundation',   tasks: ['Excavation', 'Form & pour footings', 'Slab pour', 'Waterproofing'] },
      { name: 'Framing',      tasks: ['Wall framing', 'Roof framing', 'Sheathing', 'Housewrap'] },
      { name: 'MEP Rough-In', tasks: ['Plumbing rough-in', 'Electrical rough-in', 'HVAC rough-in', 'Inspections'] },
      { name: 'Insulation & Drywall', tasks: ['Install insulation', 'Hang drywall', 'Tape & mud', 'Texture'] },
      { name: 'Finishes',     tasks: ['Install flooring', 'Install cabinets', 'Paint', 'Install fixtures', 'Final punch list'] },
    ],
    changeOrders: [
      { desc: 'Upgrade to mini-split HVAC system', amount: 4200, approved: true },
    ],
    percent: 55,
  },
  {
    name: 'Cortez Whole-Home Renovation',
    client: 'Maria Cortez',    phone: '(602) 555-6605',
    address: '3318 S Mill Ave, Tempe, AZ 85282',
    scope: 'Full gut renovation of 1950s ranch home. New roof, windows, kitchen, 2 bathrooms, flooring throughout, full re-wire.',
    status: 'in_progress', value: 215000, billed: 107500, paid: 107500,
    startMo: 5, durationWks: 22,
    workers: [0,1,2,3,7,8,9,10],
    phases: [
      { name: 'Tear-Down',    tasks: ['Full demo', 'Haul debris', 'Asbestos abatement', 'Foundation repairs'] },
      { name: 'Structural',   tasks: ['New roof framing', 'New windows install', 'New exterior doors', 'Stucco repair'] },
      { name: 'MEP',          tasks: ['Full re-wire', 'New plumbing supply/drain', 'HVAC replacement', 'Inspections'] },
      { name: 'Interior',     tasks: ['Drywall throughout', 'Tape & texture', 'Kitchen cabinets', 'Bathroom tile'] },
      { name: 'Finishes',     tasks: ['LVP flooring', 'Paint interior', 'Paint exterior', 'Install all fixtures', 'Punch list'] },
    ],
    changeOrders: [
      { desc: 'Add EV charger in garage', amount: 1600, approved: true },
      { desc: 'Upgrade to wood-look tile in bathrooms', amount: 2800, approved: true },
      { desc: 'Add mudroom built-ins', amount: 3400, approved: false },
    ],
    percent: 48,
  },
  {
    name: 'Nolan Office Interior',
    client: 'Nolan Financial Group',   phone: '(602) 555-7706',
    address: '100 N Central Ave Fl 12, Phoenix, AZ 85004',
    scope: 'Remodel 1,800 sq ft office suite. New conference room, private offices, open workspace, server closet, kitchen nook.',
    status: 'in_progress', value: 98000, billed: 49000, paid: 49000,
    startMo: 3, durationWks: 8,
    workers: [0,4,8,9,11],
    phases: [
      { name: 'Demo',       tasks: ['Demo partitions', 'Remove carpet', 'Remove ceiling tiles'] },
      { name: 'Framing',    tasks: ['Frame conference room', 'Frame private offices', 'Frame server closet'] },
      { name: 'Electrical', tasks: ['Run new circuits', 'Install outlets & switches', 'Conference room AV rough-in'] },
      { name: 'Finishes',   tasks: ['Drywall & paint', 'Install LVT flooring', 'Install ceiling tiles', 'Kitchen nook cabinets'] },
    ],
    percent: 62,
  },
  {
    name: 'Westside Storage Building',
    client: 'Desert Sun Properties',   phone: '(602) 555-8807',
    address: '5920 W Van Buren St, Phoenix, AZ 85043',
    scope: 'New 3,200 sq ft metal building — commercial storage with grade-level doors, LED lighting, concrete floor, and office annex.',
    status: 'in_progress', value: 142000, billed: 71000, paid: 71000,
    startMo: 3, durationWks: 14,
    workers: [0,1,4,10,11,5,6],
    phases: [
      { name: 'Site Prep',    tasks: ['Grade & compact site', 'Install drainage', 'Concrete slab pour'] },
      { name: 'Steel',        tasks: ['Erect steel frame', 'Install roof panels', 'Install wall panels', 'Grade-level doors'] },
      { name: 'Office',       tasks: ['Frame office annex', 'Plumbing rough-in', 'Electrical rough-in', 'Drywall & finishes'] },
      { name: 'Site Finish',  tasks: ['Install LED lighting', 'Paint', 'Pave parking area', 'Landscaping & final grade'] },
    ],
    percent: 40,
  },

  // UPCOMING / JUST STARTED
  {
    name: 'Petrov Pool House',
    client: 'Alex & Dana Petrov',   phone: '(602) 555-9908',
    address: '15402 N Pima Rd, Scottsdale, AZ 85260',
    scope: '500 sq ft pool house with outdoor kitchen, half bath, covered patio extension, and outdoor fireplace.',
    status: 'in_progress', value: 89000, billed: 22250, paid: 22250,
    startMo: 1, durationWks: 12,
    workers: [0,1,3,4,9],
    phases: [
      { name: 'Foundation & Slab', tasks: ['Layout & excavate', 'Footings', 'Slab pour'] },
      { name: 'Framing & Roof',    tasks: ['Wall framing', 'Roof framing', 'Roofing', 'Windows & doors'] },
      { name: 'Plumbing & Elec',   tasks: ['Outdoor kitchen plumbing', 'Electrical', 'Half bath rough-in'] },
      { name: 'Outdoor Kitchen',   tasks: ['Install outdoor cabinets', 'Counter tops', 'Built-in grill & fridge', 'Fireplace'] },
      { name: 'Finish',            tasks: ['Stucco', 'Tile patio floor', 'Paint', 'Final fixtures'] },
    ],
    percent: 20,
  },
  {
    name: 'Ridgeline HOA Clubhouse Refresh',
    client: 'Ridgeline HOA',   phone: '(480) 555-1029',
    address: '8800 E McDowell Rd, Scottsdale, AZ 85257',
    scope: 'Refresh common areas: new flooring throughout, repaint interior and exterior, update restrooms, replace lighting fixtures.',
    status: 'not_started', value: 56000, billed: 0, paid: 0,
    startMo: 0, durationWks: 5,
    workers: [0,7,9,11],
    phases: [
      { name: 'Prep',     tasks: ['Move furniture to storage', 'Surface prep', 'Prime all walls'] },
      { name: 'Flooring', tasks: ['Remove existing carpet', 'Install LVP flooring', 'Install base molding'] },
      { name: 'Paint',    tasks: ['Interior paint', 'Exterior paint', 'Touch-ups'] },
      { name: 'Upgrades', tasks: ['Replace restroom fixtures', 'Install new lighting', 'Replace signage', 'Final walk-through'] },
    ],
    percent: 0,
  },
  {
    name: 'Henderson Garage Conversion',
    client: 'Tom Henderson',   phone: '(602) 555-2140',
    address: '6209 E Camelback Rd, Scottsdale, AZ 85251',
    scope: 'Convert 2-car garage into conditioned living space — home gym with rubber flooring, TV wall, mini-split, and egress window.',
    status: 'not_started', value: 34500, billed: 0, paid: 0,
    startMo: 0, durationWks: 4,
    workers: [0,2,8,9],
    phases: [
      { name: 'Prep & Insulation', tasks: ['Install rigid insulation', 'Frame interior walls', 'Egress window cut-out'] },
      { name: 'MEP',               tasks: ['Electrical rough-in', 'Mini-split installation', 'Inspect'] },
      { name: 'Finish',            tasks: ['Drywall & texture', 'Paint', 'TV wall mount & wire management', 'Rubber flooring'] },
    ],
    percent: 0,
  },
]

// ─── Main seed function ───────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding demo org...')

  // 1. Create org
  await sql`
    INSERT INTO organizations (id, name, created_at)
    VALUES (${ORG_ID}, 'Apex Builders LLC', NOW() - INTERVAL '14 months')
  `
  console.log('  ✓ Organization: Apex Builders LLC')

  // 2. Create owner user
  const ownerHash = hashSync('demo1234', 12)
  await sql`
    INSERT INTO users (id, email, password_hash, platform_role)
    VALUES (${OWNER_ID}, 'owner@apexbuilders.com', ${ownerHash}, 'org_user')
  `
  await sql`
    INSERT INTO org_members (org_id, user_id, role, permissions)
    VALUES (
      ${ORG_ID}, ${OWNER_ID}, 'owner',
      '{"can_view_jobs":true,"can_edit_jobs":true,"can_view_job_financials":true,"can_view_schedule":true,"can_manage_schedule":true,"can_view_crew":true,"can_view_financials":true,"can_view_activity":true,"can_upload_photos":true,"can_view_tasks":true,"can_complete_tasks":true,"can_manage_tasks":true,"can_view_change_orders":true,"can_manage_change_orders":true,"can_view_all_jobs":true}'::jsonb
    )
  `
  console.log('  ✓ Owner: owner@apexbuilders.com / demo1234')

  // 3. Create specialties
  for (const s of SPECIALTIES) {
    await sql`INSERT INTO specialties (id, company_id, name) VALUES (${s.id}, ${ORG_ID}, ${s.name})`
  }
  console.log(`  ✓ ${SPECIALTIES.length} specialties`)

  // 4. Create workers
  for (const w of WORKERS) {
    await sql`
      INSERT INTO workers (id, company_id, name, phone, role, created_at)
      VALUES (${w.id}, ${ORG_ID}, ${w.name}, ${w.phone}, ${w.role}, NOW() - INTERVAL '13 months')
    `
  }
  // Assign specialties
  for (const [wi, si] of WORKER_SPECIALTIES) {
    await sql`
      INSERT INTO worker_specialties (worker_id, specialty_id)
      VALUES (${WORKERS[wi].id}, ${SPECIALTIES[si].id})
    `
  }
  console.log(`  ✓ ${WORKERS.length} workers`)

  // 5. Create teams
  for (const t of TEAMS) {
    await sql`
      INSERT INTO teams (id, company_id, name, color)
      VALUES (${t.id}, ${ORG_ID}, ${t.name}, ${t.color})
    `
    for (const mi of t.members) {
      await sql`INSERT INTO team_members (team_id, worker_id) VALUES (${t.id}, ${WORKERS[mi].id})`
    }
  }
  console.log(`  ✓ ${TEAMS.length} teams`)

  // 6. Create jobs, phases, tasks, work days, change orders
  const today = new Date()
  for (const jd of JOBS_DEF) {
    const jobId = uuid()
    const startDate = monthsAgo(jd.startMo)
    const endDate = addBizDays(startDate, jd.durationWks * 5)

    const actualStatus = jd.status
    const isDone = actualStatus === 'done'
    const percent = isDone ? 100 : (jd.percent ?? 0)

    await sql`
      INSERT INTO jobs (
        id, company_id, name, client_name, client_phone, address, scope,
        status, percent_complete, total_value, amount_billed, amount_paid,
        planned_start, planned_end,
        start_date, end_date,
        created_at, updated_at
      ) VALUES (
        ${jobId}, ${ORG_ID}, ${jd.name}, ${jd.client}, ${jd.phone}, ${jd.address}, ${jd.scope},
        ${actualStatus}, ${percent}, ${jd.value}, ${jd.billed}, ${jd.paid},
        ${fmt(startDate)}, ${fmt(endDate)},
        ${isDone ? fmt(startDate) : null}, ${isDone ? fmt(endDate) : null},
        ${startDate.toISOString()}, ${(isDone ? endDate : today).toISOString()}
      )
    `

    // Phases + tasks
    let phaseOrder = 0
    for (const ph of jd.phases) {
      const phId = uuid()
      const phDone = isDone ? 'done' : (phaseOrder < Math.floor((percent / 100) * jd.phases.length) ? 'done' : 'not_started')
      await sql`
        INSERT INTO job_phases (id, job_id, company_id, name, status, order_index, weight)
        VALUES (${phId}, ${jobId}, ${ORG_ID}, ${ph.name}, ${phDone}, ${phaseOrder}, 1)
      `
      let taskOrder = 0
      for (const tname of ph.tasks) {
        const taskDone = phDone === 'done' ? 'done' : 'todo'
        await sql`
          INSERT INTO job_tasks (id, job_id, company_id, phase_id, name, status, order_index)
          VALUES (${uuid()}, ${jobId}, ${ORG_ID}, ${phId}, ${tname}, ${taskDone}, ${taskOrder})
        `
        taskOrder++
      }
      phaseOrder++
    }

    // Change orders
    if (jd.changeOrders) {
      for (const co of jd.changeOrders) {
        await sql`
          INSERT INTO change_orders (id, job_id, company_id, description, amount, approved, created_at)
          VALUES (${uuid()}, ${jobId}, ${ORG_ID}, ${co.desc}, ${co.amount}, ${co.approved}, ${addBizDays(startDate, ri(5,20)).toISOString()})
        `
      }
    }

    // Work days
    const wdEnd = isDone ? endDate : (percent > 0 ? today : addBizDays(today, 3))
    const wdStart = startDate
    const allDays = weekdaysBetween(wdStart, wdEnd)

    // For done/in-progress jobs, pick 60-80% of weekdays as actual work days (not every day)
    const workDates = allDays.filter((_, i) => ri(0, 9) < 7) // ~70% chance each day

    for (const dateStr of workDates) {
      const wdId = uuid()
      const dayDate = new Date(dateStr)
      const isPast = dayDate < today
      const wdStatus = isDone ? 'done' : (isPast ? pick(['done', 'done', 'in_progress']) : 'planned')

      await sql`
        INSERT INTO work_days (id, job_id, company_id, date, status, created_at)
        VALUES (${wdId}, ${jobId}, ${ORG_ID}, ${dateStr}, ${wdStatus}, ${dayDate.toISOString()})
      `

      // Assign 2-5 workers to each day
      const dayWorkers = [...jd.workers]
        .sort(() => Math.random() - 0.5)
        .slice(0, ri(2, Math.min(5, jd.workers.length)))

      for (const wi of dayWorkers) {
        await sql`
          INSERT INTO work_day_workers (work_day_id, worker_id, company_id)
          VALUES (${wdId}, ${WORKERS[wi].id}, ${ORG_ID})
        `
      }
    }

    // Activity logs
    await sql`
      INSERT INTO activity_logs (id, company_id, actor_email, entity_type, entity_id, entity_name, action, metadata, created_at)
      VALUES (
        ${uuid()}, ${ORG_ID}, 'owner@apexbuilders.com', 'job', ${jobId}, ${jd.name},
        'created', ${sql.json({ status: 'not_started' })},
        ${startDate.toISOString()}
      )
    `
    if (isDone) {
      await sql`
        INSERT INTO activity_logs (id, company_id, actor_email, entity_type, entity_id, entity_name, action, metadata, created_at)
        VALUES (
          ${uuid()}, ${ORG_ID}, 'owner@apexbuilders.com', 'job', ${jobId}, ${jd.name},
          'status_changed', ${sql.json({ from: 'in_progress', to: 'done' })},
          ${endDate.toISOString()}
        )
      `
    }

    console.log(`  ✓ Job: ${jd.name} (${actualStatus}, ${workDates.length} work days)`)
  }

  console.log('\n✅ Demo seeded successfully!')
  console.log('   Org:   Apex Builders LLC')
  console.log('   Login: owner@apexbuilders.com')
  console.log('   Pass:  demo1234')
  console.log('\n   To log in as this org, create an admin session and "View Org" → Apex Builders LLC')
  console.log('   OR log in directly at /login with the credentials above.\n')

  await sql.end()
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message)
  console.error(err)
  process.exit(1)
})
