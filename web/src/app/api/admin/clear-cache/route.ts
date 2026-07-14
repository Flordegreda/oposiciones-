import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { revalidateAllCaches } from "@/lib/revalidate-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PATHS = ["/admin", "/practicar", "/simulacro"] as const;

export async function POST() {
  try {
    revalidateAllCaches();
    for (const path of PATHS) {
      revalidatePath(path);
    }

    return NextResponse.json({
      message: "Caché del servidor limpiada. Los datos se volverán a cargar desde Supabase.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al limpiar caché" },
      { status: 500 },
    );
  }
}
