import React from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export const Layout = ({ children, hideFooter = false }) => (
    <div className="flex min-h-screen flex-col bg-ink-800">
        <Navbar />
        <main className="flex-1">{children}</main>
        {!hideFooter && <Footer />}
    </div>
);
