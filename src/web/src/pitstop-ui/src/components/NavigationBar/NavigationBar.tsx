import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faGasPump,
  faChartLine,
  faCar,
  faHome,
  faLocationDot,
  faSignInAlt,
  faSignOutAlt,
  faUser,
  faAnglesLeft,
  faAnglesRight,
} from "@fortawesome/free-solid-svg-icons";
import { Sidebar } from "primereact/sidebar";
import { useAuth, usePageTitle } from "../../context";

interface NavigationBarProps {
  brand?: string;
}

interface NavItem {
  label: string;
  icon: typeof faHome;
  to: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: faHome, to: "/" },
  { label: "Vehicles", icon: faCar, to: "/vehicles" },
  { label: "Fill-Ups", icon: faGasPump, to: "/fill-ups" },
  { label: "Locations", icon: faLocationDot, to: "/locations" },
  { label: "Analytics", icon: faChartLine, to: "/analytics" },
];

export const NavigationBar: React.FC<NavigationBarProps> = ({ brand }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { isAuthenticated, user, login, logout } = useAuth();
  const navigate = useNavigate();
  const brandName = brand ?? "PitStop";
  const userName = user?.name;
  const pageTitle = usePageTitle();
  const mobileTitle = pageTitle ?? brandName;

  const navLinkClass = (isActive: boolean, isCollapsed: boolean) =>
    [
      "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
      "min-h-[44px] no-underline",
      isCollapsed ? "justify-center px-2" : "px-3",
      isActive
        ? "bg-brand text-brand-fg"
        : "text-content-inverse/80 hover:text-content-inverse hover:bg-white/5",
    ].join(" ");

  /* ------------------------- Desktop sidebar ------------------------- */

  const desktopSidebar = (
    <aside
      className={[
        "hidden lg:flex flex-col bg-surface-inverse text-content-inverse",
        "sticky top-0 h-screen shrink-0 border-r border-white/5",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-60",
      ].join(" ")}
      aria-label="Primary"
    >
      {/* Brand */}
      <button
        type="button"
        onClick={() => navigate("/")}
        className={[
          "flex items-center gap-2 px-3 h-16 border-b border-white/5",
          "bg-transparent text-content-inverse cursor-pointer",
          collapsed ? "justify-center" : "",
        ].join(" ")}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-brand-fg">
          <FontAwesomeIcon icon={faGasPump} className="text-lg" />
        </span>
        {!collapsed && (
          <span className="font-display text-xl uppercase tracking-wider">
            {brandName}
          </span>
        )}
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => navLinkClass(isActive, collapsed)}
            title={collapsed ? item.label : undefined}
          >
            <FontAwesomeIcon icon={item.icon} className="text-base shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer: user + collapse toggle */}
      <div className="border-t border-white/5 px-2 py-3 space-y-1">
        {isAuthenticated ? (
          <>
            {!collapsed && (
              <div className="px-3 pb-1 text-meta uppercase tracking-wide text-content-inverse/50">
                Signed in
              </div>
            )}
            <div
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2",
                collapsed ? "justify-center px-2" : "",
              ].join(" ")}
              title={collapsed ? (userName ?? "Account") : undefined}
            >
              <FontAwesomeIcon icon={faUser} className="text-content-inverse/70" />
              {!collapsed && (
                <span className="truncate text-sm">{userName ?? "Account"}</span>
              )}
            </div>
            <button
              type="button"
              onClick={logout}
              className={[
                "w-full flex items-center gap-3 rounded-lg text-sm font-medium",
                "min-h-[44px] text-content-inverse/80 hover:text-content-inverse",
                "hover:bg-white/5 bg-transparent border-0 cursor-pointer",
                collapsed ? "justify-center px-2" : "px-3",
              ].join(" ")}
              title={collapsed ? "Sign out" : undefined}
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
              {!collapsed && <span>Sign out</span>}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={login}
            className={[
              "w-full flex items-center gap-3 rounded-lg text-sm font-medium",
              "min-h-[44px] text-content-inverse hover:bg-white/5",
              "bg-transparent border-0 cursor-pointer",
              collapsed ? "justify-center px-2" : "px-3",
            ].join(" ")}
            title={collapsed ? "Sign in" : undefined}
          >
            <FontAwesomeIcon icon={faSignInAlt} />
            {!collapsed && <span>Sign in</span>}
          </button>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className={[
            "w-full flex items-center gap-3 rounded-lg text-sm",
            "min-h-[40px] text-content-inverse/60 hover:text-content-inverse",
            "hover:bg-white/5 bg-transparent border-0 cursor-pointer",
            collapsed ? "justify-center px-2" : "px-3",
          ].join(" ")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <FontAwesomeIcon icon={collapsed ? faAnglesRight : faAnglesLeft} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );

  /* ------------------------- Mobile top bar ------------------------- */

  const mobileTopBar = (
    <div className="lg:hidden sticky top-0 z-30 bg-surface-inverse text-content-inverse">
      <div className="flex items-center h-14 px-3 gap-2">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="h-11 w-11 flex items-center justify-center rounded-md hover:bg-white/10 active:bg-white/15 bg-transparent border-0 cursor-pointer text-content-inverse shrink-0"
          aria-label="Open menu"
        >
          <FontAwesomeIcon icon={faBars} className="text-lg" />
        </button>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-brand-fg border-0 cursor-pointer shrink-0 p-0"
          aria-label="Home"
        >
          <FontAwesomeIcon icon={faGasPump} className="text-base" />
        </button>
        <h1 className="font-display text-lg uppercase tracking-wider leading-none truncate min-w-0">
          {mobileTitle}
        </h1>
      </div>
    </div>
  );

  /* ------------------------- Mobile drawer ------------------------- */

  const drawerRowClass =
    "w-full flex items-center gap-3 px-3 min-h-[48px] rounded-lg text-base font-medium no-underline bg-transparent border-0 cursor-pointer text-content hover:bg-surface-muted";

  const mobileDrawer = (
    <Sidebar
      visible={drawerOpen}
      onHide={() => setDrawerOpen(false)}
      position="left"
      className="w-72"
      showCloseIcon
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-brand-fg">
          <FontAwesomeIcon icon={faGasPump} className="text-lg" />
        </span>
        <span className="font-display text-xl uppercase tracking-wider">
          {brandName}
        </span>
      </div>
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={() => setDrawerOpen(false)}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 px-3 min-h-[48px] rounded-lg text-base font-medium no-underline",
                isActive
                  ? "bg-brand text-brand-fg"
                  : "text-content hover:bg-surface-muted",
              ].join(" ")
            }
          >
            <FontAwesomeIcon icon={item.icon} className="w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <hr className="my-4 border-border" />
      {isAuthenticated ? (
        <>
          {userName && (
            <div className="flex items-center gap-3 px-3 min-h-[48px] text-sm text-content-muted">
              <FontAwesomeIcon icon={faUser} className="w-5" />
              <span className="truncate">{userName}</span>
            </div>
          )}
          <button
            type="button"
            className={drawerRowClass}
            onClick={() => {
              logout();
              setDrawerOpen(false);
            }}
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="w-5" />
            <span>Sign out</span>
          </button>
        </>
      ) : (
        <button
          type="button"
          className={drawerRowClass}
          onClick={() => {
            login();
            setDrawerOpen(false);
          }}
        >
          <FontAwesomeIcon icon={faSignInAlt} className="w-5" />
          <span>Sign in</span>
        </button>
      )}
    </Sidebar>
  );

  return (
    <>
      {desktopSidebar}
      {mobileTopBar}
      {mobileDrawer}
    </>
  );
};
