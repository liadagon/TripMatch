import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  ProfilePreviewView,
} from "./MyProfilePreview";
import type { ProfilePreviewUser } from "../services/authService";
import {
  getMatchedProfile,
  type MatchedProfileData,
} from "../services/matchService";
import {
  getConversationById,
  type Conversation as DemoConversation,
} from "../data/conversations";
import { demoDiscoverProfiles } from "../data/demoProfiles";

function getDemoProfile(
  conversation: DemoConversation,
): MatchedProfileData {
  const discoverProfile = demoDiscoverProfiles.find(
    (profile) => profile.userId === conversation.id,
  );
  const profile: ProfilePreviewUser = {
    _id: `demo-${conversation.id}`,
    name: conversation.name,
    age: conversation.age,
    location: discoverProfile?.city,
    interests: discoverProfile?.tags || [],
    preferredDestinations: discoverProfile?.destination
      ? [discoverProfile.destination]
      : [],
    tripDates: discoverProfile?.dates,
    photos: conversation.images,
    photoURL: conversation.images[0],
  };

  return {
    profile,
    compatibility: {
      percentage: conversation.match,
      matchedCriteria: 0,
      comparedCriteria: 0,
    },
    conversationId: conversation.id,
  };
}

export default function MatchedProfile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [data, setData] = useState<MatchedProfileData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      setData(null);
      setErrorMessage("");

      const demoConversation = getConversationById(userId);

      if (demoConversation) {
        setData(getDemoProfile(demoConversation));
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
  }, [userId]);

  if (!data) {
    return (
      <div className="profile-preview-page" dir="rtl">
        <main className="profile-preview-layout">
          <section className="matched-profile-state" role={errorMessage ? "alert" : "status"}>
            <h1>{errorMessage ? "הפרופיל אינו זמין" : "טוענים את הפרופיל..."}</h1>
            <p>{errorMessage || "רק רגע, הפרטים נטענים מההתאמה שלכם"}</p>
            {errorMessage && (
              <button type="button" onClick={() => navigate("/matches")}>
                חזרה להתאמות
              </button>
            )}
          </section>
        </main>
      </div>
    );
  }

  const chatTarget = data.conversationId
    ? `/chat/${data.conversationId}`
    : "/matches";

  return (
    <ProfilePreviewView
      profile={data.profile}
      backLabel="חזרה לשיחה"
      onBack={() => navigate(chatTarget)}
      contextText={`זה הפרופיל המלא של ${data.profile.name}`}
      galleryLabel={`התמונות של ${data.profile.name}`}
      compatibility={data.compatibility.percentage}
      footerAction={
        <button type="button" onClick={() => navigate(chatTarget)}>
          חזרה לשיחה
        </button>
      }
    />
  );
}
