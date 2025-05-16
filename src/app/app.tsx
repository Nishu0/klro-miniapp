"use client";

import dynamic from "next/dynamic";

// note: dynamic import is required for components that use the Frame SDK
const Header = dynamic(() => import("~/components/Header"), {
  ssr: false,
});

export default function App() {
  return <Header />;
}
