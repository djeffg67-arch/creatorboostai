import React from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export const Layout = ({ children, hideFooter = false }) => (
    <div className="relative flex min-h-screen flex-col bg-ink-800">
        <div className="aurora-bg" aria-hidden="true" />
        <div className="aurora-grid" aria-hidden="true" />
        <Navbar />
        <main className="flex-1">{children}</main>
        {!hideFooter && <Footer />}
    </div>
);
