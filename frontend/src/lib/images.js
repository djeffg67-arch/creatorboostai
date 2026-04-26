/**
 * Curated Unsplash CDN imagery for the CreatorBoostAI™ + BodyIQ-AI™ platform.
 * All URLs use Unsplash's auto-format/optimize params for fast delivery.
 *
 * Aesthetic: real-world business + creator-economy lifestyle photography that
 * matches the dark navy + cyan accent palette. Images are used as background
 * layers (with dark gradient overlays) and tile thumbnails.
 */

const u = (id, w = 1600, q = 70) =>
    `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=${q}`;

// Page hero backgrounds (wide aspect, faded + gradient overlay)
export const PAGE_HERO = {
    home: u("photo-1556761175-5973dc0f32e7", 2000, 75),
    pricing: u("photo-1554224155-6726b3ff858f", 1800, 70),       // financial / charts
    apply: u("photo-1521737604893-d14cc237f11d", 1800, 70),       // team meeting
    contact: u("photo-1499951360447-b19be8fe80f5", 1800, 70),     // mac keyboard, communication
    preview: u("photo-1551288049-bebda4e38f71", 1800, 70),        // analytics dashboard
    portal: u("photo-1563986768609-322da13575f3", 1800, 70),      // workspace / login feel
    thankyou: u("photo-1492684223066-81342ee5ff30", 1800, 70),    // crowd / celebration
    press: u("photo-1497366216548-37526070297c", 1800, 70),       // corporate office
    forensic: u("photo-1532102235608-dc8fc689c9ab", 1800, 70),    // book / studious
    training: u("photo-1517245386807-bb43f82c33c4", 1800, 70),    // mentorship
    verticalPicker: u("photo-1573164713988-8665fc963095", 1800, 70), // city skyline / multi-industry
    demoVerticals: u("photo-1497215842964-222b430dc094", 1800, 70),  // boardroom
};

// Per-industry tile thumbnails (16:9, mid quality)
export const INDUSTRY_IMG = {
    "real-estate":   u("photo-1568605114967-8130f3a36994", 1200, 65),  // modern home
    insurance:       u("photo-1450101499163-c8848c66ca85", 1200, 65),  // executive desk
    creators:        u("photo-1542038784456-1ea8e935640e", 1200, 65),  // phone filming
    retail:          u("photo-1528698827591-e19ccd7bc23d", 1200, 65),  // grocery store
    airports:        u("photo-1436491865332-7a61a109cc05", 1200, 65),  // plane on runway
    contractors:     u("photo-1581094794329-c8112a89af12", 1200, 65),  // construction crew
    enterprise:      u("photo-1497215842964-222b430dc094", 1200, 65),  // boardroom
};

// Demo selector card thumbnails (16:9)
export const DEMO_IMG = {
    realtor:    u("photo-1600596542815-ffad4c1539a9", 1200, 65),  // open house front
    insurance:  u("photo-1450101499163-c8848c66ca85", 1200, 65),  // policy desk
    creator:    u("photo-1598550476439-6847785fcea6", 1200, 65),  // creator studio
    airports:   u("photo-1436491865332-7a61a109cc05", 1200, 65),  // airport
};

// Background accents (used as opacity-15 layers with gradient masks)
export const SECTION_BG = {
    industries:    u("photo-1521737604893-d14cc237f11d", 1800, 65), // diverse team
    integrations:  u("photo-1518770660439-4636190af475", 1800, 65), // circuit board
    demoSelector:  u("photo-1492684223066-81342ee5ff30", 1800, 65), // event crowd
    cta:           u("photo-1496564203457-11bb12075d90", 1800, 65), // skyline
};
