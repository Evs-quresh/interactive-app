import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import InteractiveMediaAdminPreview from "../interactive_media_admin_react_preview.jsx";

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <InteractiveMediaAdminPreview />
  </React.StrictMode>
);
