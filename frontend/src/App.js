import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/site/ErrorBoundary";

import HomePage from "@/pages/HomePage";
import DemoPage from "@/pages/DemoPage";
import TrainingPage from "@/pages/TrainingPage";
import ThankYouPage from "@/pages/ThankYouPage";
import SuccessPage from "@/pages/SuccessPage";
import CancelPage from "@/pages/CancelPage";
import ForensicLibraryPage from "@/pages/ForensicLibraryPage";
import ContactPage from "@/pages/ContactPage";
import AdminPage from "@/pages/AdminPage";
import RealtorDemoPage from "@/pages/RealtorDemoPage";
import InsuranceDemoPage from "@/pages/InsuranceDemoPage";
import CreatorDemoPage from "@/pages/CreatorDemoPage";
import NoldusDemoPage from "@/pages/NoldusDemoPage";
import SitaDemoPage from "@/pages/SitaDemoPage";
import AirportDemoPage from "@/pages/AirportDemoPage";
import SupermarketDemoPage from "@/pages/SupermarketDemoPage";
import SchoolDistrictDemoPage from "@/pages/SchoolDistrictDemoPage";
import VerticalPickerPage from "@/pages/VerticalPickerPage";
import PressPage from "@/pages/PressPage";
import ApplyPage from "@/pages/ApplyPage";
import EngagementApplyPage from "@/pages/EngagementApplyPage";
import PricingPage from "@/pages/PricingPage";
import PortalPage from "@/pages/PortalPage";
import FounderPage from "@/pages/FounderPage";
import PreviewPage from "@/pages/PreviewPage";
import SignalPackPage from "@/pages/SignalPackPage";
import AuditPage from "@/pages/AuditPage";
import ReportPage from "@/pages/ReportPage";
import JuryPage from "@/pages/JuryPage";
import DownloadSignalPackPage from "@/pages/DownloadSignalPackPage";
import LightingUpgradeEnginePage from "@/pages/LightingUpgradeEnginePage";
import KoolliteROIPage from "@/pages/KoolliteROIPage";
import MasterNarrationScriptsPage from "@/pages/MasterNarrationScriptsPage";
import PortalLightingPage from "@/pages/PortalLightingPage";
import PortalOpsPage from "@/pages/PortalOpsPage";
import StartEnginePage from "@/pages/StartEnginePage";
import ClientPortalPage from "@/pages/ClientPortalPage";
import StartupLandingPage from "@/pages/StartupLandingPage";
import StartupDemoPage from "@/pages/StartupDemoPage";
import BusinessBuilderPage from "@/pages/BusinessBuilderPage";
import WebsiteBuilderPage from "@/pages/WebsiteBuilderPage";
import PublishedSitePage from "@/pages/PublishedSitePage";
import HookDemoPage from "@/pages/HookDemoPage";
import MobileOpsPage from "@/pages/MobileOpsPage";
import AccessLinkPage from "@/pages/AccessLinkPage";
import TeamAccessPage from "@/pages/TeamAccessPage";
import PortalMagicPage from "@/pages/PortalMagicPage";

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <ErrorBoundary>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/demo" element={<VerticalPickerPage />} />
                    <Route path="/demo/quick/:industry" element={<HookDemoPage />} />
                    <Route path="/m/ops" element={<MobileOpsPage />} />
                    <Route path="/demo/realtor" element={<RealtorDemoPage />} />
                    <Route path="/demo/insurance" element={<InsuranceDemoPage />} />
                    <Route path="/demo/creator" element={<CreatorDemoPage />} />
                    <Route path="/demo/influencer" element={<CreatorDemoPage />} />
                    <Route path="/demo/noldus" element={<NoldusDemoPage />} />
                    <Route path="/demo/enterprise" element={<NoldusDemoPage />} />
                    <Route path="/demo/sita" element={<SitaDemoPage />} />
                    <Route path="/demo/airport" element={<AirportDemoPage />} />
                    <Route path="/demo/airports" element={<AirportDemoPage />} />
                    <Route path="/demo/supermarket" element={<SupermarketDemoPage />} />
                    <Route path="/demo/education" element={<SchoolDistrictDemoPage />} />
                    <Route path="/demo/school" element={<SchoolDistrictDemoPage />} />
                    <Route path="/demo/schools" element={<SchoolDistrictDemoPage />} />
                    <Route path="/demo/k12" element={<SchoolDistrictDemoPage />} />
                    <Route path="/demo/retail" element={<SupermarketDemoPage />} />
                    <Route path="/demo/c-store" element={<SupermarketDemoPage />} />
                    <Route path="/demo/grocery" element={<SupermarketDemoPage />} />
                    <Route path="/demo/:variant" element={<DemoPage />} />
                    <Route path="/press" element={<PressPage />} />
                    <Route path="/training" element={<TrainingPage />} />
                    <Route path="/apply" element={<EngagementApplyPage />} />
                    <Route path="/apply/:program" element={<ApplyPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/portal" element={<PortalPage />} />
                    <Route path="/portal/magic" element={<PortalMagicPage />} />
                    <Route path="/founder" element={<FounderPage />} />
                    <Route path="/preview" element={<PreviewPage />} />
                    <Route path="/cb-preview" element={<PreviewPage />} />
                    <Route path="/products/signal-pack" element={<SignalPackPage />} />
                    <Route path="/services/audit" element={<AuditPage />} />
                    <Route path="/services/report" element={<ReportPage />} />
                    <Route path="/services/jury" element={<JuryPage />} />
                    <Route path="/download/signal-pack" element={<DownloadSignalPackPage />} />
                    <Route path="/lighting-upgrade-engine" element={<LightingUpgradeEnginePage />} />
                    <Route path="/lighting" element={<LightingUpgradeEnginePage />} />
                    <Route path="/koollite/roi" element={<KoolliteROIPage />} />
                    <Route path="/koollite" element={<KoolliteROIPage />} />
                    <Route path="/roi" element={<KoolliteROIPage />} />
                    <Route path="/lighting/roi" element={<KoolliteROIPage />} />
                    <Route path="/scripts" element={<MasterNarrationScriptsPage />} />
                    <Route path="/portal/scripts" element={<MasterNarrationScriptsPage />} />
                    <Route path="/master-narration" element={<MasterNarrationScriptsPage />} />
                    <Route path="/portal/lighting" element={<PortalLightingPage />} />
                    <Route path="/portal/ops" element={<PortalOpsPage />} />
                    <Route path="/start-engine" element={<StartEnginePage />} />
                    <Route path="/startup" element={<StartupLandingPage />} />
                    <Route path="/demo/startup" element={<StartupDemoPage />} />
                    <Route path="/portal/builder" element={<BusinessBuilderPage />} />
                    <Route path="/portal/website-builder" element={<WebsiteBuilderPage />} />
                    <Route path="/p/:slug" element={<PublishedSitePage />} />
                    <Route path="/portal/client/:client_id" element={<ClientPortalPage />} />
                    <Route path="/founder-access" element={<AccessLinkPage mode="founder" />} />
                    <Route path="/executive-access" element={<AccessLinkPage mode="executive" />} />
                    <Route path="/employee-access" element={<AccessLinkPage mode="employee" />} />
                    <Route path="/team-access" element={<TeamAccessPage />} />
                    <Route path="/success" element={<SuccessPage />} />
                    <Route path="/cancel" element={<CancelPage />} />
                    <Route path="/thank-you" element={<ThankYouPage />} />
                    <Route path="/forensic-library" element={<ForensicLibraryPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="*" element={<HomePage />} />
                </Routes>
                </ErrorBoundary>
                <Toaster
                    theme="dark"
                    position="bottom-right"
                    toastOptions={{
                        style: {
                            background: "#0F172A",
                            color: "#F8FAFC",
                            border: "1px solid rgba(6, 182, 212, 0.25)",
                        },
                    }}
                />
            </BrowserRouter>
        </div>
    );
}

export default App;
