import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  ProfilePreviewView,
} from "./MyProfilePreview";
import type { ProfilePreviewUser } from "../services/authService";
import {
  getMatchedProfile,
  type MatchedProfileData,
} from "../services/matchService";
import { getDemoProfile } from "../data/demoProfiles";
import { getDemoMatchedUserIds } from "../services/demoConversationState";
import { calculateProfileCompatibility } from "../utils/profileCompatibility";
import { useAuth } from "../context/AuthContext";
import { getSafeProfileReturnPath } from "../utils/profileNavigation";

/** Builds the matched-profile view model for an account-visible demo match. */
function getDemoMatchedProfile(profile: ProfilePreviewUser, currentUser: Parameters<typeof calculateProfileCompatibility>[0]): MatchedProfileData {
  return {
    profile,
    compatibility: calculateProfileCompatibility(currentUser, profile),
    conversationId: profile._id.replace(/^demo-/, ""),
  };
}

/** Loads a profile only when the current account has a corresponding match. */
export default function MatchedProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState<MatchedProfileData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const returnTarget = getSafeProfileReturnPath(location.state) || "/discover";
  const handleBack = () => navigate(returnTarget, { replace: true });

  useEffect(() => {
    let isActive = true;

    /** Loads only the real or demo profile authorized by the current match. */
    async function loadProfile() {
      setData(null);
      setErrorMessage("");

      const demoProfile = getDemoProfile(userId);

      if (demoProfile) {
        if (!getDemoMatchedUserIds(user?._id).includes(demoProfile.userId)) {
          setErrorMessage("הפרופיל זמין רק לאחר התאמה הדדית");
          return;
        }
        setData(getDemoMatchedProfile(demoProfile, user || {}));
        return;
      }

      if (!userId) {
        setErrorMessage("לא נמצא פרופיל להצגה");
        return;
      }

      try {
        const matchedProfile = await getMatchedProfile(userId);
        if (isActive) setData(matchedProfile);
      } catch (error) {
        console.warn("[Matched profile] Access denied or profile unavailable.", {
          status: axios.isAxiosError(error) ? error.response?.status : undefined,
          message: error instanceof Error ? error.message : "Unknown error",
        });
        if (isActive) {
          setErrorMessage(
            axios.isAxiosError(error) && error.response?.status === 403
              ? "הפרופיל זמין רק במסגרת התאמה פעילה ולא חסומה"
              : "לא הצלחנו לטעון את הפרופיל המלא",
          );
        }
      }
    }

    void loadProfile();
    return () => {
      isActive = false;
    };
  }, [user, userId]);

  if (!data) {
    return (
      <div className="profile-preview-page" dir="rtl">
        <main className="profile-preview-layout">
          <section className="matched-profile-state" role={errorMessage ? "alert" : "status"}>
            <h1>{errorMessage ? "הפרופיל אינו זמין" : "טוענים את הפרופיל..."}</h1>
            <p>{errorMessage || "רק רגע, הפרטים נטענים מההתאמה שלכם"}</p>
            {errorMessage && (
              <button type="button" onClick={handleBack}>
                חזרה
              </button>
            )}
          </section>
        </main>
      </div>
    );
  }

  return (
    <ProfilePreviewView
      profile={data.profile}
      backLabel="חזרה"
      onBack={handleBack}
      contextText={`זה הפרופיל המלא של ${data.profile.name}`}
      galleryLabel={`התמונות של ${data.profile.name}`}
      compatibility={data.compatibility.percentage}
      footerAction={
        <button type="button" onClick={handleBack}>
          חזרה
        </button>
      }
    />
  );
}
