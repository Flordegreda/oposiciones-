import { NextResponse } from "next/server";
import { buildFullBackup } from "@/lib/queries/export";

export async function GET() {
  try {
    const backup = await buildFullBackup();
    const filename = `oposiciones-jex-backup-${backup.exportedAt.slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al exportar" },
      { status: 500 },
    );
  }
}
