import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGasPump,
  faChartLine,
  faCar,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "primereact/button";
import { useAuth } from "../../context";

export const Landing: React.FC = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-surface-muted text-content flex flex-col">
      {/* Top bar */}
      <header className="bg-surface-inverse text-content-inverse">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-brand-fg">
            <FontAwesomeIcon icon={faGasPump} className="text-lg" />
          </span>
          <span className="font-display text-2xl uppercase tracking-wider">
            PitStop
          </span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center">
        <div className="w-full max-w-6xl mx-auto px-4 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="font-display uppercase tracking-widest text-brand text-sm mb-4">
                Fuel · Mileage · Spend
              </p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl uppercase tracking-wide leading-tight mb-4">
                Track every drop.
                <br />
                Own every mile.
              </h1>
              <p className="text-lg text-content-muted mb-8 max-w-md">
                Log fill-ups, watch your MPG trend, and see exactly what your
                vehicles cost to drive.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  label="Sign In"
                  icon={
                    <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                  }
                  iconPos="right"
                  onClick={login}
                  className="p-button-lg"
                />
                <Button
                  label="Create an Account"
                  onClick={login}
                  className="p-button-lg p-button-outlined"
                />
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FeatureCard
                icon={faCar}
                title="Multi-Vehicle"
                body="Manage every vehicle in one place — sedan, truck, motorcycle."
              />
              <FeatureCard
                icon={faGasPump}
                title="Fill-Up Log"
                body="Capture date, gallons, price, and station for every fill."
              />
              <FeatureCard
                icon={faChartLine}
                title="MPG Trends"
                body="See how efficiency moves over time, not just a single tank."
                accent
              />
              <FeatureCard
                icon={faChartLine}
                title="Spend Insights"
                body="Cost per mile, monthly spend, and station breakdowns."
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-14 flex items-center text-sm text-content-muted">
          PitStop
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: typeof faCar;
  title: string;
  body: string;
  accent?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  body,
  accent,
}) => (
  <div
    className={[
      "rounded-xl p-5 border",
      accent
        ? "bg-brand-tint border-brand/20"
        : "bg-surface border-border",
    ].join(" ")}
  >
    <span
      className={[
        "inline-flex h-10 w-10 items-center justify-center rounded-md mb-3",
        accent ? "bg-brand text-brand-fg" : "bg-surface-sunken text-content",
      ].join(" ")}
    >
      <FontAwesomeIcon icon={icon} className="text-lg" />
    </span>
    <h3 className="font-display text-lg uppercase tracking-wide mb-1">
      {title}
    </h3>
    <p className="text-sm text-content-muted">{body}</p>
  </div>
);
