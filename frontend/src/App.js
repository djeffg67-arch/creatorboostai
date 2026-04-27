import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import HomePage from "@/pages/HomePage";
import DemoPage from "@/pages/DemoPage";
import TrainingPage from "@/pages/TrainingPage";
import ThankYouPage from "@/pages/ThankYouPage";
import ForensicLibraryPage from "@/pages/ForensicLibraryPage";
import ContactPage from "@/pages/ContactPage";
import AdminPage from "@/pages/AdminPage";
import RealtorDemoPage from "@/pages/RealtorDemoPage";
import InsuranceDemoPage from "@/pages/InsuranceDemoPage";
import CreatorDemoPage from "@/pages/CreatorDemoPage";
import VerticalPickerPage from "@/pages/VerticalPickerPage";
import PressPage from "@/pages/PressPage";
import ApplyPage from "@/pages/ApplyPage";
import PricingPage from "@/pages/PricingPage";
import PortalPage from "@/pages/PortalPage";
import FounderPage from "@/pages/FounderPage";
import PreviewPage from "@/pages/PreviewPage";
import SignalPackPage from "@/pages/SignalPackPage";
import AuditPage from "@/pages/AuditPage";
import ReportPage from "@/pages/ReportPage";
import JuryPage from "@/pages/JuryPage";
import DownloadSignalPackPage from "@/pages/DownloadSignalPackPage";

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/demo" element={<VerticalPickerPage />} />
                    <Route path="/demo/realtor" element={<RealtorDemoPage />} />
                    <Route path="/demo/insurance" element={<InsuranceDemoPage />} />
                    <Route path="/demo/creator" element={<CreatorDemoPage />} />
                    <Route path="/demo/influencer" element={<CreatorDemoPage />} />
                    <Route path="/demo/:variant" element={<DemoPage />} />
                    <Route path="/press" element={<PressPage />} />
                    <Route path="/training" element={<TrainingPage />} />
                    <Route path="/apply/:program" element={<ApplyPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/portal" element={<PortalPage />} />
                    <Route path="/founder" element={<FounderPage />} />
                    <Route path="/preview" element={<PreviewPage />} />
                    <Route path="/cb-preview" element={<PreviewPage />} />
                    <Route path="/products/signal-pack" element={<SignalPackPage />} />
                    <Route path="/services/audit" element={<AuditPage />} />
                    <Route path="/services/report" element={<ReportPage />} />
                    <Route path="/services/jury" element={<JuryPage />} />
                    <Route path="/download/signal-pack" element={<DownloadSignalPackPage />} />
                    <Route path="/thank-you" element={<ThankYouPage />} />
                    <Route path="/forensic-library" element={<ForensicLibraryPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="*" element={<HomePage />} />
                </Routes>
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
