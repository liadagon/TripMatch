import { Heart, Home, Map, MessageCircle, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { createProfileNavigationState } from "../utils/profileNavigation";
import "./NavigationBar.css";

const navigationItems = [
  {
    label: "Home",
    path: "/discover",
    icon: Home,
    isActive: (pathname: string) => pathname.startsWith("/discover"),
  },
  {
    label: "Likes",
    path: "/likes",
    icon: Heart,
    isActive: (pathname: string) => pathname.startsWith("/likes"),
  },
  {
    label: "Messages",
    path: "/matches",
    icon: MessageCircle,
    isActive: (pathname: string) =>
      pathname === "/matches" ||
      pathname.startsWith("/messages") ||
      pathname.startsWith("/chat"),
  },
  {
    label: "מפת התאמות",
    path: "/matches-map",
    icon: Map,
    isActive: (pathname: string) => pathname === "/matches-map",
  },
  {
    label: "Profile",
    path: "/profile",
    icon: UserRound,
    isActive: (pathname: string) =>
      pathname.startsWith("/profile") || pathname.startsWith("/blocked-users"),
  },
];

const routesWithoutNavigation = new Set([
  "/phone-login",
  "/verify-code",
  "/register",
  "/questionnaire",
]);

export default function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();

  if (routesWithoutNavigation.has(location.pathname)) {
    return null;
  }

  return (
    <nav className="tripmatch-nav" aria-label="TripMatch navigation" dir="rtl">
      <div className="tripmatch-nav-inner">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive(location.pathname);

          return (
            <button
              key={item.path}
              type="button"
              className={active ? "tripmatch-nav-button active" : "tripmatch-nav-button"}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              title={item.label}
              onClick={() =>
                navigate(item.path, {
                  state: item.path === "/profile"
                    ? createProfileNavigationState(location)
                    : undefined,
                })
              }
            >
              <Icon size={24} strokeWidth={2.45} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
