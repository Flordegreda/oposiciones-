import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { revalidateAllCaches, revalidateAppPaths } from "@/lib/revalidate-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    revalidateAllCaches();
    revalidateAppPaths();
    revalidatePath("/fichas", "layout");

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
