/**
 * masterNarration.js
 * --------------------------------------------------------------
 * AUTO-GENERATED · DO NOT EDIT BY HAND.
 *
 * Source of truth for every demo's voiceover script. This file is
 * regenerated from the canonical SCENES arrays via:
 *
 *   python3 /app/scripts/extract_demo_scripts.py
 *   python3 /app/scripts/build_master_narration.py
 *
 * The same string drives:
 *   • on-screen captions / subtitles
 *   • legacy demo TTS (until per-scene HeyGen clips are uploaded)
 *   • per-scene HeyGen avatar recordings (record this text verbatim)
 *   • dashboard tooling that previews demo content
 *
 * Shape:
 *   MASTER_NARRATION = {
 *     [demoKey]: {
 *       title: string,
 *       scenes: [
 *         { id, section, title, narration, duration_ms, duration_seconds }
 *       ],
 *     }
 *   }
 */

export const MASTER_NARRATION = {
    "supermarket": {
        "title": "Supermarket / Retail Operations Demo",
        "scenes": [
            {
                "id": "opening",
                "section": "Scene 1 · The Modern Retail Operation",
                "title": "Scene 1 · The Modern Retail Operation",
                "narration": "Thousands of stores. Dozens of warehouses. Hundreds of trucks. Fuel locations across multiple regions. Tens of thousands of employees. The data is already flowing. CreatorBoostAI is the execution layer that turns it into decisions, actions, and measured financial outcomes in real time.",
                "duration_ms": 34000,
                "duration_seconds": 34
            },
            {
                "id": "existing-systems",
                "section": "Scene 2 · The Systems Layer We Operate On",
                "title": "Scene 2 · The Systems Layer We Operate On",
                "narration": "Every retailer already runs on a system stack — ERP, retail platforms, workforce, maintenance, CRM, fleet, fuel, and store-level POS. CreatorBoostAI does not replace these systems. It sits across them, reads what they produce, reasons about what matters, and executes the next action — automatically.",
                "duration_ms": 40000,
                "duration_seconds": 40
            },
            {
                "id": "command-center",
                "section": "Scene 3 · The Operations Command Center",
                "title": "Scene 3 · The Operations Command Center",
                "narration": "The Operations Command Center opens. For every live signal, the engine answers four questions instantly. What needs attention first. What action to take. Who owns it. What the dollar impact is if ignored. Not reporting — execution.",
                "duration_ms": 38000,
                "duration_seconds": 38
            },
            {
                "id": "money-saving",
                "section": "Scene 4 · Cost Prevention Engine",
                "title": "Scene 4 · Cost Prevention Engine",
                "narration": "Detected: refrigeration drift, HVAC fatigue, lighting waste, overstaffing, late maintenance, shrink exposure. Reasoned: priority × dollar impact. Executed: work orders dispatched, schedules adjusted, vendor escalations sent. Measured: every dollar saved is tagged to the Action ID that prevented the loss.",
                "duration_ms": 42000,
                "duration_seconds": 42
            },
            {
                "id": "revenue-making",
                "section": "Scene 5 · Revenue Recovery Engine",
                "title": "Scene 5 · Revenue Recovery Engine",
                "narration": "The engine identifies every missed dollar. Out-of-stock recovery. Better promotion timing. Localized pricing. Basket-size lift. Upsell paths. Fuel-to-store conversion. Loyalty triggers. For every opportunity, CreatorBoostAI recommends the next best action and executes it — signage updated, promotion pushed, pricing adjusted.",
                "duration_ms": 40000,
                "duration_seconds": 40
            },
            {
                "id": "store-example",
                "section": "Scene 6 · Single-Store Execution · Store 1142",
                "title": "Scene 6 · Single-Store Execution · Store 1142",
                "narration": "Store 1142. Dairy sales falling. Refrigeration alerts on two units. Labor schedule gaps. Customer complaints rising. Detected across six data streams. Reasoned against financial impact. Executed: six coordinated actions fired in under ninety seconds. Measured: every outcome tagged to an Action ID.",
                "duration_ms": 44000,
                "duration_seconds": 44
            },
            {
                "id": "regional-view",
                "section": "Scene 7 · Regional Execution View",
                "title": "Scene 7 · Regional Execution View",
                "narration": "Zoom out. A regional manager oversees fifty to three hundred stores. Every location is ranked by live financial risk. The top ten actions surface automatically. No dashboards to hunt through. No reports to read. Just the next action to execute, with the dollar impact attached.",
                "duration_ms": 38000,
                "duration_seconds": 38
            },
            {
                "id": "executive-view",
                "section": "Scene 8 · Role-Tailored Execution",
                "title": "Scene 8 · Role-Tailored Execution",
                "narration": "CEO sees enterprise performance. COO sees execution bottlenecks. CFO sees savings, leakage, and return on investment — every dollar traceable to an Action ID. Regional sees store priorities. Store managers see simple daily tasks. One system. Every role. Every level. Aligned on execution.",
                "duration_ms": 38000,
                "duration_seconds": 38
            },
            {
                "id": "autonomous",
                "section": "Scene 9 · Assisted ↔ Autonomous Execution",
                "title": "Scene 9 · Assisted ↔ Autonomous Execution",
                "narration": "Two execution modes. In manual mode, every action waits for human approval. In auto mode, CreatorBoostAI creates tasks, sends alerts, drafts vendor emails, triggers workflows, and logs results — automatically. The toggle is real-time and operator-level. Control stays with the humans. Execution speed stays with the system.",
                "duration_ms": 36000,
                "duration_seconds": 36
            },
            {
                "id": "c-store",
                "section": "Scene 10 · Convenience + Fuel Operations",
                "title": "Scene 10 · Convenience + Fuel Operations",
                "narration": "Convenience stores and fuel forecourts come into focus. POS systems, fuel monitoring, tank telemetry, food freshness, forecourt maintenance. In C-stores, speed matters. The engine detects, reasons, and executes faster than small issues can become lost sales. Every pump minute of downtime has a dollar attached.",
                "duration_ms": 42000,
                "duration_seconds": 42
            },
            {
                "id": "fleet-supply",
                "section": "Scene 11 · Fleet & Supply-Chain Execution",
                "title": "Scene 11 · Fleet & Supply-Chain Execution",
                "narration": "Trucks, warehouses, delivery routes, and store-level demand feed into one execution view. Late deliveries detected. Reasoned against regional demand. Routes re-prioritized automatically. Backhaul opportunities captured. The supply chain responds — it no longer reacts.",
                "duration_ms": 38000,
                "duration_seconds": 38
            },
            {
                "id": "maintenance",
                "section": "Scene 12 · Maintenance as Execution Discipline",
                "title": "Scene 12 · Maintenance as Execution Discipline",
                "narration": "Work orders flow in across the chain. The engine identifies what is urgent, which vendors are slow, which repairs are costing too much, which equipment is hurting sales, which preventive work pays for itself. Maintenance stops being a backlog. It becomes a measurable financial discipline.",
                "duration_ms": 38000,
                "duration_seconds": 38
            },
            {
                "id": "cost-recovery",
                "section": "Scene 13 · Cost Recovery & Asset Intelligence · Purchase Vault",
                "title": "Scene 13 · Cost Recovery & Asset Intelligence · Purchase Vault",
                "narration": "The Purchase Vault reads purchasing logs, maintenance histories, vendor invoices, and equipment records chain-wide. It detects repeated service calls on the same unit, rising cost curves, end-of-life equipment, and vendor overcharging. For every flag it recommends a clear action — replace versus repair, vendor escalation, capital upgrade with payback. Every leak is found, ranked, and recovered.",
                "duration_ms": 48000,
                "duration_seconds": 48
            },
            {
                "id": "self-funding",
                "section": "Scene 14 · Self-Funding Upgrade System",
                "title": "Scene 14 · Self-Funding Upgrade System",
                "narration": "Most retailers know they need upgrades — efficient lighting, newer refrigeration, smarter equipment — but the capital is never approved. CreatorBoostAI changes the equation. It routes a portion of the savings it is already recovering into a modeled upgrade fund. The savings pay for the upgrade. The upgrade compounds the savings. No upfront capital required.",
                "duration_ms": 44000,
                "duration_seconds": 44
            },
            {
                "id": "warranty",
                "section": "Scene 15 · Warranty Enforcement at Scale",
                "title": "Scene 15 · Warranty Enforcement at Scale",
                "narration": "Every upgrade surfaces with a five to seven year third-party warranty covering parts, service, and replacements. The engine monitors warranty coverage on every asset, tracks every service call against the active warranty, and enforces replacement obligations automatically. Most organizations unknowingly pay for repairs that should be covered. CreatorBoostAI prevents that leakage.",
                "duration_ms": 42000,
                "duration_seconds": 42
            },
            {
                "id": "financial-impact",
                "section": "Scene 16 · Financial Impact Dashboard",
                "title": "Scene 16 · Financial Impact Dashboard",
                "narration": "Every action ties to a number. Estimated savings. Revenue recovered. Maintenance cost avoided. Labor efficiency. Energy reduction. Inventory waste prevented. Every recommendation is tagged with a measurable financial outcome the moment it executes. Not estimates — traceable dollars with Action IDs.",
                "duration_ms": 38000,
                "duration_seconds": 38
            },
            {
                "id": "closing",
                "section": "Scene 17 · Portfolio Command Center · Execute Upgrade",
                "title": "Scene 17 · Portfolio Command Center · Execute Upgrade",
                "narration": "Your stores already generate the data. CreatorBoostAI turns that data into action. Detect every signal. Reason against financial impact. Execute every action. Measure every outcome. The Portfolio Command Center lets you run an upgrade across every location — rollout plan, vendor coordination, proposals, task scheduling — with one click. This is CreatorBoostAI. The execution layer for modern retail operations.",
                "duration_ms": 42000,
                "duration_seconds": 42
            }
        ]
    },
    "airport": {
        "title": "Airport Operations Demo",
        "scenes": [
            {
                "id": "problem",
                "section": "Scene 1 · The Airport Problem",
                "title": "A modern airport. Dozens of systems. No unified control.",
                "narration": "Picture a modern international airport. Seventy-two gates. Three terminals. Fourteen million passengers a year. One hundred forty concessionaires. Eighteen ground-handling vendors. Three thousand two hundred tracked assets on the field. Every one of those operations already runs on a system. SITA for passenger and baggage data. Sabre and Amadeus for reservations and inventory. Concession point- of-sale for retail revenue. Ground-handling schedulers for crews and equipment. Maintenance ERPs for jet bridges, HVAC, belts, elevators. Vendor contract stores for cleaning, security, catering, advertising. The airport has paid for all of them. They work. But they don't talk to each other. And the data they produce never becomes decisions. Revenue leaks out every day. Contracts go unenforced. Equipment fails past its useful life. No one has a single screen where it all comes together. That is the problem CreatorBoostAI was built to solve.",
                "duration_ms": 62000,
                "duration_seconds": 62
            },
            {
                "id": "leakage",
                "section": "Scene 2 · Revenue Leakage, Made Visible",
                "title": "Every dollar the airport is losing — surfaced in one view.",
                "narration": "Before we show you the solution, let's show you what the solution is worth. The overlay reads every revenue stream the airport already owns and finds the money leaking out. Concession leakage. Shop A earns one thousand two hundred eighty-four dollars per square foot. Shop B, same footprint, same traffic, earns four hundred twelve. The gap is worth two point six million a year. Parking leakage. Structure B runs forty percent under capacity on Tuesdays — dynamic pricing window missed, nine hundred sixty thousand a year left on the table. Lounge leakage. International concourse lounge caps at sixty-eight percent occupancy during peak — one point one million in subscription and day-pass revenue unrealized. Advertising leakage. Digital displays run thirty-eight percent unsold inventory during red-eye windows — six hundred forty thousand in direct revenue gone. Add duty-free under-attribution, unsold gate advertising, and unmonetized dwell time, and the airport is leaking over six point four million dollars every single year — measurable, recoverable, and never once surfaced on any existing dashboard.",
                "duration_ms": 66000,
                "duration_seconds": 66
            },
            {
                "id": "command",
                "section": "Scene 3 · The Command Center",
                "title": "The overlay appears. Every system, one live screen.",
                "narration": "This is the CreatorBoostAI command center. It sits on top of every system the airport already runs. SITA. Sabre. Amadeus. Concession point-of-sale. Ground- handling schedulers. Maintenance ERPs. Vendor contract stores. We do not rip anything out. We do not compete with the vendors the airport has already chosen. We sit on top. Read-only by default. Write-back is scoped, optional, and fully audit-logged. On a single screen, airport leadership sees passenger throughput by terminal. Concession revenue per square foot. Gate utilization. Crew status. Baggage transit time. Open work orders. Contracts expiring within ninety days. Assets on-field. Every number live, every number sourced from a system the airport already paid for. This is not a replacement. This is control — finally unified, finally visible, finally actionable.",
                "duration_ms": 60000,
                "duration_seconds": 60
            },
            {
                "id": "operations",
                "section": "Scene 4 · Operations Intelligence",
                "title": "Gates, crews, baggage, turnaround — decided live, not reviewed later.",
                "narration": "Operations next. Every gate is scored for utilization. Every crew is tracked for dispatch state. Every bag is measured end-to-end for transit time. Every turnaround is graded — aircraft by aircraft, gate by gate, carrier by carrier. When a turnaround consistently runs long at gate C-04, the overlay flags it before the airline does. When crew at gate A-07 sits idle for four minutes between rotations, the overlay flags it before the shift report is filed. When a baggage belt transit time climbs out of tolerance, the overlay flags it before passengers reach the carousel. And when a single aircraft delay starts to propagate — through ground handling, through gate assignment, through connecting flights — the overlay shows the cascade before it reaches the ramp. The outcome is measurable. Average turnaround dropped six minutes. Baggage transit median dropped two point one minutes. Delay cascades caught early, seventeen of the last eighteen. The data was already in the systems. The intelligence layer made it usable.",
                "duration_ms": 64000,
                "duration_seconds": 64
            },
            {
                "id": "service",
                "section": "Scene 5 · Maintenance & Service Tracking",
                "title": "Every work order. Every service call. Every history, in one ledger.",
                "narration": "Now we open the maintenance layer. Every work order the airport generates — preventive, corrective, emergency — is captured. Every service call from every vendor is logged against the asset that was serviced. Every technician visit is time-stamped, parts are itemized, and labor hours are reconciled against the contract. Consider jet bridge B-twelve. Twelve service calls in the last ninety days. Three different vendors. Total invoice, forty-two thousand dollars. The overlay shows the pattern: the same hydraulic issue recurring every fourteen to twenty-one days. The fix? Replace the manifold — one part, one install, four thousand two hundred dollars. Payback, less than sixty days. Without this ledger, the airport would keep paying thirty-eight thousand a year forever. Maintenance ERPs are great at logging what happened. They are not built to surface patterns, cross-reference warranty coverage, or compare vendor pricing. The overlay does all three, continuously.",
                "duration_ms": 66000,
                "duration_seconds": 66
            },
            {
                "id": "lifecycle",
                "section": "Scene 6 · Equipment Lifecycle & End-of-Life Alerts",
                "title": "Every asset — cradle to retirement — continuously scored.",
                "narration": "Every major asset on the field is registered in the lifecycle ledger. Install date. Manufacturer. Warranty terms. Service history. Performance trend. Expected useful life. Each asset moves through four states. Identified. Approved. Deployed. Savings verified. Today on this airport, four hundred twenty-eight assets are identified as upgrade candidates. One hundred twenty-four are approved and queued. One thousand one hundred forty-two are deployed and in service. One hundred forty-eight have completed a full upgrade cycle and are in the savings-verified state. More importantly — the system generates end-of-life alerts. HVAC rooftop unit RT-one, Pier D. Thirteen years old. Manufacturer declared end-of-life. Failure probability in next twelve months, sixty-four percent. Action: capital plan, Q3 replacement window. Escalator A-3. Vibration trend crossing threshold. Bearing replacement recommended before unplanned downtime. De-icing rig 4 completed its upgrade last year and is already running one hundred eighty-four thousand dollars under its historical energy spend. The airport no longer discovers end-of-life during a failure. The overlay tells it first.",
                "duration_ms": 64000,
                "duration_seconds": 64
            },
            {
                "id": "vendors",
                "section": "Scene 7 · Vendor Performance & Contract Visibility",
                "title": "The contracts the airport already signed — finally enforced.",
                "narration": "Contracts and vendors. Every service agreement the airport has signed — ground handling, terminal cleaning, security, catering, advertising, concession master agreements, parking operators — is loaded into the overlay. Service- level agreements are read in, line by line. Invoices are cross-checked against performance, against warranty coverage, and against market benchmark rates. Consider what the overlay has caught this quarter. GroundOps International, two service calls invoiced at full rate — both covered under an active manufacturer warranty. Flagged before pay. Value recovered, twenty-eight thousand dollars. FilterPro, invoicing eighteen percent above the regional market benchmark. Escalated to procurement. Annualized savings if renegotiated, one hundred forty-eight thousand. Lounge Hospitality Partners, missing the ninety-eight percent uptime SLA for the fourth consecutive month. Penalty clause triggered for the first time in three years, seventy-two thousand in service credits. Renewal windows surface at sixty, ninety, and one hundred twenty days — no more last-minute auto-renewals. The vendors stay. The accountability is new.",
                "duration_ms": 62000,
                "duration_seconds": 62
            },
            {
                "id": "passengers",
                "section": "Scene 8 · Passenger Signal & Revenue Optimization",
                "title": "BodyIQ-AI turns every passenger touchpoint into measurable revenue.",
                "narration": "The passenger layer activates. BodyIQ-AI — our behavioral intelligence engine — applies airport-grade signal measurement to every touchpoint that drives revenue. Check-in. Security. Retail. Food and beverage. Lounge entry. Gate dwell. The system reads structured signals, never adjectives. Friction at a self-service kiosk. Decision hesitation at a duty-free display. Dwell patterns that predict purchase. Stress signatures in a security line. Each signal is a cluster — anchored to anatomy, scored by intensity, classified positive, mixed, or negative. Every cluster connects to an action the airport can take. Friction at the kiosk — dispatch staff assist, reducing abandonment eleven percent. Hesitation at duty-free — push a targeted offer, lifting conversion four point two points. Security stress spike — open an additional lane, trimming median wait twenty-three percent. Dwell-attributed purchase modeling adds one dollar and forty-two cents to revenue per passenger. On fourteen million passengers a year, that is nineteen point eight million dollars of new annual revenue — surfaced, attributed, and auditable.",
                "duration_ms": 62000,
                "duration_seconds": 62
            },
            {
                "id": "growth",
                "section": "Scene 9 · Growth · Contract Wins · Future State",
                "title": "More revenue. Better operations. New contracts won.",
                "narration": "Let's close with outcomes. Year one with CreatorBoostAI. Six point four million in recoverable revenue leakage, surfaced and addressed. One point eight four million in wrongly paid repairs, recovered under warranty enforcement. Nineteen point eight million in new passenger-layer revenue. Average turnaround down six minutes. Delay cascades caught early ninety-four percent of the time. But there is a second story. Contract wins. Because the airport can now prove performance, quantify capacity, and surface under-served demand — the airport wins new contracts. A new catering master agreement, three point two million annually. Two new retail concession deals, four point one million combined. An extended ground-services contract, seven point six million over three years. An airline lounge partnership backed by verified occupancy data, two point eight million annually. The future state is simple. More revenue. Better operations. Every asset accounted for. New contracts won on the strength of data the airport already owned — but had never been able to use. CreatorBoostAI does not replace SITA, Sabre, Amadeus, or any system the airport already runs. It sits on top of them. And it makes them more profitable.",
                "duration_ms": 62000,
                "duration_seconds": 62
            }
        ]
    },
    "school": {
        "title": "School District Operations Demo",
        "scenes": [
            {
                "id": "hook",
                "section": "Scene 1 · Hook",
                "title": "Most school districts operate across multiple systems — but none of them execute decisions.",
                "narration": "The problem isn't lack of data. It's lack of execution.",
                "duration_ms": 6000,
                "duration_seconds": 6
            },
            {
                "id": "systems",
                "section": "Scene 2 · The Systems Problem",
                "title": "You have PowerSchool. Canvas. Workday.",
                "narration": "Student Information. Learning Management. Enterprise Resource Planning. These systems only store data — they don't act on it.",
                "duration_ms": 8500,
                "duration_seconds": 8
            },
            {
                "id": "gap",
                "section": "Scene 3 · The Gap",
                "title": "That creates a gap between knowing and doing.",
                "narration": "Budgets leak. Maintenance gets delayed. Vendor costs go unchecked.",
                "duration_ms": 7000,
                "duration_seconds": 7
            },
            {
                "id": "layer",
                "section": "Scene 4 · The CreatorBoostAI Layer",
                "title": "CreatorBoostAI sits on top of your existing systems.",
                "narration": "It identifies inefficiencies across campuses in real time — budget leakage, maintenance delays, vendor overspending, energy waste.",
                "duration_ms": 9000,
                "duration_seconds": 9
            },
            {
                "id": "execution",
                "section": "Scene 5 · Real Execution",
                "title": "The system doesn't just analyze — it executes.",
                "narration": "It detects waste, triggers vendor outreach, logs actions, and turns data into action automatically.",
                "duration_ms": 9500,
                "duration_seconds": 10
            },
            {
                "id": "koollite",
                "section": "Scene 6 · Koollite Tie-In",
                "title": "Example: lighting inefficiencies across facilities.",
                "narration": "The system identifies upgrade opportunities and triggers vendor solutions that reduce operating costs.",
                "duration_ms": 7500,
                "duration_seconds": 8
            },
            {
                "id": "outcome",
                "section": "Scene 7 · Outcome",
                "title": "Reduced costs · Better allocation of funds · Faster decisions · Full operational visibility.",
                "narration": "This is not another system — it's the execution layer your current systems are missing.",
                "duration_ms": 9000,
                "duration_seconds": 9
            }
        ]
    },
    "realtor": {
        "title": "Real Estate / Realtor Demo",
        "scenes": [
            {
                "id": "hook",
                "section": "Scene 1 · The Hook",
                "title": "You don't have a lead problem. You have a system problem.",
                "narration": "Right now, somewhere in your business, a high-intent lead is going cold. Not because your agents aren't good — but because the tools meant to support them are working against them. Your CRM, your email platform, your MLS, your marketing tools, your spreadsheets — all of them are running, and none of them are talking to each other. You don't have a lead problem. You have a system problem.",
                "duration_ms": 45000,
                "duration_seconds": 45
            },
            {
                "id": "current-stack",
                "section": "Scene 2 · Current Software Reality",
                "title": "Your stack already exists.",
                "narration": "Most real estate companies already use a powerful software stack. Customer relationship platforms like Salesforce and Follow Up Boss. Listing systems like the MLS, kvCORE, and Zillow. Property platforms like Yardi, AppFolio, and RealPage. Marketing, email, and transaction tools layered on top. These tools are excellent at what they do — but each one operates as its own island, with its own login, its own data, its own version of the truth. CreatorBoostAI is not here to replace any of them. CreatorBoostAI is the layer that sits on top.",
                "duration_ms": 60000,
                "duration_seconds": 60
            },
            {
                "id": "cb-intro",
                "section": "Scene 3 · CreatorBoostAI",
                "title": "CreatorBoostAI sits on top of everything you use.",
                "narration": "CreatorBoostAI is your operating layer. It connects to the systems you already run — your CRM, your MLS, your email, your marketing platforms, your property management software — and unifies them into a single intelligent command center. No replacement. No migration. No disruption. The systems your teams already know stay exactly as they are. CreatorBoostAI just makes them work together for the first time.",
                "duration_ms": 60000,
                "duration_seconds": 60
            },
            {
                "id": "lead-capture",
                "section": "Scene 4 · Lead Capture",
                "title": "Every lead, captured automatically.",
                "narration": "Leads enter your business from everywhere. Your website. Paid ads. Social. Referrals. Open houses. Listing portals. Inbound calls and texts. CreatorBoostAI captures every one of them in real time, automatically logs them, tags them by source and intent, and routes them into the right system — Salesforce, Follow Up Boss, kvCORE, BoomTown — whichever your team already uses. No manual entry. No leads lost in an inbox. No deal slipping through a crack.",
                "duration_ms": 60000,
                "duration_seconds": 60
            },
            {
                "id": "ai-qualify",
                "section": "Scene 5 · AI Qualification",
                "title": "AI scores intent, urgency, and capacity.",
                "narration": "Once a lead is captured, CreatorBoostAI's AI goes to work. It reads the conversation, the form fill, the property history, and the behavior — and produces three scores: intent, urgency, and financial capacity. A motivated seller relocating in sixty days surfaces at the top of the queue. A casual browser is nurtured automatically. A pre-approved buyer ready this weekend gets routed to your top-performing agent immediately.",
                "duration_ms": 60000,
                "duration_seconds": 60
            },
            {
                "id": "follow-up",
                "section": "Scene 6 · Follow-Up Automation",
                "title": "The right message, at the right moment.",
                "narration": "Most leads aren't lost in the first call. They're lost in the follow-up. CreatorBoostAI builds a personalized follow-up sequence for every lead — email, text message, and recommended call windows — timed to the lead's actual behavior, not a static drip. If a buyer opens your listing email at nine p.m., the system suggests a morning text. If a seller goes quiet for ten days, it triggers a re-engagement message in your voice. Every touch is drafted automatically. Your agents review, approve, and send — or, if you choose, the system sends on their behalf. Either way, no lead waits more than a few hours for a thoughtful, personal response.",
                "duration_ms": 90000,
                "duration_seconds": 90
            },
            {
                "id": "task-pipeline",
                "section": "Scene 7 · Tasks & Pipeline",
                "title": "Auto-generated tasks. Live pipeline.",
                "narration": "Every qualified lead generates a task list automatically: schedule the showing, send the comps, prepare the listing presentation, draft the offer. Each task is assigned, timestamped, and tracked. And every deal moves through a live pipeline — from new lead to appointment to active to under contract to closed — visible to leadership in real time, with revenue forecasts that update every minute.",
                "duration_ms": 60000,
                "duration_seconds": 60
            },
            {
                "id": "property-mgmt",
                "section": "Scene 8 · Property & Management",
                "title": "Listings, rentals, and operations in one view.",
                "narration": "CreatorBoostAI extends beyond sales. It pulls listings, rental performance, lease renewals, maintenance requests, vacancy risk, and tenant communication from your property management platforms — Yardi, AppFolio, RealPage, MRI — into the same command center your sales team uses. Sales, leasing, and operations finally share the same source of truth.",
                "duration_ms": 60000,
                "duration_seconds": 60
            },
            {
                "id": "revenue-engine",
                "section": "Scene 9 · Revenue Engine",
                "title": "Deals closing. Commissions tracked. Pipeline forecasted.",
                "narration": "This is where it all converts to revenue. Closed deals, commission splits, gross commission income, and net operating income flow into one financial layer. Pipeline forecasting projects the next thirty, sixty, and ninety days based on real deal velocity — not gut feel. Leadership sees exactly what's closing, when, and what each agent and asset is contributing to the bottom line.",
                "duration_ms": 60000,
                "duration_seconds": 60
            },
            {
                "id": "integration-layer",
                "section": "Scene 10 · Integration Layer",
                "title": "We don't replace. We oversee and optimize.",
                "narration": "Here's how CreatorBoostAI actually plugs in. It connects through standard, secure APIs — the same pattern every modern enterprise integration uses. It connects to your CRM, your MLS, your email platform, your marketing stack, your transaction tools, and your property management software. Read-only by default. Encrypted in transit and at rest. Every action logged. Every automated message reviewable before send. We don't replace your systems. We oversee, organize, and optimize them — so your existing investments finally start producing the leverage they were supposed to.",
                "duration_ms": 90000,
                "duration_seconds": 90
            },
            {
                "id": "execution-engine",
                "section": "Scene 11 · The Execution Engine",
                "title": "Not a CRM. Not a marketing tool. An execution layer.",
                "narration": "Now here's what actually makes this different. CreatorBoostAI runs on proprietary, patent-pending execution systems. It is not a CRM. It is not a marketing tool. It is an execution layer that runs across the systems you already operate — Salesforce, Yardi, AppFolio, Follow Up Boss, kvCORE, MLS, your transaction stack, and the rest. It analyzes every connected system in real time. It identifies revenue opportunities and operational inefficiencies the moment they appear. And — when you authorize it — it executes actions across those systems automatically. This is a category shift. Most platforms give you data. Some give you insights. CreatorBoostAI executes.",
                "duration_ms": 75000,
                "duration_seconds": 75
            },
            {
                "id": "dashboard-reveal",
                "section": "Scene 12 · The Command Center",
                "title": "One screen. Whole business.",
                "narration": "This is the command center. Total pipeline, projected revenue, active leads scored by intent, every agent's live performance, every property's status, every campaign's return, every task across every team — all in one view, all updating in real time. Leadership opens this dashboard in the morning and instantly knows: what's moving, what's stuck, who needs help, and where the next dollar of revenue is coming from. What used to take five reports, three meetings, and a Monday morning email — is now one screen.",
                "duration_ms": 90000,
                "duration_seconds": 90
            },
            {
                "id": "national-cc",
                "section": "Scene 13 · National & Regional Command",
                "title": "Your nationwide command center.",
                "narration": "This is your nationwide command center. Every region, every market, every office, every agent — visible in real time, on one map. Active listings heat-mapped state by state. Closed deals per region. Revenue tracked market by market. Lead flow concentrations highlighted in real time. Compliance and transaction-coordinator alerts pinpointed to the office that triggered them. Commission payouts traced to the agent who earned them. Drill from the United States, into a state, into a city, into an office, into an individual agent. Identify underperforming markets instantly. Reallocate marketing budget to the metros where listings are converting. Coach the offices that are slipping. Increase output without increasing headcount. You're no longer managing agents. You're managing an entire national real estate operation — from one system.",
                "duration_ms": 90000,
                "duration_seconds": 90
            },
            {
                "id": "autonomous",
                "section": "Scene 14 · Autonomous Mode",
                "title": "Approve every move — or let the system act.",
                "narration": "Now the most important question. Would you like CreatorBoostAI to take action automatically — sending follow-ups, booking showings, routing leads, drafting contracts — or would you prefer to review and approve every move before it goes out? You choose, by team, by channel, by deal size. Full autonomy, full approval, or anywhere in between. The system always defers to your control.",
                "duration_ms": 60000,
                "duration_seconds": 60
            },
            {
                "id": "closing",
                "section": "Scene 15 · Closing",
                "title": "Most platforms give you data. CreatorBoostAI executes.",
                "narration": "This is not another tool to add to your stack. This is the operating system for your real estate business — a proprietary, patent-pending execution layer that finally makes every system, every agent, every lead, and every property work together, automatically. When you're ready, send this demo to your leadership team, replay any section, or book a live walkthrough where we map CreatorBoostAI directly to your stack. Most platforms give you data. Some give you insights. CreatorBoostAI executes.",
                "duration_ms": 45000,
                "duration_seconds": 45
            }
        ]
    },
    "noldus": {
        "title": "Enterprise (Noldus) Demo",
        "scenes": [
            {
                "id": "facereader",
                "section": "Scene 1 · The Measurement Floor",
                "title": "Measurement at the highest level.",
                "narration": "What you are seeing is one of the most advanced behavioral measurement systems in the world. It captures human physiology with frame-level precision. Action Units. Gaze vectors. Micro-expressions. Head pose. Lip and brow articulation. Thirty frames per second of continuous anatomical data. This is measurement at the highest level — and it is the foundation of everything that follows.",
                "duration_ms": 45000,
                "duration_seconds": 45
            },
            {
                "id": "subjectivity-problem",
                "section": "Scene 2 · The Subjectivity Problem",
                "title": "Measurement is rigorous. Interpretation has been improvisational.",
                "narration": "For decades, behavioral systems have ended at description. A reviewer says the buyer looked confused. Another says the candidate seemed nervous. A third says the witness appeared evasive. These are adjectives. They are subjective. They cannot be standardized, audited, or deployed across an enterprise. Measurement is rigorous. Interpretation has been improvisational. That gap is what BodyIQ-AI was built to close.",
                "duration_ms": 40000,
                "duration_seconds": 40
            },
            {
                "id": "framework-intro",
                "section": "Scene 3 · The SRS · CPS · EOS Framework",
                "title": "Three structured states. One anatomical signal stack.",
                "narration": "BodyIQ-AI introduces three structured signal states. SRS — the Signal Response State — captures the body's first measurable reaction to stimulus. CPS — the Cognitive Processing State — captures the structured response of the brain working through the input. EOS — the Evaluation Outcome State — captures the body's final evaluative resolution. Together, SRS, CPS, and EOS form the complete anatomical signal stack. Every output the system produces is a Signal Cluster — identified by ID, anchored to specific Action Units, scored by intensity, and classified as positive, negative, or mixed. No adjectives. No interpretation. Only structured measurement.",
                "duration_ms": 50000,
                "duration_seconds": 50
            },
            {
                "id": "comparison",
                "section": "Scene 4 · Subjective vs Structured",
                "title": "Same human. Same frame. Opinion versus anatomical evidence.",
                "narration": "Look at the difference. On the left, the legacy approach. Quote: the buyer seemed unsure. Quote: the candidate appeared defensive. Quote: the witness looked uncomfortable. On the right, the BodyIQ-AI output for the same moment. Cluster ID SRS dash one one four two. Action Units four and seven. Intensity zero point six two. Classification negative. Same human. Same frame. One is opinion. The other is anatomical evidence. Enterprises can audit the second. Enterprises can deploy the second. Enterprises can scale the second. This is the shift from subjective description to structured signal.",
                "duration_ms": 50000,
                "duration_seconds": 50
            },
            {
                "id": "srs-detect",
                "section": "Scene 5 · Live SRS Detection",
                "title": "Cluster SRS-1142 · AU 4 · AU 7 · Lip Pressor · Intensity 0.62 · Classification: negative.",
                "narration": "The system enters live operation. The first cluster fires. S R S dash one one four two. Action Unit four. Action Unit seven. Lip pressor active. Intensity zero point six two. Classification negative. This is the body's initial reaction — measurable, time-stamped, and objective. No interpretation has occurred yet. The system has simply recorded what the anatomy is doing.",
                "duration_ms": 45000,
                "duration_seconds": 45
            },
            {
                "id": "cps-detect",
                "section": "Scene 6 · CPS Cluster",
                "title": "Cluster CPS-2073 · AU 1 · AU 2 · Gaze Drift · Intensity 0.71 · Classification: mixed.",
                "narration": "A second cluster fires. C P S dash two zero seven three. Inner brow raiser. Outer brow raiser. Gaze drift. Intensity zero point seven one. Classification mixed. The brain is processing — working through the input rather than responding to it. The system tags this state and continues.",
                "duration_ms": 40000,
                "duration_seconds": 40
            },
            {
                "id": "eos-detect",
                "section": "Scene 7 · EOS Cluster",
                "title": "Cluster EOS-3408 · AU 15 · AU 17 · Head Tilt · Intensity 0.58 · Classification: negative.",
                "narration": "The third cluster resolves. E O S dash three four zero eight. Lip corner depressor. Chin raiser. Sustained head tilt. Intensity zero point five eight. Classification negative. The body has reached its evaluative outcome. SRS, CPS, and EOS together form a complete read of this moment — three structured states, anchored to anatomy, scored by intensity, free of subjective language.",
                "duration_ms": 42000,
                "duration_seconds": 42
            },
            {
                "id": "decision-panel",
                "section": "Scene 8 · Decision Engine",
                "title": "Signal stack converted into a structured, auditable decision.",
                "narration": "BodyIQ-AI converts the signal stack into a structured decision. Recommended action: do not proceed to close. Provide clarification. Reduce complexity. The decision is anchored to the underlying clusters. Every recommendation is fully traceable, fully auditable, and fully reproducible. There is no opinion in the chain. Only signal, cluster, intensity, and classification.",
                "duration_ms": 40000,
                "duration_seconds": 40
            },
            {
                "id": "creatorboost-arrives",
                "section": "Scene 9 · CreatorBoostAI · Execution Layer",
                "title": "The intelligence layer defines. The execution layer acts.",
                "narration": "Now the execution layer opens. CreatorBoostAI is the live command center where structured intelligence becomes operational reality. Pipelines, deals, communications, and follow-ups — all linked to the BodyIQ signal stack in real time. The intelligence layer defines. The execution layer acts.",
                "duration_ms": 40000,
                "duration_seconds": 40
            },
            {
                "id": "deal-at-risk",
                "section": "Scene 10 · Deal at Risk · Autonomous Action",
                "title": "Cluster SRS-1142 linked to live deal · System executes autonomously.",
                "narration": "An active deal is in the pipeline. Acme Corp. One hundred eighty-four thousand dollars annual contract value. The system links cluster S R S dash one one four two directly to this deal. Status: at risk. Suggested actions appear instantly. Send clarification email. Reduce pricing complexity. Trigger follow-up call within twenty-four hours. The mode toggles to autonomous. The system executes immediately. Email sent. Task assigned. CRM updated. Audit trail logged. This is the moment intelligence becomes execution.",
                "duration_ms": 50000,
                "duration_seconds": 50
            },
            {
                "id": "global-dashboard",
                "section": "Scene 11 · Global Behavioral Intelligence",
                "title": "Behavioral intelligence becomes a measurable enterprise KPI.",
                "narration": "The view expands to the global dashboard. United States. Europe. Asia. Each region with live performance metrics. One thousand two hundred forty-eight active behavioral sessions. Eighteen thousand four hundred forty-two structured signal clusters. Twelve point four million dollars in revenue influenced by the signal stack this quarter. Behavioral intelligence becomes a measurable enterprise KPI.",
                "duration_ms": 45000,
                "duration_seconds": 45
            },
            {
                "id": "rep-grid",
                "section": "Scene 12 · Team Intelligence Scoring",
                "title": "Signal Accuracy · Response Efficiency · Outcome Impact.",
                "narration": "Zoom into the team layer. Each operator scored on three dimensions. Signal Accuracy — how well they read the anatomical data. Response Efficiency — how quickly they act on the structured output. Outcome Impact — the revenue effect of their decisions. Organizations now measure how their teams respond to human signals — not just what they say.",
                "duration_ms": 40000,
                "duration_seconds": 40
            },
            {
                "id": "training-mode",
                "section": "Scene 13 · Training Replay System",
                "title": "Every cluster, every frame, fully replayable and coachable.",
                "narration": "Training replay engages. A recorded interaction plays back, with S R S, C P S, and E O S clusters overlaid frame-by-frame. Operators see exactly which signals fired, when, and how they responded. Every interaction becomes measurable, coachable, and standardized across the organization. This is enterprise-grade behavioral training.",
                "duration_ms": 40000,
                "duration_seconds": 40
            },
            {
                "id": "accuracy-closing",
                "section": "Scene 14 · Accuracy + Closing",
                "title": "Up to 96% non-subjective classification · Up to 98% signal-level accuracy.",
                "narration": "Two numbers define this system. Up to ninety-six percent non-subjective classification — meaning ninety-six out of every one hundred outputs are structured signals, not adjectives. Up to ninety-eight percent signal-level accuracy — meaning the underlying Action Unit detection is as precise as the world's leading behavioral measurement systems. Human communication is largely driven by nonverbal signals. This system operates directly on that layer — anatomical, measurement-based, and objective. Noldus measures. BodyIQ-AI defines. CreatorBoostAI executes. Together, this is the first complete Human Intelligence Execution System.",
                "duration_ms": 52000,
                "duration_seconds": 52
            }
        ]
    },
    "startup": {
        "title": "Startup Founder Demo",
        "scenes": [
            {
                "id": "scene-1",
                "section": "Scene 1 · The Spark",
                "title": "Tell the avatar your business idea",
                "narration": "Welcome to CreatorBoostAI. This is the founder demo. The system begins the moment you describe your business. One sentence is enough — the avatar turns that spark into a full business operating system in minutes.",
                "duration_ms": 16500,
                "duration_seconds": 17
            },
            {
                "id": "scene-2",
                "section": "Scene 2 · Discovery",
                "title": "Structured questions, not endless chat",
                "narration": "Instead of endless chat, the avatar asks six structured questions: industry, location, pricing, year-one goal, and target customer. Every answer is captured once, then routed downstream into every document, financial model, and lead list you will need.",
                "duration_ms": 16500,
                "duration_seconds": 17
            },
            {
                "id": "scene-3",
                "section": "Scene 3 · The Plan",
                "title": "A real business plan in minutes",
                "narration": "In under two minutes you have a real business plan. Executive summary, market analysis, competition, go-to-market, operations, and financials — eight sections, bank and investor ready. Export to PDF or Word with one click.",
                "duration_ms": 16500,
                "duration_seconds": 17
            },
            {
                "id": "scene-4",
                "section": "Scene 4 · The Numbers",
                "title": "12-month financial projections",
                "narration": "Next, twelve months of financial projections. Month-by-month revenue, cost of goods, gross margin, fixed costs, operating profit, and cash balance. The numbers are realistic — built the way a real chief financial officer would build them.",
                "duration_ms": 16500,
                "duration_seconds": 17
            },
            {
                "id": "scene-5",
                "section": "Scene 5 · The Capital",
                "title": "Loan-ready documents",
                "narration": "Need capital? The system produces a one-page loan summary with use of funds, debt service coverage, and repayment terms. Bank ready. Lender ready. You walk in prepared.",
                "duration_ms": 16500,
                "duration_seconds": 17
            },
            {
                "id": "scene-6",
                "section": "Scene 6 · The Website",
                "title": "Your business website, built automatically",
                "narration": "Your business doesn't just need a plan — it needs a presence. CreatorBoostAI now builds your entire business website. Homepage, services, about, and contact pages — all written, designed, and connected to your lead system. Customers can find you, trust you, and take action immediately.",
                "duration_ms": 16500,
                "duration_seconds": 17
            },
            {
                "id": "scene-7",
                "section": "Scene 7 · The Customers",
                "title": "A targeted lead list — not a Lusha export",
                "narration": "Now the customers. Your ideal customer profile is locked, and a targeted prospect list is generated. Every lead runs through the Exclusive Lead Engine — locked to you, never duplicated, never resold.",
                "duration_ms": 16500,
                "duration_seconds": 17
            },
            {
                "id": "scene-8",
                "section": "Scene 8 · The Outreach",
                "title": "Value-first outreach the avatar writes for you",
                "narration": "The avatar writes your outreach. A five-touch cadence, personalized to each prospect's industry and city. Day zero, day one, day three, day five, day eight — every email crafted in your voice, ready to send.",
                "duration_ms": 16500,
                "duration_seconds": 17
            },
            {
                "id": "scene-9",
                "section": "Scene 9 · The Conversion",
                "title": "Demo or offer page launched",
                "narration": "Each prospect lands on a soft-gated demo page. Their intent score climbs with every click and open. Hot leads surface in the Ops portal in real time, so you know exactly who to call next.",
                "duration_ms": 16500,
                "duration_seconds": 17
            },
            {
                "id": "scene-10",
                "section": "Scene 10 · The Signal",
                "title": "Replies tracked. Engagement scored. Hot leads pinged.",
                "narration": "Every reply is classified by AI — interested, neutral, or not interested. Interested replies automatically create a deal and send a Calendly link, and you receive a text message within sixty seconds. No reply gets missed.",
                "duration_ms": 16500,
                "duration_seconds": 17
            },
            {
                "id": "scene-11",
                "section": "Scene 11 · The Delivery",
                "title": "From win → client workspace · automatic",
                "narration": "Finally, when a deal closes, a client workspace is created automatically. A six-step delivery checklist is seeded, a magic link is emailed to your client, and Delivery AI takes over. Zero manual handoff. This is CreatorBoostAI — your business, fully operated.",
                "duration_ms": 16500,
                "duration_seconds": 17
            }
        ]
    }
};

/** Look up the canonical narration for a (demo, scene-id) pair. */
export const getNarration = (demoKey, sceneId) => {
    const demo = MASTER_NARRATION[demoKey];
    if (!demo) return null;
    return demo.scenes.find((s) => s.id === sceneId) || null;
};

/** Return all scenes for a demo in order. */
export const getDemoScenes = (demoKey) => MASTER_NARRATION[demoKey]?.scenes || [];

export default MASTER_NARRATION;
