/* Hook Demo configs — Layer 1 of the cinematic funnel.
 * Each demo is ~55-60s of motion UI + Web Speech narration.
 * Frames follow the spec: Pain → Activation → Outcome → Positioning → CTAs.
 *
 * Adding more industries = drop a new entry here. The HookDemoPlayer is
 * fully data-driven so no component changes are needed.
 */

const FINAL_FRAME_LABEL = "Final frame · choose your next move";

export const HOOK_DEMOS = {
    realtor: {
        id: "realtor",
        label: "Real Estate",
        accent: "cyan",
        full_walkthrough_path: "/demo/realtor",
        full_walkthrough_label: "Realtor walkthrough · ~13 min",
        executive_path: "/demo/noldus",
        avatar_intro: "Tara · Real Estate Ops",
        frames: [
            {
                id: "pain",
                phase: "PAIN",
                durationMs: 7500,
                eyebrow: "Tuesday · 7:42 AM",
                headline: "12 inbound leads. No agent has touched them.",
                subline: "CRM full. Inbox full. Nothing happening.",
                voiceover:
                    "It's Tuesday morning. Twelve inbound buyer leads came in overnight. Nothing has been touched. This is where deals die.",
                actions: [],
                metrics: [
                    { label: "Leads waiting", value: 12, accent: "rose" },
                    { label: "First-touch SLA", value: "BREACHED", accent: "rose" },
                    { label: "Agents on", value: 0, accent: "amber" },
                ],
            },
            {
                id: "activate",
                phase: "ACTIVATION",
                durationMs: 9500,
                eyebrow: "07:42:08 · CB activates",
                headline: "CreatorBoostAI ingests every lead.",
                subline: "Reads the source · scores intent · matches the right agent.",
                voiceover:
                    "CreatorBoostAI takes over. It reads each lead, scores intent in real time, and assigns the right agent based on territory and capacity.",
                actions: [
                    { id: "ACT-7142", label: "Lead ingested · Zillow", emoji: null },
                    { id: "ACT-7143", label: "Intent scored · 87/100", emoji: null },
                    { id: "ACT-7144", label: "Routed → agent Maria", emoji: null },
                ],
                metrics: [
                    { label: "Leads waiting", value: 0, accent: "emerald" },
                    { label: "First-touch", value: "12s", accent: "emerald" },
                    { label: "Agents on", value: 1, accent: "cyan" },
                ],
            },
            {
                id: "outcome",
                phase: "OUTCOME",
                durationMs: 11000,
                eyebrow: "07:43 · automated outreach",
                headline: "AI sends a personalized SMS + email.",
                subline: "Then it schedules the showing on the agent's calendar.",
                voiceover:
                    "Within seconds, the AI sends a personalized text and email. The buyer replies. CreatorBoostAI books a Saturday showing on Maria's calendar — automatically.",
                actions: [
                    { id: "ACT-7145", label: "SMS sent · personalized" },
                    { id: "ACT-7146", label: "Email sent · property match" },
                    { id: "ACT-7147", label: "Showing booked · Sat 11am" },
                    { id: "ACT-7148", label: "CRM updated · Follow Up Boss" },
                ],
                metrics: [
                    { label: "Replies", value: 4, accent: "emerald" },
                    { label: "Showings booked", value: 3, accent: "emerald" },
                    { label: "Pipeline added", value: "$1.2M", accent: "amber" },
                ],
            },
            {
                id: "position",
                phase: "POSITIONING",
                durationMs: 9000,
                eyebrow: "Layered over your stack",
                headline: "Works across the software you already use.",
                subline: "Follow Up Boss · kvCORE · Yardi · Gmail · DocuSign · Salesforce.",
                voiceover:
                    "CreatorBoostAI doesn't replace your CRM. It works across Follow Up Boss, kvCORE, Yardi, your email, your calendar — every system you already use.",
                actions: [],
                metrics: [],
                stackChips: ["Follow Up Boss", "kvCORE", "Yardi", "Gmail", "DocuSign", "Salesforce", "MLS"],
            },
            {
                id: "thesis",
                phase: "POSITIONING",
                durationMs: 8000,
                eyebrow: "The shift",
                headline: "Your business doesn't need another CRM.",
                subline: "It needs execution.",
                voiceover:
                    "Your business doesn't need another CRM. It needs execution. AI-powered execution across sales, operations, and follow-up.",
                actions: [],
                metrics: [],
            },
            {
                id: "cta",
                phase: "FINAL",
                durationMs: 9000,
                eyebrow: "What's next",
                headline: "See the full system in 13 minutes.",
                subline: FINAL_FRAME_LABEL,
                voiceover:
                    "Want to see the full system in your business? Watch the deeper walkthrough, switch industries, or talk to the AI assistant.",
                actions: [],
                metrics: [],
                isFinal: true,
            },
        ],
        // Behind-the-scenes log surfaced AFTER the demo ends.
        behind_scenes: [
            { id: "ACT-7142", label: "Lead ingested from Zillow webhook", lane: "intake" },
            { id: "ACT-7143", label: "Signal score computed (87 / 100) · Claude reasoning", lane: "ai" },
            { id: "ACT-7144", label: "Territory match → agent Maria (capacity 4/8)", lane: "routing" },
            { id: "ACT-7145", label: "Personalized SMS dispatched · audited", lane: "outreach" },
            { id: "ACT-7146", label: "Property-match email rendered + sent", lane: "outreach" },
            { id: "ACT-7147", label: "Showing slot booked on Maria's calendar", lane: "calendar" },
            { id: "ACT-7148", label: "Follow Up Boss CRM updated · contact + activity", lane: "crm" },
            { id: "ACT-7149", label: "Audit trail entry written · rationale package", lane: "governance" },
        ],
    },

    supermarket: {
        id: "supermarket",
        label: "Grocery / C-Store",
        accent: "emerald",
        full_walkthrough_path: "/demo/supermarket",
        full_walkthrough_label: "Supermarket / C-Store walkthrough · 17 scenes",
        executive_path: "/demo/sita",
        avatar_intro: "Mira · Retail Ops",
        frames: [
            {
                id: "pain",
                phase: "PAIN",
                durationMs: 7500,
                eyebrow: "11:14 PM · Store #14",
                headline: "Cooler #3 is drifting warm.",
                subline: "Nobody on shift owns this. Shrink risk: $4,200.",
                voiceover:
                    "It's 11 PM. Cooler number three is drifting warm. The night crew is busy. Nobody owns this ticket. Forty-two hundred dollars of shrink is on the line.",
                actions: [],
                metrics: [
                    { label: "Cooler temp", value: "47°F", accent: "rose" },
                    { label: "Shrink risk", value: "$4,200", accent: "rose" },
                    { label: "Owner", value: "—", accent: "amber" },
                ],
            },
            {
                id: "activate",
                phase: "ACTIVATION",
                durationMs: 9500,
                eyebrow: "11:14:09 · CB activates",
                headline: "CB detects the fault, opens the ticket, dispatches.",
                subline: "Pulls warranty · matches preferred contractor · ETAs the truck.",
                voiceover:
                    "CreatorBoostAI sees the temperature drift. It opens the ticket, pulls the warranty record, and dispatches the preferred refrigeration contractor — all in twelve seconds.",
                actions: [
                    { id: "OPS-2041", label: "Fault detected · cooler #3" },
                    { id: "OPS-2042", label: "Warranty pulled · 18 mo. left" },
                    { id: "OPS-2043", label: "Contractor dispatched · ETA 38m" },
                ],
                metrics: [
                    { label: "Owner", value: "AI Ops", accent: "emerald" },
                    { label: "ETA on truck", value: "38 min", accent: "cyan" },
                    { label: "Warranty saved", value: "$1,800", accent: "emerald" },
                ],
            },
            {
                id: "outcome",
                phase: "OUTCOME",
                durationMs: 11000,
                eyebrow: "11:52 PM · contractor on site",
                headline: "Truck arrived. Cooler restored. Loss avoided.",
                subline: "Shift manager texted. Audit trail logged. Vendor invoiced.",
                voiceover:
                    "The truck arrives in thirty-eight minutes. Cooler restored. The shift manager gets a clean text. Audit trail is logged. Vendor invoiced. Loss avoided.",
                actions: [
                    { id: "OPS-2044", label: "Contractor on site · resolved" },
                    { id: "OPS-2045", label: "Manager notified via SMS" },
                    { id: "OPS-2046", label: "Audit log written · OPS-2041" },
                    { id: "OPS-2047", label: "Vendor invoice routed · NetSuite" },
                ],
                metrics: [
                    { label: "Cooler temp", value: "36°F", accent: "emerald" },
                    { label: "Loss avoided", value: "$4,200", accent: "emerald" },
                    { label: "Tickets / wk", value: 312, accent: "cyan" },
                ],
            },
            {
                id: "position",
                phase: "POSITIONING",
                durationMs: 9000,
                eyebrow: "Layered over your stack",
                headline: "Works across the software you already use.",
                subline: "NetSuite · Square · ServiceChannel · LightSpeed · IoT sensors.",
                voiceover:
                    "CreatorBoostAI doesn't replace your back-office. It works across NetSuite, your POS, ServiceChannel, your IoT sensors — every system you already use.",
                actions: [],
                metrics: [],
                stackChips: ["NetSuite", "Square POS", "ServiceChannel", "LightSpeed", "Slack", "IoT sensors", "QuickBooks"],
            },
            {
                id: "thesis",
                phase: "POSITIONING",
                durationMs: 8000,
                eyebrow: "The shift",
                headline: "Your business doesn't need another dashboard.",
                subline: "It needs execution.",
                voiceover:
                    "Your business doesn't need another dashboard. It needs execution. AI-powered execution across operations, maintenance, and follow-up.",
                actions: [],
                metrics: [],
            },
            {
                id: "cta",
                phase: "FINAL",
                durationMs: 9000,
                eyebrow: "What's next",
                headline: "See all 17 scenes of the C-Store flow.",
                subline: FINAL_FRAME_LABEL,
                voiceover:
                    "Want to see the full retail operating system? Watch the seventeen-scene walkthrough, switch industries, or talk to the AI assistant.",
                actions: [],
                metrics: [],
                isFinal: true,
            },
        ],
        behind_scenes: [
            { id: "OPS-2041", label: "IoT temperature sensor flagged drift", lane: "intake" },
            { id: "OPS-2042", label: "Warranty record pulled · 18 months left", lane: "ai" },
            { id: "OPS-2043", label: "Preferred contractor dispatched · routed", lane: "routing" },
            { id: "OPS-2044", label: "Contractor check-in · on-site confirmation", lane: "field" },
            { id: "OPS-2045", label: "SMS sent to shift manager · audited", lane: "outreach" },
            { id: "OPS-2046", label: "Audit log written · rationale package", lane: "governance" },
            { id: "OPS-2047", label: "Vendor invoice routed → NetSuite AP", lane: "crm" },
            { id: "OPS-2048", label: "Shrink loss avoided · $4,200 booked", lane: "finance" },
        ],
    },
};

// Industry chips that appear on the homepage hero. Industries marked
// `hookReady=true` route to /demo/quick/:id; others route to the existing
// long-form demo until their hook is built.
export const INDUSTRY_CHIPS = [
    { id: "realtor",     label: "Realtor",     hookReady: true,  fallback: "/demo/realtor" },
    { id: "supermarket", label: "Grocery / C-Store", hookReady: true, fallback: "/demo/supermarket" },
    { id: "contractor",  label: "Contractor",  hookReady: false, fallback: "/demo/realtor" },
    { id: "insurance",   label: "Insurance",   hookReady: false, fallback: "/demo/insurance" },
    { id: "airport",     label: "Airport",     hookReady: false, fallback: "/demo/airport" },
    { id: "startup",     label: "Startup",     hookReady: false, fallback: "/demo/startup" },
    { id: "creator",     label: "Creator",     hookReady: false, fallback: "/demo/creator" },
    { id: "enterprise",  label: "Enterprise",  hookReady: false, fallback: "/demo/noldus" },
];

export const getHookDemo = (id) => HOOK_DEMOS[id] || null;

export default HOOK_DEMOS;
