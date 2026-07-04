import { Heart, Home, MessageCircle, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
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
      pathname.startsWith("/matches") ||
      pathname.startsWith("/messages") ||
      pathname.startsWith("/chat"),
  },
  {
    label: "Profile",
    path: "/profile",
    icon: UserRound,
    isActive: (pathname: string) => pathname.startsWith("/profile"),
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
              onClick={() => navigate(item.path)}
            >
              <Icon size={24} strokeWidth={2.45} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
