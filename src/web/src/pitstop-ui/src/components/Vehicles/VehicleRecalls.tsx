import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation, faCircleCheck, faBan } from "@fortawesome/free-solid-svg-icons";
import { Card } from "primereact/card";
import { ProgressSpinner } from "primereact/progressspinner";
import { useAppSelector } from "../../store/hooks";
import { vehiclesApi } from "../../api/vehiclesApi";
import type { RecallDto } from "../../api/generated/types.gen";
import { PageHeader } from "../layout/PageHeader";
import { formatVehicleLabel } from "../../utils/vehicle";

const RecallBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 text-danger text-xs font-medium px-2 py-0.5">
    <FontAwesomeIcon icon={faBan} />
    {label}
  </span>
);

const PrePurchaseBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-content-muted/10 text-content-muted text-xs font-medium px-2 py-0.5">
    Reported before purchase
  </span>
);

const formatRecallDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

const RecallCard: React.FC<{ recall: RecallDto; precedesPurchase: boolean }> = ({ recall, precedesPurchase }) => {
  const formattedDate = formatRecallDate(recall.reportedDate);
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="font-display text-sm uppercase tracking-wide text-content-muted">
            Campaign {recall.campaignNumber}
            {formattedDate && <> &middot; {formattedDate}</>}
          </p>
          <p className="font-medium">{recall.component}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {precedesPurchase && <PrePurchaseBadge />}
          {recall.parkIt && <RecallBadge label="Park It" />}
          {recall.parkOutside && <RecallBadge label="Park Outside" />}
        </div>
      </div>
      <dl className="space-y-3 text-sm">
        {recall.summary && (
          <div>
            <dt className="text-content-muted mb-1">Summary</dt>
            <dd>{recall.summary}</dd>
          </div>
        )}
        {recall.consequence && (
          <div>
            <dt className="text-content-muted mb-1">Consequence</dt>
            <dd>{recall.consequence}</dd>
          </div>
        )}
        {recall.remedy && (
          <div>
            <dt className="text-content-muted mb-1">Remedy</dt>
            <dd>{recall.remedy}</dd>
          </div>
        )}
        {recall.notes && (
          <div>
            <dt className="text-content-muted mb-1">Notes</dt>
            <dd className="text-content-muted">{recall.notes}</dd>
          </div>
        )}
      </dl>
    </Card>
  );
};

export const VehicleRecalls: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const vehicle = useAppSelector((s) => s.vehicles.vehicles.find((v) => String(v.id) === id));

  const [recalls, setRecalls] = useState<RecallDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const vehicleExists = vehicle != null;

  useEffect(() => {
    if (id == null || !vehicleExists) return;
    setLoading(true);
    setError(null);
    vehiclesApi
      .recalls(Number(id))
      .then(setRecalls)
      .catch(() => setError("Unable to load recalls for this vehicle. Please try again later."))
      .finally(() => setLoading(false));
  }, [id, vehicleExists]);

  const vehicleLabel = vehicle ? formatVehicleLabel(vehicle) : undefined;

  if (!vehicle) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <PageHeader title="Recalls" />
        <Card>
          <p className="text-content-muted">Vehicle not found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <PageHeader title="Recalls" subtitle={vehicleLabel} />

      {loading && (
        <div className="flex justify-center py-12">
          <ProgressSpinner />
        </div>
      )}

      {!loading && error && (
        <Card>
          <div className="text-center py-8 text-content-muted">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-3xl mb-3" />
            <p>{error}</p>
          </div>
        </Card>
      )}

      {!loading && !error && recalls.length === 0 && (
        <Card>
          <div className="text-center py-8 text-content-muted">
            <FontAwesomeIcon icon={faCircleCheck} className="text-3xl mb-3 text-success" />
            <p>No open recalls for this vehicle.</p>
          </div>
        </Card>
      )}

      {!loading && !error && recalls.length > 0 && (
        <div className="space-y-3">
          {recalls.map((recall) => (
            <RecallCard
              key={recall.campaignNumber}
              recall={recall}
              precedesPurchase={
                recall.reportedDate != null && vehicle.startDate != null && recall.reportedDate < vehicle.startDate
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};
