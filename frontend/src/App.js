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
import VerticalPickerPage from "@/pages/VerticalPickerPage";

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/demo" element={<VerticalPickerPage />} />
                    <Route path="/demo/realtor" element={<RealtorDemoPage />} />
                    <Route path="/demo/insurance" element={<InsuranceDemoPage />} />
                    <Route path="/demo/:variant" element={<DemoPage />} />
                    <Route path="/training" element={<TrainingPage />} />
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
