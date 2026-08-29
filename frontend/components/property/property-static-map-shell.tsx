"use client";

import dynamic from "next/dynamic";

const PropertyStaticMap = dynamic(() => import("@/components/property/property-static-map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-72 place-items-center bg-sand-200/60 text-sm font-bold text-sand-700 sm:h-80">
      Loading location map…
    </div>
  ),
});

type PropertyStaticMapShellProps = {
  latitude: number;
  longitude: number;
  title: string;
};

export function PropertyStaticMapShell(props: PropertyStaticMapShellProps) {
  return <PropertyStaticMap {...props} />;
}
