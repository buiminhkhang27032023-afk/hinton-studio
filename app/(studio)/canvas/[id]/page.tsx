"use client";

import { useParams } from "next/navigation";
import { CanvasScreen } from "@/components/canvas/canvas-screen";

export default function CanvasPage() {
  const params = useParams<{ id: string }>();
  return <CanvasScreen projectId={params?.id} />;
}
