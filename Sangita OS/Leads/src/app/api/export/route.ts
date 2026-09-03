import { NextResponse } from "next/server";
import { getStoredLeads } from "@/lib/lead-store";
import { parseFiltersFromSearchParams } from "@/lib/request";
import { buildFilteredLeads, leadsToCsv, leadsToExcelBuffer } from "@/lib/export";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format");
    if (format !== "csv" && format !== "xlsx") {
      return NextResponse.json({ error: "format must be csv or xlsx." }, { status: 400 });
    }

    const filters = parseFiltersFromSearchParams(url.searchParams);
    const leads = await getStoredLeads();
    const filtered = buildFilteredLeads(leads, filters);

    if (format === "csv") {
      const csv = leadsToCsv(filtered);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="swiftgrowthdigital-leads.csv"',
        },
      });
    }

    const buffer = leadsToExcelBuffer(filtered);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="swiftgrowthdigital-leads.xlsx"',
      },
    });
  } catch (error) {
    console.error("EXPORT_ERROR", error);
    return NextResponse.json(
      { error: "Unable to export leads. Please try again." },
      { status: 500 },
    );
  }
}
