import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "../components/Header";
import { CameraTool } from "./Tools";

export default function CameraStandalone() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10" data-testid="camera-standalone-page">
        <div className="mb-6">
          <Link to="/studio?tab=camera" className="text-sm inline-flex items-center gap-2 text-gray-600 hover:text-ink" data-testid="camera-back-studio">
            <ArrowLeft size={14} /> Back to Studio
          </Link>
        </div>
        <CameraTool standalone />
      </main>
    </div>
  );
}
