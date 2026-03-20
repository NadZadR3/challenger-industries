"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Repeat } from "lucide-react";

export default function RecurringPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring Invoices"
        description="Manage recurring invoice templates"
      />
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
            <Repeat className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold">Coming Soon</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm text-center">
            Recurring invoice templates will let you automate billing on weekly, monthly, or custom schedules.
          </p>
          <Badge variant="outline" className="mt-4 text-xs">Phase 4</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
